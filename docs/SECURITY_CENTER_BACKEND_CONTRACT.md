# Security Center — Backend Contract

Frontend page: `/{tenant}/admin/security`  
Service: `src/services/securityService.js`  
Related index: [`FULL_BACKEND_API_CONTRACT.md`](./FULL_BACKEND_API_CONTRACT.md) §15

Base URL: `{API_BASE_URL}` ending in `/api/v1`  
Auth: Bearer JWT + `X-Tenant-Slug` matching the workspace in the token.  
Roles: `school_admin`, `super_admin` (and any role granted security write).

---

## Purpose

Admin Security Center needs **real** MFA enrollment and backup policy APIs.  
The UI no longer fakes success when these routes are missing — it shows a clear error until the backend implements this contract.

| Capability | Method | Path |
|------------|--------|------|
| Get MFA status | `GET` | `/admin/security/mfa` |
| Start MFA (send OTP) | `POST` | `/admin/security/mfa/enable` |
| Confirm MFA OTP | `POST` | `/admin/security/mfa/verify` |
| Update / disable MFA | `PATCH` | `/admin/security/mfa` |
| Disable MFA (optional alias) | `POST` | `/admin/security/mfa/disable` |
| Get backup policy | `GET` | `/admin/security/backup-policy` |
| Save backup policy | `PUT` | `/admin/security/backup-policy` |
| Run backup (optional) | `POST` | `/admin/security/backups/run` |
| List backups (optional) | `GET` | `/admin/security/backups` |
| Login history | `GET` | `/admin/security/login-history` |

---

## Rules (must)

1. Tenant-scope every record to the JWT workspace; reject slug mismatch with `403`.
2. Only the authenticated user can enable/disable **their own** MFA (unless platform super-admin with explicit override).
3. MFA method for v1: `otp_sms` (SMS OTP to recovery mobile).
4. `recoveryMobile` must be a **10-digit** Indian mobile after normalizing `+91` / leading `0`.
5. OTP: 6 digits, TTL ≤ 10 minutes, rate-limit send (e.g. 1 / 60s, max 5 / hour).
6. Never return the OTP code in API responses in production.
7. Emit audit events: `security.mfa_enabled`, `security.mfa_disabled`, `security.mfa_verify_failed`.
8. Response envelope (same as rest of platform):

```json
{
  "success": true,
  "data": { }
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "MFA_INVALID_OTP",
    "message": "Invalid OTP. Please try again."
  }
}
```

---

## MFA model

```json
{
  "enabled": false,
  "method": "otp_sms",
  "recoveryMobile": "9876543210",
  "pendingVerification": true,
  "verifiedAt": null,
  "updatedAt": "2026-08-03T08:00:00.000Z"
}
```

| Field | Type | Notes |
|-------|------|--------|
| `enabled` | boolean | `true` only after successful verify |
| `method` | string | `otp_sms` \| `totp` (v1 uses `otp_sms`) |
| `recoveryMobile` | string | 10 digits; may be masked on GET (`******3210`) — if masked, still return `enabled` correctly |
| `pendingVerification` | boolean | `true` after enable until verify/cancel |
| `verifiedAt` | ISO string \| null | set on successful verify |
| `updatedAt` | ISO string \| null | last change |

Status aliases the frontend also accepts: `status: "pending_verification" | "otp_sent" | "enabled" | "disabled"`.

---

## `GET /admin/security/mfa`

Returns current MFA state for the logged-in admin.

**200** → MFA model above.

If never enrolled:

```json
{
  "enabled": false,
  "method": "otp_sms",
  "recoveryMobile": "",
  "pendingVerification": false,
  "verifiedAt": null,
  "updatedAt": null
}
```

---

## `POST /admin/security/mfa/enable`

Start enrollment: validate mobile, store pending MFA, **send SMS OTP**.

### Request

```json
{
  "recoveryMobile": "9876543210",
  "method": "otp_sms"
}
```

### Response `200`

```json
{
  "enabled": false,
  "method": "otp_sms",
  "recoveryMobile": "9876543210",
  "pendingVerification": true,
  "otpSent": true,
  "message": "OTP sent to 9876543210.",
  "verifiedAt": null,
  "updatedAt": "2026-08-03T08:01:00.000Z"
}
```

### Errors

| HTTP | Code | When |
|------|------|------|
| `400` | `VALIDATION_ERROR` | Mobile not 10 digits |
| `429` | `OTP_RATE_LIMITED` | Too many sends |
| `409` | `MFA_ALREADY_ENABLED` | Already enabled |

Frontend then shows the OTP input and **Verify OTP**.

