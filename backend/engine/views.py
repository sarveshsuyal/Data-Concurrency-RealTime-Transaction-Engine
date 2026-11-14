import json
import time
import csv
from decimal import Decimal
from datetime import timedelta
from django.db import models
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from django.http import HttpResponse, StreamingHttpResponse
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.tokens import AccessToken

from .models import (
    Account,
    Transaction,
    LedgerEntry,
    IdempotencyKey,
    TransactionEvent,
    ConcurrencyExperiment,
    AuditLog,
    AccountAdjustment
)
from .serializers import (
    AccountSerializer,
    TransactionSerializer,
    TransferRequestSerializer,
    LedgerEntrySerializer,
    TransactionEventSerializer,
    ConcurrencyExperimentSerializer,
    RunExperimentRequestSerializer,
    AuditLogSerializer,
    IdempotencyKeySerializer,
    AdjustmentRequestSerializer,
    AccountAdjustmentSerializer
)
from .permissions import IsAdminUserRole, IsAccountOwner
from .services import (
    TransferService,
    RaceExperimentService,
    AdjustmentService,
    IdempotencyException
)
from authentication.models import User

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# =========================================================================
# Customer Endpoints
# =========================================================================

class AccountListView(generics.ListAPIView):
    """List authenticated user's active ledger accounts."""
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user, is_active=True)


class AccountDetailView(generics.RetrieveAPIView):
    """Retrieve details of a specific account."""
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == User.Role.ADMIN or self.request.user.is_staff:
            return Account.objects.all()
        return Account.objects.filter(user=self.request.user)


class TransactionView(APIView):
    """
    POST: Execute a fund transfer with concurrency and idempotency guarantees.
    GET: List authenticated user's recent transactions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        user_accounts = Account.objects.filter(user=user).values_list('id', flat=True)
        txs = Transaction.objects.filter(
            Q(sender_account__in=user_accounts) | Q(receiver_account__in=user_accounts)
        ).select_related('sender_account', 'receiver_account', 'sender_account__user', 'receiver_account__user')[:20]
        serializer = TransactionSerializer(txs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TransferRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        # Resolve sender account (default to user's primary active account if not specified)
        sender_id = validated_data.get('sender_account_id')
        if not sender_id:
            primary_account = Account.objects.filter(user=request.user, is_active=True).first()
            if not primary_account:
                return Response({"detail": "User has no active account to transfer from."}, status=status.HTTP_400_BAD_REQUEST)
            sender_id = primary_account.id

        receiver_account_id = validated_data['receiver_identifier']
        amount = validated_data['amount']
        description = validated_data.get('description', '')
        strategy = validated_data.get('concurrency_strategy', Transaction.ConcurrencyStrategy.PESSIMISTIC)

        # Idempotency key from header or body
        idempotency_key = (
            request.headers.get('Idempotency-Key') or
            request.headers.get('X-Idempotency-Key') or
            request.data.get('idempotency_key')
        )

        try:
            tx_data, is_cached = TransferService.execute_transfer(
                user=request.user,
                sender_account_id=sender_id,
                receiver_account_id=receiver_account_id,
                amount=amount,
                description=description,
                idempotency_key_value=idempotency_key,
                strategy=strategy,
                request_path=request.path
            )
            resp_status = status.HTTP_200_OK if is_cached else status.HTTP_201_CREATED
            return Response(tx_data, status=resp_status)

        except IdempotencyException as ie:
            return Response({"detail": ie.message}, status=ie.status_code)
        except PermissionError as pe:
            return Response({"detail": str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as ex:
            return Response({"detail": str(ex)}, status=status.HTTP_400_BAD_REQUEST)


class TransactionDetailView(generics.RetrieveAPIView):
    """Retrieve full transaction details including ledger entries."""
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN or user.is_staff:
            return Transaction.objects.all().select_related(
                'sender_account', 'receiver_account', 'sender_account__user', 'receiver_account__user'
            ).prefetch_related('ledger_entries')

        user_accounts = Account.objects.filter(user=user).values_list('id', flat=True)
        return Transaction.objects.filter(
            Q(sender_account__in=user_accounts) | Q(receiver_account__in=user_accounts)
        ).select_related(
            'sender_account', 'receiver_account', 'sender_account__user', 'receiver_account__user'
        ).prefetch_related('ledger_entries')


class TransactionHistoryView(generics.ListAPIView):
    """Paginated transaction history for the authenticated customer."""
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        user = self.request.user
        user_accounts = Account.objects.filter(user=user).values_list('id', flat=True)
        return Transaction.objects.filter(
            Q(sender_account__in=user_accounts) | Q(receiver_account__in=user_accounts)
        ).select_related(
            'sender_account', 'receiver_account', 'sender_account__user', 'receiver_account__user'
        ).order_by('-created_at')


class CustomerEventsView(APIView):
    """Returns lifecycle events for transactions and adjustments involving the authenticated customer."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_accounts = list(Account.objects.filter(user=request.user).values_list('id', flat=True))
        user_account_strs = [str(a) for a in user_accounts]

        qs = TransactionEvent.objects.filter(
            Q(transaction__sender_account__in=user_accounts) |
            Q(transaction__receiver_account__in=user_accounts) |
            Q(details__user_id=str(request.user.id)) |
            Q(details__account_id__in=user_account_strs)
        ).order_by('-created_at')

        since = request.query_params.get('since')
        if since:
            try:
                qs = qs.filter(created_at__gt=since)
            except Exception:
                pass

        after_id = request.query_params.get('after_id')
        if after_id:
            try:
                target_ev = TransactionEvent.objects.get(id=after_id)
                qs = qs.filter(created_at__gt=target_ev.created_at)
            except Exception:
                pass

        events = qs[:50]
        return Response(TransactionEventSerializer(events, many=True).data)


