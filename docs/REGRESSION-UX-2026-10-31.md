# Regression and usability review — 31 October 2026

## Fixes and improvements

- [x] Menu prices now include selected add-ons and update when the portion changes, matching the bag total.
- [x] Invalid saved-cart rows are discarded individually instead of losing valid items alongside them.
- [x] Delivery coverage has an area search and a bounded, keyboard-scrollable list so 55 locations do not dominate the page.
- [x] Checkout can filter a long delivery dropdown by area name. Searching preserves the selected area and its charge; no-result feedback is explicit.
- [x] Menu search tolerates extra spaces and has a Clear filters action that resets both category and query.
- [x] New labels have Urdu translations and the existing theme is preserved.

## Verification

- [x] 41 browser regression tests passed: customer routes, admin CRUD, reviews/dining, delivery and pickup, vouchers, order completion, uploads through the test adapter, responsive layouts, Urdu, delayed/failed resources and retry behavior.
- [x] 11 backend tests passed, including pricing authority, database permissions, order idempotency, blocklists and promotions.
- [x] Five focused UX regressions passed, including out-of-order quote responses; rerun after the final checkout spacing adjustment.
- [x] Local stress run: 30 concurrent catalog reads, 120 malformed quote attempts and 15 invalid login attempts. Rate limiting returned 16 quote rejections and 5 login rejections; no 5xx responses and no created orders.
- [x] Automated accessibility scan of home/menu/checkout in light and dark themes: no reported WCAG A/AA violations in the scanned states.
- [x] Mobile delivery coverage and checkout screenshots inspected.
- [x] Build, lint and whitespace checks passed.

Run `npm run test:audit`, `npm test`, and `npm run test:stress` to repeat the checks. The stress command starts its own isolated server on port 3100; run it separately from the browser suite.

## Scope and limits

Database/order tests execute the real migrations and order SQL in ephemeral PGlite. The local server uses test-only authentication and upload adapters; this does not validate hosted Supabase Auth/Storage configuration. The HTTP burst is a bounded local regression, not a production capacity benchmark or exhaustive penetration test. Live checks use public browsing and quote requests without placing orders or changing admin/customer data. Delivery rates and saved restaurant content are unchanged.
