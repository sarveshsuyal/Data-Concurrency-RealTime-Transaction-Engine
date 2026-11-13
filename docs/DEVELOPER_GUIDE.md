# DataCore — Developer Platform & Integration Guide

---

## 1. Quick Integration

Integrate programmatic fund transfers into external applications using DataCore REST APIs or API Keys.

### 1.1 Authentication

DataCore supports two authentication schemes:
1. **JWT Bearer Token:** Used for frontend sessions and mobile clients (`Authorization: Bearer <access_token>`).
2. **API Key:** Used for service-to-service automation (`X-API-Key: dc_live_...`).

### 1.2 Executing a Transfer

```bash
curl -X POST https://datacore.onrender.com/api/transactions/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Idempotency-Key: e6b7a2d4-11ef-4f12-9bf1-d57186f8a841" \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_identifier": "DC-7489-1024",
    "amount": "250.00",
    "description": "API Integration Transfer",
    "concurrency_strategy": "PESSIMISTIC"
  }'
```

---

## 2. Webhook Event Consumption

Subscribe to real-time events (`transaction.completed`, `transaction.failed`, `anomaly.detected`).

```python
# Verifying Webhook Signature in Python
import hmac
import hashlib

def verify_datacore_signature(payload_bytes, signature_header, secret):
    expected = hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```
