# Restaurant system architecture

The existing HTML/CSS/JavaScript public site is preserved. An Express 5 Node server serves a build-only `dist/` directory and a same-origin JSON API. Supabase supplies PostgreSQL, Auth and Storage. There is no Vercel-specific runtime requirement.

## Boundaries

- `client/store.js`: shared API client, persistent local cart and safe HTML escaping.
- `client/commerce.js`: delivery/takeaway checkout, authoritative quotes and private tracking.
- `client/admin.js`: admin forms, catalog and settings management.
- `client/order-desk.js`: simple order cards, status filters, search, details and next-step actions.
- `server/app.mjs`: authenticated routes, HTTP-only sessions, origin checks, upload handling, rate limiting and static routing.
- `server/validation.mjs`: strict request schemas; unknown client fields such as invented prices/payment methods are rejected.
- `server/supabase.mjs`: Supabase Auth and data-access adapter.
- `supabase/migrations/`: schema, RLS, atomic pricing/order/menu routines, audit triggers and Storage policies.
- `supabase/seed.sql`: the real supplied menu. Missing-price fish dishes are unavailable, rather than free.

## Customer API

`GET /api/catalog` returns public categories, dishes, variants, add-ons, active zones and restaurant settings.

`POST /api/quote` accepts `items: [{menu_item_id, variant_id, quantity, addon_ids}]`, `fulfillment`, `zone_id`, `pickup_mode`, and optional ISO `pickup_at`. It returns official line snapshots, subtotal, delivery fee, total and estimated minutes. The browser subtotal is only an estimate.

`POST /api/orders` accepts the quote input plus customer name, phone, address, landmark, instructions, `expected_total`, a UUID `request_key`, and a random 64-hex-character `tracking_token`. Prices and fees are recalculated in the database. If the quoted price changed, the customer must review and resubmit. The database writes the order, lines, add-ons and initial status in one transaction.

Retrying an identical request key, tracking token and payload returns the same order. Reusing a key with different content is rejected. Historical names and prices survive menu edits/deletions.

`GET /api/orders/BS-1001` requires `Authorization: Bearer <private tracking token>`. Only its SHA-256 hash is stored. Tracking links use a URL fragment (`/order/BS-1001#token`), which browsers do not send in server requests/referrers. Treat this link as a password. Order numbers alone cannot reveal customer data. Responses have `Cache-Control: no-store`.

Customers need no account. The tracking page polls every 10 seconds while visible; it does not subscribe to a public Realtime orders stream.

## Admin

`POST /api/auth/login` signs in through Supabase Auth and verifies a live, active `admin_profiles` row. Ordinary Auth users receive no administrative rights. JWT user metadata is not used for authorization. Access and refresh tokens are set only in HttpOnly, SameSite=Strict cookies; production cookies are Secure.

Every admin request verifies the Auth user and database profile. Revoking the profile blocks subsequent requests even if a JWT has not expired. Logout revokes the current Supabase session and clears cookies. Expired access tokens can be renewed using the refresh cookie.

Protected pages: `/admin`, `/admin/orders`, `/admin/menu`, `/admin/categories`, `/admin/delivery-zones`, `/admin/settings`. The login page is `/admin/login`. The API uses the authenticated user's token and RLS for admin operations rather than bypassing RLS with the server secret.

Menu writes use `save_menu_item` to save a dish and its options atomically. Removed options are made unavailable so old baskets cannot silently switch portions. Uploads allow JPEG, PNG and WebP up to 5 MB; the server decodes, limits pixel dimensions, strips metadata and re-encodes WebP before uploading to the public food bucket. Only admins can write to that bucket.

Order status changes are checked by database triggers, and every change appends history:

- Delivery: new → confirmed → preparing → out_for_delivery → completed.
- Takeaway: new → confirmed → preparing → ready_for_pickup → completed.
- A nonterminal order can be cancelled. Completed/cancelled orders cannot move backwards.

Completing a cash order records it as paid; the dashboard explicitly asks staff to confirm cash collection first. There is no online payment simulation.

## Deployment and operations

The live site runs Express on Vercel through `server.mjs`; `npm run build:vercel` publishes browser assets through the CDN and leaves protected HTML behind the server. A static `public_html` upload alone cannot run admin or checkout. A standalone Node host remains supported through `npm start`. `HOST=0.0.0.0` exposes that server to a managed host/container when needed; local development defaults to loopback. `APP_URL` must be the exact public HTTPS origin in production. Set `TRUST_PROXY_HOPS` only for the verified proxy chain.

Rate limits are per-process (per function instance on Vercel); distributed deployments need shared rate limiting or platform firewall controls as traffic grows. Supabase transactions and idempotency remain authoritative across instances. Admin order search is paginated across all orders.

Opening hours are editable display text. Acceptance is explicitly controlled by delivery/takeaway switches; staff must pause orders when the kitchen is closed. Scheduled pickup uses Pakistan time, must allow the configured minimum preparation time and must be within 7 days. Automated weekly opening-hour enforcement is not implemented.

## Future mobile apps and payments

The database routines and data-access layer contain pricing and order logic independently of the website. A Flutter app can use the same catalog/order API. A production mobile client needs its own allowed authentication/origin arrangement; current mutations require the configured web origin and intentionally do not enable wildcard CORS.

The schema reserves `payment_method`, `payment_status`, `payment_reference` and `payment_provider`, including future `easypaisa`, `jazzcash` and `card` values. The current API creates only `cash_on_delivery` and `cash_on_pickup`. A future gateway must verify provider-signed callbacks server-side before recording online payment success.
