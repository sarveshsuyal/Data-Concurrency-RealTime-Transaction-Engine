from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User

class UserProfileSerializer(serializers.ModelSerializer):
    upi_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'role', 'upi_id', 'date_joined', 'last_heartbeat')
        read_only_fields = ('id', 'email', 'role', 'upi_id', 'date_joined', 'last_heartbeat')

    def get_upi_id(self, obj):
        account = obj.accounts.filter(is_active=True).first()
        return account.upi_id if account else None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'password', 'confirm_password')
        extra_kwargs = {
            'full_name': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')

        with transaction.atomic():
            # Never allow role escalation during public registration
            user = User.objects.create_user(
                email=validated_data['email'],
                full_name=validated_data['full_name'],
                password=password,
                role=User.Role.USER
            )

            # Lazy import to prevent circular dependency
            import re
            from engine.models import Account, LedgerEntry
            from django.conf import settings
            from decimal import Decimal

            # Create default primary account for the new user
            initial_balance = Decimal(getattr(settings, 'DEFAULT_INITIAL_BALANCE', '10000.00'))
            currency = getattr(settings, 'DEFAULT_CURRENCY', 'INR')

            # Generate unique and properly formatted UPI ID: name@dc (e.g. alex@dc)
            name_part = validated_data.get('full_name', '').strip()
            first_name = name_part.split()[0] if name_part else ''
            base_slug = re.sub(r'[^a-z0-9]', '', first_name.lower())
            if not base_slug:
                email_prefix = validated_data['email'].split('@')[0]
                base_slug = re.sub(r'[^a-z0-9]', '', email_prefix.lower())
            if not base_slug:
                base_slug = 'user'

            candidate_upi = f"{base_slug}@dc"
            counter = 1
            while Account.objects.filter(upi_id__iexact=candidate_upi).exists():
                candidate_upi = f"{base_slug}{counter}@dc"
                counter += 1

            account = Account.objects.create(
                user=user,
                balance=initial_balance,
                currency=currency,
                version=0,
                upi_id=candidate_upi
            )

            # Record initial deposit in ledger if initial_balance > 0
            if initial_balance > Decimal('0.00'):
                LedgerEntry.objects.create(
                    transaction=None,
                    account=account,
                    entry_type=LedgerEntry.EntryType.CREDIT,
                    amount=initial_balance,
                    balance_after=initial_balance,
                    description="Initial test deposit upon registration"
                )

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError({"detail": "Invalid email or password credentials."})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "User account is disabled."})

        # Update heartbeat on login
        user.touch_heartbeat()

        refresh = RefreshToken.for_user(user)
        # Custom claims
        refresh['email'] = user.email
        refresh['role'] = user.role
        refresh['full_name'] = user.full_name

        return {
            'user': UserProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
