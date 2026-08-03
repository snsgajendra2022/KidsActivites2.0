# Advanced Fees — Backend Contract

Related:

- Enrollment / verification fees (existing): `src/services/feeService.js` → `/admin/fees`
- Full API index: [`FULL_BACKEND_API_CONTRACT.md`](./FULL_BACKEND_API_CONTRACT.md) §18 Advanced Fees

Base URL: `{API_BASE_URL}` ending in `/api/v1`  
Auth: Bearer JWT + `X-Tenant-Slug` matching the workspace in the token.

---

## Purpose

School billing beyond enrollment fee verification:

| Capability | Path |
|------------|------|
| Fee heads catalog | CRUD `/admin/fees/heads` |
| Class fee structures | CRUD `/admin/fees/structures` |
| Generate student invoice | `POST /admin/fees/invoices/generate` |
| Due reminders | `POST /admin/fees/reminders/schedule` |
| Refunds | `POST /admin/fees/refunds` |
| Online checkout | `POST /admin/fees/payments/checkout` |
| Payment webhooks | `POST /webhooks/payments/{provider}` |
| Parent fee list | `GET /parent/fees` |

Web UI: `/{tenant}/admin/fees-advanced`  
Frontend page: `src/pages/modules/AdvancedFeesPage.jsx`  
Frontend service: `src/services/advancedFeeService.js`

---

## Rules

- Authenticated roles: school admin / accountant (and any role granted fee write)
- Tenant / workspace scoped — reject JWT ↔ slug mismatch with `403`
- Save **IDs only** on writes: `classId`, `studentId`, `feeStructureId`, `invoiceId`
- Validate `studentId` belongs to `classId`
- Derive head amounts / gross / net from persisted structure — do not trust client gross
- Invoice statuses: `draft` · `issued` · `partial` · `paid` · `void` · `refunded`
- Checkout + refund must be **idempotent** (`idempotencyKey` / provider payment id)
- Verify webhook signatures for Razorpay / Stripe

---

## Fee heads — CRUD `/admin/fees/heads`

### Model

```json
{
  "id": "fh_tuition",
  "key": "tuition",
  "name": "Tuition Fee",
  "amount": 12000,
  "active": true
}
```

| Method | Path |
|--------|------|
| `GET` | `/admin/fees/heads` |
| `POST` | `/admin/fees/heads` |
| `GET` | `/admin/fees/heads/{id}` |
| `PUT` / `PATCH` | `/admin/fees/heads/{id}` |
| `DELETE` | `/admin/fees/heads/{id}` |

List may return `{ items: [] }` or a bare array.

---

## Fee structures — CRUD `/admin/fees/structures`

### Model

```json
{
  "id": "fs_annual",
  "name": "Nursery Annual 2026",
  "classId": "class-uuid",
  "classIds": ["class-uuid"],
  "headIds": ["fh_tuition", "fh_transport"],
  "heads": [
    { "id": "fh_tuition", "key": "tuition", "name": "Tuition Fee", "amount": 12000 }
  ],
  "gross": 15000,
  "active": true
}
```

Either embed `heads[]` or resolve from `headIds`. Frontend normalizes both.

| Method | Path |
|--------|------|
| `GET` | `/admin/fees/structures` · optional `?classId=` |
| `POST` | `/admin/fees/structures` |
| `GET` | `/admin/fees/structures/{id}` |
| `PUT` / `PATCH` | `/admin/fees/structures/{id}` |
| `DELETE` | `/admin/fees/structures/{id}` |

When `?classId=` is passed, return structures linked to that class (plus optional workspace default).

---

## `POST /admin/fees/invoices/generate`

### Request

