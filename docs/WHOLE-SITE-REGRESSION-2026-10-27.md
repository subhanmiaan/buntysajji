# Website regression checklist — 27 October 2026

## Fixes

- [x] Checkout now refreshes its quote and line items when quantities change in the header bag. Quote requests take a cart snapshot so later edits cannot mutate an in-flight payload.
- [x] Public phone labels, call destinations, and footer contact details agree with saved admin settings. Empty alternate WhatsApp links are removed.
- [x] The exported Node server package includes the page prerenderer required to rebuild it.

## Verified

- [x] `npm run test:audit`: 35 browser tests passed.
- [x] `npm test`: 11 backend tests passed.
- [x] `npm run lint` and `git diff --check` passed.
- [x] `npm run package` succeeded; `node scripts/build.mjs` also succeeded from `release/server-app`.
- [x] Home, menu, about, gallery, checkout and 404: both themes at widths 320, 390, 768 and 1440 without horizontal overflow.
- [x] Admin login/logout and all admin pages at the same four widths.
- [x] Category, dish, portion price and delivery-zone create/edit/delete flows; public menu receives saved changes.
- [x] Homepage dining/review publication and image handling, safe rendering of entered text, and reviews visible independently of dining publication.
- [x] Delivery and pickup orders, add-ons, quantity changes, tracking links, scheduled pickup validation, vouchers and cash payment completion.
- [x] Lost-response retry without duplicate orders, authoritative pricing, unavailable fulfillment, storage failure and catalog timeout recovery.
- [x] Urdu persistence, keyboard controls, page metadata, delayed JavaScript, stale asset URLs and image failure fallback.
- [x] Invalid API input, forged origins, unauthenticated admin/tracking access, shared order limits and database access-control checks.
- [x] Read-only production sweep before publication: seven routes, four viewport widths, no observed browser exceptions, failed resource responses or horizontal overflow.

## Scope

Write tests use the production Express handlers and real migrations/order SQL in an ephemeral PGlite database. The isolated server supplies test-only authentication and upload adapters; these tests do not prove hosted Supabase Auth or Storage configuration. Production customer data and settings are not modified, and no real orders are placed. This is functional and adversarial-input regression coverage, not a production load test or an exhaustive security audit. The existing visual theme is preserved.

The automated regression cases are in `tests/e2e/whole-site.spec.mjs`, alongside the existing audit, loading and language suites.
