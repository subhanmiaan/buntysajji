# Verification report

## Slow connections and order protection (October 10, 2026)

- Seven Node/database/HTTP tests passed, covering signed checkout sessions, phone normalization, trusted network handling, shared limits, blocklists, safe retries, pricing, promotions and access control.
- ESLint and the Vercel production asset build passed.
- Browser checks cover delayed/failed catalog requests, image fallback, throttled networking, early navigation and bag controls, no external font requests, and layouts from 360px to 1440px.
- Hosted Supabase checks cover delivery/takeaway orders, upload, tracking, admin management, homepage customization, vouchers and phone block/unblock controls. QA records are removed afterward.
- Migration `20261010110605_order_abuse_controls.sql` is applied to the configured database. Private abuse tables intentionally deny all client access; service-only routines enforce shared limits.
- Current remaining work is tracked in [READINESS.md](READINESS.md). Older deployment and per-process order-limit notes below describe previous releases.

Verified against the supplied Supabase project `zqghhrkmignugbwqstjh` and a local Node server. The simplified order desk and red-and-white theme were checked on October 7, 2026.

## Commands

- `npm install`: successful; npm audit reported zero vulnerabilities at verification time.
- `npm run lint`: successful.
- `npm run build`: successful; public output isolated in `dist/`.
- `npm test`: both database/validation suites passed.
- `npm run test:e2e`: hosted Supabase browser test passed, including the simplified order cards, details dialog, delivery and pickup actions, cash collection and mobile/desktop layouts.

## Real hosted flows exercised

| Flow | Result |
| --- | --- |
| Reject invalid login, then authenticate an active admin through Supabase Auth | Passed |
| Protect admin routes/API from unauthenticated users | Passed |
| Reject an authenticated user without an admin profile | Passed |
| Create category through admin form | Saved to Supabase |
| Create menu item with two variants and an add-on | Saved to Supabase |
| Edit item price | Updated in Supabase and reflected publicly |
| Upload a real food image | Saved to Supabase Storage |
| Configure delivery zone and fulfillment settings | Saved to Supabase |
| Add food/add-on, refresh, open persistent bag | Passed |
| Delivery checkout with database fee and total | Passed |
| Cash-on-delivery order | Persisted and appeared in admin |
| Admin status changes | Persisted, with customer polling showing updates |
| Takeaway checkout, alternate variant and cash-on-pickup order | Persisted with zero delivery fee |
| Takeaway-specific status flow | Passed |
| Private tracking rejects a wrong token | Passed |
| Completing cash orders marks payment paid | Passed |
| Logout prevents access to protected pages | Passed |
| Cross-origin write request rejection | Passed |
| 390px public menu overflow check | Passed |

The hosted test uses a generated QA admin and temporary category/dish/zone/orders. It removes its own records and uploaded file, deletes its temporary Auth users, and restores delivery/takeaway switches. It does not install a permanent default admin account.

## Database security/correctness tests

The production SQL migrations also run in isolated PostgreSQL/PGlite instances. Tests cover price recalculation, add-ons, minimum orders, zero/invalid quantities, unavailable items/portions, duplicate add-ons, missing zones, stale totals, rollback before order persistence, idempotent retries, private-order RLS, no client self-assignment of admin roles, no direct admin total tampering, legal and illegal status transitions, scheduled pickup timing and preserved historical prices after menu edits/deletions.

Supabase advisors found no schema security/RLS warnings. The project-level Auth advisor reports leaked-password protection disabled; enable it in Auth settings if supported by your plan: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Unused-index informational notices on the new order indexes are expected before production traffic. The duplicate permissive catalog-policy warnings were resolved in the second migration.

## Storefront and promotions update (October 9, 2026)

The dark/light storefront, Bunty سجی branding, homepage controls, and promotions migration are implemented. The migration is applied to the configured Supabase project; the frontend has not been deployed as part of this update.

- ESLint and both local and Vercel asset builds passed.
- Four database/validation tests passed, including discount caps, invalid and expired codes, future dates, minimums, redemption limits, retry idempotency, saved discount history, and promotion access controls.
- The new hosted browser test passed: homepage save, theme persistence, mobile overflow, reduced motion, voucher creation and application, rejection/removal, scheduling, editing and pausing offers. Countdown rendering uses an intercepted test response to avoid enabling a public discount during verification.
- The existing hosted restaurant browser test passed: admin CRUD, upload, delivery/takeaway orders, status transitions, tracking, authorization, and mobile layouts.
- Hosted checks encountered intermittent network latency; action/navigation timeouts allow for the remote Supabase service. Temporary test records are removed and settings restored.

## Remaining operational limits

- A public Hostinger deployment, DNS, HTTPS or restaurant staff workflow.
- Easypaisa, JazzCash or card gateway processing.
- Real business delivery fees or missing menu prices; the owner must configure these.
- Automatic weekly-hours enforcement; opening hours are displayed and staff control acceptance switches.
- High-load, multi-instance operation; the current rate limiter is per process.