```json
{
  "classId": "uuid",
  "studentId": "uuid",
  "feeStructureId": "uuid",
  "discount": 500,
  "scholarship": 1000,
  "dueDate": "2026-08-13",
  "gateway": "razorpay",
  "idempotencyKey": "invoice-student-2026-08-13"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `classId` | yes | Existing class |
| `studentId` | yes* | Enrolled in class (single) |
| `studentIds` | yes* | Multi-student invoice batch (preferred when selecting many) |
| `feeStructureId` | recommended | Else resolve default for class |
| `discount` | no | ₹, default 0 |
| `scholarship` | no | ₹, default 0 |
| `dueDate` | no | `YYYY-MM-DD` |
| `gateway` | no | `razorpay` \| `stripe` \| `manual` |
| `idempotencyKey` | recommended | Return existing invoice if replayed |

### Success `200` / `201`

```json
{
  "success": true,
  "data": {
    "id": "inv_123",
    "status": "issued",
    "classId": "uuid",
    "studentId": "uuid",
    "feeStructureId": "uuid",
    "heads": [
      { "id": "fh_tuition", "name": "Tuition Fee", "amount": 12000 }
    ],
    "gross": 17300,
    "discount": 500,
    "scholarship": 1000,
    "net": 15800,
    "dueDate": "2026-08-13",
    "message": "Invoice generated."
  }
}
```

Server formula: `net = max(0, gross - discount - scholarship)` where `gross` comes from structure heads.

### Errors

| Status | Meaning |
|--------|---------|
| `400` | Validation |
| `403` | Forbidden / tenant mismatch |
| `404` | Class, student, or structure missing |
| `409` | Duplicate idempotency key (return existing) |
| `422` | Student not in class |

---

## `POST /admin/fees/reminders/schedule`

```json
{
  "classId": "uuid",
  "studentId": "uuid",
  "invoiceId": "inv_123",
  "daysBeforeDue": 3,
  "dueDate": "2026-08-13"
}
```

At least one of `invoiceId`, `studentId`, or `classId` required.

### Success

```json
{
  "success": true,
  "data": {
    "scheduled": true,
    "daysBeforeDue": 3,
    "message": "Reminders scheduled 3 days before due date."
  }
}
```

Enqueue App / SMS / WhatsApp / email per school communication settings. Do not block on delivery.

---

## `POST /admin/fees/refunds`

```json
{
  "invoiceId": "inv_123",
  "studentId": "uuid",
  "amount": 1000,
  "reason": "Overpayment",
  "gateway": "razorpay",
  "idempotencyKey": "refund-inv_123-1000"
}
```

### Success

```json
{
  "success": true,
  "data": {
    "id": "refund_1",
    "invoiceId": "inv_123",
    "amount": 1000,
    "status": "queued",
    "message": "Refund of ₹1,000 queued."
  }
}
```

Statuses: `queued` · `processing` · `paid` · `failed`. Update invoice toward `refunded` / `partial` as appropriate.

---

## `POST /admin/fees/payments/checkout`

```json
{
  "invoiceId": "inv_123",
  "gateway": "razorpay",
  "amount": 15800,
  "studentId": "uuid",
  "idempotencyKey": "chk-inv_123"
}
```

### Success

```json
{
  "success": true,
  "data": {
    "checkoutId": "chk_abc",
    "invoiceId": "inv_123",
    "gateway": "razorpay",
    "amount": 15800,
    "currency": "INR",
    "status": "created",
    "paymentUrl": "https://…",
    "message": "Checkout session created."
  }
}
```

For `gateway: manual`, return `400` or a no-op with clear message (frontend skips checkout).

---

## `POST /webhooks/payments/{provider}`

`provider` = `razorpay` | `stripe` (etc.).

- Verify signature
- Idempotent on provider payment / event id
- Mark invoice `paid` / `partial`
- Notify parent on success

---

## `GET /parent/fees`

Parent-scoped list of invoices / dues for own children.

Query: `?studentId=` optional.

---

## Frontend wiring (current)

| UI action | Service method | API |
|-----------|----------------|-----|
| Load structure for class | `getFeeStructureForClass` / `listFeeStructures` | `GET /admin/fees/structures` (+ heads) |
| Generate Invoice | `generateFeeInvoice` | `POST /admin/fees/invoices/generate` |
| Schedule Reminders | `scheduleFeeReminders` | `POST /admin/fees/reminders/schedule` |
| Process Refund | `processFeeRefund` | `POST /admin/fees/refunds` |
| Create Checkout | `createFeeCheckout` | `POST /admin/fees/payments/checkout` |

Class / student pickers use role-scoped relationship APIs — never free-typed names.

---

## Relation to enrollment fee verification

| Feature | Path family |
|---------|-------------|
| Application fee verify / reject | `/admin/fees`, `/fees/*` (`feeService.js`) |
| Recurring / advanced billing | `/admin/fees/heads|structures|invoices|…` (this doc) |

Keep both; Advanced Fees does not replace enrollment fee verification at `/admin/fees`.