class EventStreamView(APIView):
    """Server-Sent Events (SSE) streaming live transactions, balance changes, and concurrency events."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            token_str = request.query_params.get('token')
            if token_str:
                try:
                    validated = AccessToken(token_str)
                    user = User.objects.get(id=validated['user_id'])
                except Exception:
                    return Response({"detail": "Invalid authentication token for event stream."}, status=status.HTTP_401_UNAUTHORIZED)
            else:
                return Response({"detail": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)

        is_admin = getattr(user, 'is_admin', False) or user.is_staff or getattr(user, 'role', '') == 'ADMIN'
        user_accounts = list(Account.objects.filter(user=user).values_list('id', flat=True))
        user_account_strs = [str(a) for a in user_accounts]

        def event_stream():
            last_check = timezone.now() - timedelta(seconds=5)
            # Initial SSE handshake
            yield f"event: ping\ndata: {json.dumps({'type': 'CONNECTED', 'timestamp': timezone.now().isoformat()})}\n\n"

            for _ in range(30):  # Stream for up to ~60s per connection
                time.sleep(2)
                now = timezone.now()
                qs = TransactionEvent.objects.filter(created_at__gt=last_check).order_by('created_at')

                if not is_admin:
                    qs = qs.filter(
                        Q(transaction__sender_account__in=user_accounts) |
                        Q(transaction__receiver_account__in=user_accounts) |
                        Q(details__user_id=str(user.id)) |
                        Q(details__account_id__in=user_account_strs)
                    )

                new_events = list(qs)
                for ev in new_events:
                    payload = {
                        'id': str(ev.id),
                        'event_type': ev.event_type,
                        'details': ev.details,
                        'created_at': ev.created_at.isoformat()
                    }
                    yield f"id: {ev.id}\nevent: {ev.event_type}\ndata: {json.dumps(payload)}\n\n"

                last_check = now
                # Periodic keepalive heartbeat
                yield f"event: ping\ndata: {json.dumps({'timestamp': now.isoformat()})}\n\n"

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


# =========================================================================
# Administrator Endpoints
# =========================================================================

class AdminOverviewView(APIView):
    """Platform-wide operational, concurrency and financial consistency overview."""
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        now = timezone.now()
        active_threshold = now - timedelta(minutes=5)
        last_hour = now - timedelta(hours=1)

        total_users = User.objects.count()
        active_users = User.objects.filter(last_heartbeat__gte=active_threshold).count()

        tx_stats = Transaction.objects.aggregate(
            total_count=Count('id'),
            completed_count=Count('id', filter=Q(status=Transaction.Status.COMPLETED)),
            failed_count=Count('id', filter=Q(status=Transaction.Status.FAILED)),
            avg_latency=Avg('latency_ms')
        )

        duplicates_rejected = IdempotencyKey.objects.filter(
            status=IdempotencyKey.Status.COMPLETED
        ).count()

        throughput_last_hour = Transaction.objects.filter(created_at__gte=last_hour).count()

        # Double-entry ledger audit invariant check:
        # Sum of debits across all accounts must equal sum of credits across all accounts
        total_debits = LedgerEntry.objects.filter(
            entry_type=LedgerEntry.EntryType.DEBIT
        ).aggregate(sum=Sum('amount'))['sum'] or Decimal('0.00')

        total_credits = LedgerEntry.objects.filter(
            entry_type=LedgerEntry.EntryType.CREDIT
        ).aggregate(sum=Sum('amount'))['sum'] or Decimal('0.00')

        # Total test money currently in all accounts
        total_balance = Account.objects.aggregate(sum=Sum('balance'))['sum'] or Decimal('0.00')

        ledger_balanced = abs(total_debits - (total_credits - total_balance)) < Decimal('0.01') or (total_debits == total_credits)

        return Response({
            "metrics": {
                "total_users": total_users,
                "active_users": active_users,
                "total_transactions": tx_stats['total_count'] or 0,
                "completed_transactions": tx_stats['completed_count'] or 0,
                "failed_transactions": tx_stats['failed_count'] or 0,
                "duplicate_requests_handled": duplicates_rejected,
                "throughput_last_hour": throughput_last_hour,
                "average_latency_ms": round(tx_stats['avg_latency'] or 0.0, 2),
            },
            "financial_consistency": {
                "total_system_balance": str(total_balance),
                "total_ledger_debits": str(total_debits),
                "total_ledger_credits": str(total_credits),
                "ledger_invariants_balanced": ledger_balanced
            }
        })


class AdminUsersListView(generics.ListAPIView):
    """
    Searchable, filterable, and paginated administrator user directory.
    Supports full-text search by name, email, user ID, and account number.
    Filters by role, active status, and balance range.
    Supports permission-checked CSV export via ?format=csv.
    """
    permission_classes = [IsAdminUserRole]
    pagination_class = StandardPagination

    def get(self, request):
        qs = User.objects.all().prefetch_related('accounts').order_by('-date_joined')

        # 1. Search Query
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(id__icontains=search) |
                Q(accounts__account_number__icontains=search)
            ).distinct()

        # 2. Role Filter
        role = request.query_params.get('role', '').strip().upper()
        if role in ('USER', 'ADMIN'):
            qs = qs.filter(role=role)

        # 3. Status Filter
        status_param = request.query_params.get('is_active')
        if status_param is not None and status_param != '':
            if status_param.lower() in ('true', '1'):
                qs = qs.filter(is_active=True)
            elif status_param.lower() in ('false', '0'):
                qs = qs.filter(is_active=False)

        # 4. Balance Filters
        min_balance = request.query_params.get('min_balance')
        if min_balance:
            try:
                min_val = Decimal(min_balance)
                qs = qs.filter(accounts__balance__gte=min_val).distinct()
            except Exception:
                pass

        max_balance = request.query_params.get('max_balance')
        if max_balance:
            try:
                max_val = Decimal(max_balance)
                qs = qs.filter(accounts__balance__lte=max_val).distinct()
            except Exception:
                pass

        # CSV Export Option
        if request.query_params.get('format') == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="datacore_users_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            writer = csv.writer(response)
            writer.writerow(['User ID', 'Full Name', 'Email', 'Role', 'Status', 'Date Joined', 'Accounts', 'Balances'])
            for u in qs:
                acc_info = "; ".join([f"{a.account_number} ({a.currency} {a.balance})" for a in u.accounts.all()])
                writer.writerow([str(u.id), u.full_name, u.email, u.role, 'Active' if u.is_active else 'Suspended', u.date_joined.isoformat(), acc_info])
            return response

        # Paginate results
        page = self.paginate_queryset(qs)
        data = []
        target_list = page if page is not None else qs
        for u in target_list:
            accounts_data = [
                {
                    "id": str(acc.id),
                    "account_number": acc.account_number,
                    "balance": str(acc.balance),
                    "currency": acc.currency,
                    "is_active": acc.is_active
                }
                for acc in u.accounts.all()
            ]
            tx_count = Transaction.objects.filter(
                Q(sender_account__user=u) | Q(receiver_account__user=u)
            ).count()
            data.append({
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
                "date_joined": u.date_joined.isoformat(),
                "last_heartbeat": u.last_heartbeat.isoformat() if u.last_heartbeat else None,
                "accounts": accounts_data,
                "total_transactions": tx_count
            })

        if page is not None:
            return self.get_paginated_response(data)
        return Response(data)


class AdminUserDetailView(APIView):
    """
    Detailed authorized user view including linked accounts, balances,
    transaction history, adjustment records, and security audit log.
    """
    permission_classes = [IsAdminUserRole]

    def get(self, request, user_id):
        try:
            target_user = User.objects.prefetch_related('accounts').get(id=user_id)
        except (User.DoesNotExist, ValueError):
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        accounts_data = [
            {
                "id": str(acc.id),
                "account_number": acc.account_number,
                "balance": str(acc.balance),
                "currency": acc.currency,
                "version": acc.version,
                "is_active": acc.is_active,
                "created_at": acc.created_at.isoformat()
            }
            for acc in target_user.accounts.all()
        ]

        user_account_ids = target_user.accounts.values_list('id', flat=True)
        recent_txs = Transaction.objects.filter(
            Q(sender_account__in=user_account_ids) | Q(receiver_account__in=user_account_ids)
        ).select_related('sender_account', 'receiver_account').order_by('-created_at')[:20]

        tx_list = []
        for tx in recent_txs:
            is_sender = tx.sender_account and tx.sender_account.id in user_account_ids
            tx_list.append({
                "id": str(tx.id),
                "sender_account_number": tx.sender_account.account_number if tx.sender_account else 'SYSTEM',
                "receiver_account_number": tx.receiver_account.account_number,
                "amount": str(tx.amount),
                "currency": tx.currency,
                "status": tx.status,
                "direction": "OUTBOUND" if is_sender else "INBOUND",
                "concurrency_strategy": tx.concurrency_strategy,
                "description": tx.description,
                "created_at": tx.created_at.isoformat()
            })

        adjustments = AccountAdjustment.objects.filter(
            account__user=target_user
        ).select_related('account', 'actor').order_by('-created_at')[:20]

        adj_list = [
            {
                "id": str(a.id),
                "account_number": a.account.account_number,
                "operation": a.operation,
                "amount": str(a.amount),
                "currency": a.currency,
                "previous_balance": str(a.previous_balance),
                "resulting_balance": str(a.resulting_balance),
                "reason_code": a.reason_code,
                "admin_note": a.admin_note,
                "actor_email": a.actor.email if a.actor else "System",
                "created_at": a.created_at.isoformat()
            }
            for a in adjustments
        ]

        recent_audits = AuditLog.objects.filter(user=target_user).order_by('-timestamp')[:20]
        audit_list = [
            {
                "id": str(al.id),
                "action": al.action,
                "ip_address": al.ip_address,
                "details": al.details,
                "timestamp": al.timestamp.isoformat()
            }
            for al in recent_audits
        ]

        return Response({
            "id": str(target_user.id),
            "email": target_user.email,
            "full_name": target_user.full_name,
            "role": target_user.role,
            "is_active": target_user.is_active,
            "date_joined": target_user.date_joined.isoformat(),
            "last_heartbeat": target_user.last_heartbeat.isoformat() if target_user.last_heartbeat else None,
            "accounts": accounts_data,
            "transactions": tx_list,
            "adjustments": adj_list,
            "audit_logs": audit_list
        })


class AdminUserSuspendView(APIView):
    """Safely suspend user account and revoke transactions without deleting ledger."""
    permission_classes = [IsAdminUserRole]

    def post(self, request, user_id):
        reason = request.data.get('reason', 'Administrative suspension').strip()
        try:
            target_user = User.objects.get(id=user_id)
        except (User.DoesNotExist, ValueError):
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if target_user.id == request.user.id:
            return Response({"detail": "Administrators cannot suspend their own account."}, status=status.HTTP_400_BAD_REQUEST)

        target_user.is_active = False
        target_user.save(update_fields=['is_active'])

        AuditLog.objects.create(
            user=request.user,
            action="USER_SUSPENDED",
            details={
                "target_user_id": str(target_user.id),
                "target_email": target_user.email,
                "reason": reason
            }
        )

        return Response({
            "message": f"User {target_user.email} suspended successfully.",
            "user_id": str(target_user.id),
            "is_active": False
        })


class AdminUserReactivateView(APIView):
    """Reactivate a suspended user account."""
    permission_classes = [IsAdminUserRole]

    def post(self, request, user_id):
        reason = request.data.get('reason', 'Administrative reactivation').strip()
        try:
            target_user = User.objects.get(id=user_id)
        except (User.DoesNotExist, ValueError):
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        target_user.is_active = True
        target_user.save(update_fields=['is_active'])

        AuditLog.objects.create(
            user=request.user,
            action="USER_REACTIVATED",
            details={
                "target_user_id": str(target_user.id),
                "target_email": target_user.email,
                "reason": reason
            }
        )

        return Response({
            "message": f"User {target_user.email} reactivated successfully.",
            "user_id": str(target_user.id),
            "is_active": True
        })


class AdminUserDeactivateView(APIView):
    """
    Compliant safe deactivation (soft delete). Never cascades to financial transactions,
    ledger entries, or audit records. Preserves immutable history.
    """
    permission_classes = [IsAdminUserRole]

    def post(self, request, user_id):
        reason = request.data.get('reason', '').strip()
        confirm = request.data.get('confirm') is True
        if not confirm:
            return Response({"detail": "Explicit confirmation required for account deactivation."}, status=status.HTTP_400_BAD_REQUEST)
        if not reason:
            return Response({"detail": "A documented reason is required for account deactivation."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
        except (User.DoesNotExist, ValueError):
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        target_user.is_active = False
        target_user.save(update_fields=['is_active'])

        # Deactivate owned accounts to prevent transaction routing
        Account.objects.filter(user=target_user).update(is_active=False)

        AuditLog.objects.create(
            user=request.user,
            action="USER_SOFT_DELETED",
            details={
                "target_user_id": str(target_user.id),
                "target_email": target_user.email,
                "reason": reason,
                "financial_records_retained": True
            }
        )

        return Response({
            "message": f"User {target_user.email} safely deactivated. Financial ledger and transaction history permanently preserved.",
            "user_id": str(target_user.id),
            "is_active": False
        })


class AdminAccountAdjustmentView(APIView):
    """
    Authoritative manual credit or debit balance adjustment.
    Enforces canonical row locks, positive decimals, double-entry ledger balance conservation,
    and idempotent re-submissions.
    """
    permission_classes = [IsAdminUserRole]

    def post(self, request, account_id):
        serializer = AdjustmentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        idempotency_key = (
            request.headers.get('Idempotency-Key') or
            request.headers.get('X-Idempotency-Key') or
            request.data.get('idempotency_key')
        )

        try:
            receipt, is_cached = AdjustmentService.execute_adjustment(
                admin_user=request.user,
                account_id=account_id,
                operation=data['operation'],
                amount=data['amount'],
                currency=data.get('currency', 'INR'),
                reason_code=data['reason_code'],
                admin_note=data['admin_note'],
                idempotency_key_value=idempotency_key,
                request_path=request.path
            )
            resp_status = status.HTTP_200_OK if is_cached else status.HTTP_201_CREATED
            return Response(receipt, status=resp_status)
        except IdempotencyException as ie:
            return Response({"detail": ie.message}, status=ie.status_code)
        except (ValueError, PermissionError) as ve:
            return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminReconciliationView(APIView):
    """
    Read-only double-entry balance reconciliation tool.
    Compares stored account balance with sum(credits) - sum(debits) for each account.
    """
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        accounts = Account.objects.all().select_related('user')
        discrepancies = []
        total_accounts = 0
        in_balance = 0

        total_system_debits = LedgerEntry.objects.filter(
            entry_type=LedgerEntry.EntryType.DEBIT
        ).aggregate(sum=Sum('amount'))['sum'] or Decimal('0.00')

        total_system_credits = LedgerEntry.objects.filter(
            entry_type=LedgerEntry.EntryType.CREDIT
        ).aggregate(sum=Sum('amount'))['sum'] or Decimal('0.00')

        for acc in accounts:
            total_accounts += 1
            credits = LedgerEntry.objects.filter(
                account=acc,
                entry_type=LedgerEntry.EntryType.CREDIT
            ).aggregate(sum=Sum('amount'))['sum'] or Decimal('0.00')

            debits = LedgerEntry.objects.filter(
                account=acc,
                entry_type=LedgerEntry.EntryType.DEBIT
            ).aggregate(sum=Sum('amount'))['sum'] or Decimal('0.00')

            derived_balance = credits - debits
            diff = acc.balance - derived_balance

            if abs(diff) > Decimal('0.001'):
                discrepancies.append({
                    "account_id": str(acc.id),
                    "account_number": acc.account_number,
                    "user_email": acc.user.email,
                    "stored_balance": str(acc.balance),
                    "derived_balance": str(derived_balance),
                    "discrepancy": str(diff)
                })
            else:
                in_balance += 1

        is_system_balanced = (
            abs(total_system_debits - total_system_credits) < Decimal('0.01') and
            len(discrepancies) == 0
        )

        return Response({
            "total_accounts_checked": total_accounts,
            "accounts_in_balance": in_balance,
            "discrepancies_count": len(discrepancies),
            "total_system_debits": str(total_system_debits),
            "total_system_credits": str(total_system_credits),
            "is_system_balanced": is_system_balanced,
            "discrepancies": discrepancies
        })


class AdminTransactionsListView(generics.ListAPIView):
    """Platform-wide live transaction monitor."""
    permission_classes = [IsAdminUserRole]
    serializer_class = TransactionSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = Transaction.objects.all().select_related(
            'sender_account', 'receiver_account', 'sender_account__user', 'receiver_account__user'
        ).order_by('-created_at')

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param.upper())
        strategy_param = self.request.query_params.get('strategy')
        if strategy_param:
            qs = qs.filter(concurrency_strategy=strategy_param.upper())

        return qs


class AdminMetricsView(APIView):
    """Detailed analytics on concurrency performance, strategy distribution, and latency."""
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        strategy_counts = Transaction.objects.values('concurrency_strategy').annotate(
            count=Count('id'),
            avg_latency=Avg('latency_ms')
        )
        status_counts = Transaction.objects.values('status').annotate(count=Count('id'))

        return Response({
            "by_strategy": list(strategy_counts),
            "by_status": list(status_counts),
        })


class AdminConcurrencyMonitorView(APIView):
    """Live monitor of concurrency events, lock acquisitions, and race detections."""
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        events = TransactionEvent.objects.all().order_by('-created_at')[:100]
        return Response(TransactionEventSerializer(events, many=True).data)


class AdminExperimentsView(APIView):
    """
    Race-Condition Laboratory:
    GET: List past controlled experiments.
    POST: Run a new experiment with specified concurrency strategy.
    """
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        experiments = ConcurrencyExperiment.objects.all().order_by('-created_at')[:20]
        return Response(ConcurrencyExperimentSerializer(experiments, many=True).data)

    def post(self, request):
        serializer = RunExperimentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        strategy = serializer.validated_data['strategy']
        initial_balance = serializer.validated_data['initial_balance']
        withdrawals = serializer.validated_data['withdrawals']

        experiment = RaceExperimentService.run_experiment(
            admin_user=request.user,
            strategy=strategy,
            initial_balance=initial_balance,
            withdrawals=withdrawals
        )

        return Response(ConcurrencyExperimentSerializer(experiment).data, status=status.HTTP_201_CREATED)


class AdminAuditLogsView(generics.ListAPIView):
    """Filterable system-wide audit logs."""
    permission_classes = [IsAdminUserRole]
    serializer_class = AuditLogSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = AuditLog.objects.all().select_related('user').order_by('-timestamp')
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        return qs


class AdminDuplicateDetectionView(generics.ListAPIView):
    """Monitor duplicate request detection and idempotency keys."""
    permission_classes = [IsAdminUserRole]
    serializer_class = IdempotencyKeySerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return IdempotencyKey.objects.all().select_related('user').order_by('-created_at')
