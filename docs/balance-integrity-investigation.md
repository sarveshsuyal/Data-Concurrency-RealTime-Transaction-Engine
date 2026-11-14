# DataCore Balance Integrity Investigation & Resolution Report

**Defect Investigated:** When a customer's account balance reaches ₹0.00, it inadvertently changes or resets back to ₹10,000.00.  
**Severity:** Critical Financial-Integrity Defect  
**Resolution Status:** Resolved & Verified with Regression Testing

---

## 1. Executive Summary & Root Cause Analysis

A thorough trace of all code paths initializing, reading, caching, reconciling, and seeding account balances across the Django REST API, Supabase database configuration, Flutter customer app, and Web simulator identified four contributing root causes:

### Root Cause 1: Truthy/Falsy Evaluation in JavaScript State Restoration
In `mobile-app/preview.html` and historical client session restore code:
```javascript
// DEFECTIVE PATTERN:
balance = currentUser.balance || 10000.00;
```
In JavaScript, `0` is falsy. When an account balance reached `0.00`, the logical OR operator evaluated `0` as `false` and substituted the fallback value of `10000.00`.
Furthermore, test balance auto-provisioning logic was found:
```javascript
if (amt > balance) {
  balance += (amt + 2000.00);
  renderBalance();
  showToast('Test balance provisioned');
}
```
This automatically granted test funds when balances were exhausted.

### Root Cause 2: Render Free-Tier Build Seeding & Ephemeral Filesystems
In `render.yaml`:
```yaml
buildCommand: "pip install -r backend/requirements.txt && python backend/manage.py collectstatic --no-input && python backend/manage.py migrate && python backend/manage.py setup_datacore"
```
On every build and redeployment, `python backend/manage.py setup_datacore` was executed. In `setup_datacore.py`:
```python
acc, a_created = Account.objects.get_or_create(
    user=user,
    defaults={"balance": cust["balance"], ...}
)
```
When ephemeral containers were restarted (or redeployed), any recreated database instances immediately re-seeded Alice and other demo users with a flat ₹10,000.00 balance.

### Root Cause 3: Account Sorting & Duplicate Account Selection
In `backend/engine/models.py`, `Account.Meta`:
```python
class Meta:
    ordering = ['-created_at']
```
When a user had more than one account (or if an extra account was registered), calling `.first()` on `Account.objects.filter(user=request.user, is_active=True)` returned the newest account (`-created_at`), which had an initial deposit of ₹10,000, instead of the original active account whose balance was spent down to ₹0.00.

### Root Cause 4: One-Sided Opening Balance Ledger Entries
In `backend/authentication/serializers.py`, user registration created an account with `balance = 10000.00` and inserted a single `CREDIT` ledger entry without an offsetting `DEBIT` against a system clearing account. This broke double-entry accounting integrity (`total_debits != total_credits`).

---

## 2. Remediation Implemented

1. **Strict Type-Safe Zero Evaluation:**
   - In all serializers, Dart models, and JavaScript clients, replaced falsy checks with explicit null checks (`value != null`). `0.00` is recognized as an authoritative, valid number.
   - Removed all automatic balance auto-provisioning and test liquidity injections.
2. **Eliminated Startup Seeding from Production:**
   - Updated `render.yaml` `buildCommand` to run only migrations and static collection. `setup_datacore` is removed from deployment pipelines.
   - Updated `setup_datacore.py` so that existing accounts are never overwritten, modified, or re-seeded.
3. **Primary Account Association & Uniqueness:**
   - Enforced primary account integrity per user.
   - Changed default ordering to chronological (`created_at`) so the primary established account remains authoritative.
4. **Balanced Double-Entry Opening Balances:**
   - When a documented welcome test balance is granted during registration, it is debited from a system clearing account (`SYSTEM-CLEARING`) and credited to the user account in a single atomic database transaction.
   - Ledger debit and credit totals remain strictly equal at all times.
5. **Reconciliation Audit Endpoint:**
   - Implemented `GET /api/admin/reconciliation/` to verify that `account.balance == sum(credits) - sum(debits)` for every account in the database.

---

## 3. Regression Test Verification

Automated regression tests in `backend/tests/test_balance_integrity.py` prove:
1. An account with ₹0.00 balance remains ₹0.00 after repeated reads, logins, and service restarts.
2. A transfer attempting to overdraft an account at ₹0.00 is strictly rejected with `InsufficientFundsException`.
3. Account creation is idempotent and does not create duplicate accounts with reset balances.
4. Double-entry ledger invariants are preserved across zero-balance transitions.
