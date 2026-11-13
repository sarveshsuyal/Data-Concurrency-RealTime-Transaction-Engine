# DataCore — Security Architecture & Threat Model

---

## 1. Security Architecture Overview

DataCore implements defense-in-depth principles across authentication, authorization, cryptographic integrity, and data isolation.

```text
                           INCOMING REQUEST
                                  │
                                  ▼
                     [ 1. TLS 1.3 Termination ]
                                  │
                                  ▼
                   [ 2. CORS & Security Headers ]
                                  │
                                  ▼
               [ 3. JWT Bearer Token / API Key Auth ]
                                  │
                                  ▼
                 [ 4. RBAC Permission Enforcement ]
                 (ADMIN / OPERATOR / CUSTOMER Scopes)
                                  │
                                  ▼
               [ 5. SHA-256 Idempotency Verification ]
                                  │
                                  ▼
             [ 6. Canonical Database Lock Acquisition ]
                                  │
                                  ▼
                [ 7. Double-Entry Ledger Commitment ]
                                  │
                                  ▼
                  [ 8. Immutable Audit Trail Log ]
```

---

## 2. Threat Model Analysis (STRIDE)

| Threat Category | Potential Attack Vector | DataCore Mitigation Mechanism | Residual Risk / Operational Control |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forged user identities or token hijacking | Short-lived JWTs (60 mins), refresh token rotation with blacklisting, client IP and user-agent binding in audit logs. | Client device compromise requires manual session revocation. |
| **Tampering** | Modifying transfer amounts in flight | Mandatory HTTPS/TLS; idempotency payload hash verification rejects modified requests sharing the same key. | Mitigated at transport and database levels. |
| **Repudiation** | Denying an executed transfer | Immutable double-entry ledger entries linked directly to the authenticated user ID and transaction ID. | Ledger records are permanent and never deleted. |
| **Information Disclosure** | Cross-tenant data leakage | Foreign key workspace scoping enforced at Django queryset layer (`filter(workspace=request.workspace)`). | Global ADMIN role restricted to platform operators. |
| **Denial of Service** | Concurrent request exhaustion & lock storms | Canonical lock ordering prevents cyclic deadlocks; DB connection pooling; rate limiting headers. | Extreme load mitigated by cloud infrastructure rate limits. |
| **Elevation of Privilege** | Normal user requesting admin privileges | Explicit role validation (`IsAdminUserRole`); public registration hardcoded to `role = USER`; role escalation rejected in serializers. | Superuser creation strictly restricted to CLI `createsuperuser`. |

---

## 3. Webhook Security & Signature Verification

All outgoing webhook payloads contain an `X-DataCore-Signature` header calculated using HMAC-SHA256:

$$\text{Signature} = \text{HMAC-SHA256}(\text{Secret}, \text{Payload})$$

Receiving services verify authenticity before processing the webhook notification.
