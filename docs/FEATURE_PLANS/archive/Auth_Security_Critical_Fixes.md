# Auth & Security Status

> **ARCHIVED:** 2025-12-30 - Security hardening completed. Kept as reference documentation.

**Last audited:** 2025-10-28
**Scope:** Employee + customer authentication flows, credential storage, and transport safeguards.

## ✅ Completed Hardening
- ✅ Runtime JWT secrets enforced; backend crashes if `JWT_SECRET` or `JWT_REFRESH_SECRET` is missing (`back/src/utils/auth.ts`).
- ✅ Password hashing standardized via bcrypt with configurable `BCRYPT_ROUNDS` (`back/src/utils/auth.ts`).
- ✅ Employee login protects against enumeration, checks active flag, and records last login (`back/src/routes/auth.ts`).
- ✅ Five-strike lockout with 30-minute cooldown resets after successful login (`back/src/routes/auth.ts`).
- ✅ Password strength validation applied during admin bootstrap, password change, and customer sign-up (`back/src/routes/auth.ts`, `back/src/routes/customersAuth.ts`).
- ✅ Refresh tokens validated against existing, active employees before issuing new access tokens (`back/src/routes/auth.ts:198-228`).
- ✅ Customer auth mirrors safeguards: enumeration guard, bcrypt verification, session token refresh, and profile updates (`back/src/routes/customersAuth.ts`).
- ✅ All new payment credentials encrypted with `CONFIG_ENCRYPTION_KEY`; API responses mask stored secrets (`back/src/services/paymentSettingsService.ts`, `back/src/routes/settings/payments.ts`).

## 🛠️ Active / Upcoming Improvements
- 🔄 Refresh token rotation & revocation list (current flow reuses static refresh tokens).
- ⚙️ Rate limiting for `/api/auth/*` and `/api/customers/login` to complement lockout.
- 📬 Customer password reset flow (email/SMS verification pipeline not yet implemented).
- 🧾 Audit trails for password and role changes (log structure TBD).
- 🔐 Bring customer portal under httpOnly cookies once frontend session handling is ready.

## 🔐 Operational Notes
- Set the following environment variables in every environment:
  - `JWT_SECRET`, `JWT_REFRESH_SECRET` – 64+ byte random hex (see comment in `back/src/utils/auth.ts`).
  - `CONFIG_ENCRYPTION_KEY` – 32-byte base64/hex secret for encrypting payment credentials.
  - `BCRYPT_ROUNDS` – Optional override; defaults to `12` if unset.
- Backend rejects startup without JWT secrets; payment settings mutation rejects missing encryption key.
- Lockout counters are stored on the `Employee` model (`prisma/schema.prisma:599-618`); unlock manually via database if necessary.
- Customer tokens last 30 days; employee access tokens expire after 24h, refresh tokens after 7d.

## 🔄 Manual Test Checklist
- Attempt employee login with bad email vs bad password; both return identical `401`.
- Trigger lockout with 5 bad passwords and confirm `403` response + `accountLockedUntil` update.
- Remove JWT env vars and verify server fails fast on boot.
- Change password with weak candidate (e.g. `flower1`) and confirm validation error payload.
- Save payment provider credentials and verify masked response + decryption round-trip.