---

## `POST /admin/security/mfa/verify`

Confirm OTP and activate MFA.

### Request

```json
{
  "otp": "483920",
  "recoveryMobile": "9876543210"
}
```

`recoveryMobile` optional if pending enrollment is bound to the user session.

### Response `200`

```json
{
  "enabled": true,
  "method": "otp_sms",
  "recoveryMobile": "9876543210",
  "pendingVerification": false,
  "verifiedAt": "2026-08-03T08:02:00.000Z",
  "updatedAt": "2026-08-03T08:02:00.000Z",
  "message": "Two-factor authentication is now enabled."
}
```

### Errors

| HTTP | Code | When |
|------|------|------|
| `400` | `MFA_INVALID_OTP` | Wrong code |
| `410` | `MFA_OTP_EXPIRED` | OTP expired |
| `404` | `MFA_NOT_PENDING` | No pending enrollment |

---

## `PATCH /admin/security/mfa`

Disable MFA or cancel pending enrollment.

### Disable (when enabled)

```json
{ "enabled": false }
```

Optional (recommended if policy requires):

```json
{ "enabled": false, "otp": "483920" }
```

### Cancel pending enrollment

```json
{ "enabled": false, "cancelPending": true }
```

### Response `200`

```json
{
  "enabled": false,
  "method": "otp_sms",
  "recoveryMobile": "",
  "pendingVerification": false,
  "verifiedAt": null,
  "updatedAt": "2026-08-03T08:05:00.000Z",
  "message": "Two-factor authentication has been disabled."
}
```

### Optional alias

`POST /admin/security/mfa/disable` with the same body — frontend tries this if `PATCH` returns `404/405`.

---

## Login integration (required for 2FA to matter)

After password/OTP login succeeds, if `mfa.enabled === true` for that user:

1. Do **not** issue full session tokens yet (or issue a short-lived `mfaToken`).
2. Respond with:

```json
{
  "success": true,
  "data": {
    "mfaRequired": true,
    "mfaToken": "…",
    "method": "otp_sms",
    "maskedMobile": "******3210"
  }
}
```

3. Client calls `POST /auth/login/mfa/verify` `{ "mfaToken", "otp" }` → full `accessToken` / `refreshToken`.

Without this step, Security Center enrollment stores MFA but login will not enforce it.

---

## Backup policy

### Model

```json
{
  "frequency": "daily",
  "encrypted": true,
  "retentionDays": 30,
  "lastRunAt": null,
  "updatedAt": "2026-08-03T08:00:00.000Z"
}
```

`frequency`: `hourly` \| `daily` \| `weekly`

### `GET /admin/security/backup-policy`

Returns the model (defaults if none saved).

### `PUT /admin/security/backup-policy`

Request:

```json
{
  "frequency": "daily",
  "encrypted": true,
  "retentionDays": 30
}
```

Response: saved model + optional `message`.

Backups must be encrypted at rest; restore requires privileged auth + audit (`security.backup_completed`).

---

## Frontend wiring

| UI action | Service | API |
|-----------|---------|-----|
| Load page | `getMfaSettings` / `getBackupPolicy` | `GET .../mfa`, `GET .../backup-policy` |
| Enable 2FA | `enableMfa` | `POST .../mfa/enable` |
| Verify OTP | `verifyMfa` | `POST .../mfa/verify` |
| Resend OTP | `enableMfa` again | `POST .../mfa/enable` |
| Cancel pending | `cancelMfaEnrollment` | `PATCH .../mfa` `{ cancelPending: true }` |
| Disable 2FA | `disableMfa` | `PATCH .../mfa` `{ enabled: false }` |
| Save backup | `saveBackupPolicy` | `PUT .../backup-policy` |

Mock mode (`VITE_FORCE_MOCK=true` or no `VITE_API_URL`): local store + demo OTP `123456`.  
Live API mode: **no silent fallback** — missing routes surface an explicit error pointing at this document.

---

## Backend checklist

- [ ] `GET /admin/security/mfa`
- [ ] `POST /admin/security/mfa/enable` (send real SMS OTP)
- [ ] `POST /admin/security/mfa/verify`
- [ ] `PATCH /admin/security/mfa` (disable + cancel pending)
- [ ] `GET` + `PUT /admin/security/backup-policy`
- [ ] Login gate when MFA enabled (`mfaRequired` + verify)
- [ ] Rate limits + audit events
- [ ] Tenant isolation tests

Once these endpoints return the shapes above, `/sns/admin/security` Enable → OTP → Verify works end-to-end without further frontend changes.
