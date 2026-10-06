# Bunty Sajji restaurant system

The original Punjabi truck-art website now uses a Node/Express API with Supabase PostgreSQL, Auth and Storage. It includes real admin management, persistent carts, delivery/takeaway checkout, cash payments and private order confirmation/tracking.

## Run

Requires Node.js 22.12 or later. Use `npm.cmd` in PowerShell if execution policy blocks `npm.ps1`.

```sh
npm install
npm run lint
npm run build
npm start
```

Open http://localhost:3000. Copy `.env.example` to `.env` and fill its values. The supplied project is configured in this workspace's local `.env`. Never commit that file or put it in a public folder.

## Supabase setup on a new project

1. Apply every SQL file in `supabase/migrations/` in filename order through the SQL Editor or Supabase CLI.
2. Run `supabase/seed.sql`: 116 dishes, 15 categories and 181 variants. It does not overwrite existing seeded records. Missing-price fish dishes stay unavailable.
3. Configure the project URL, publishable key and server secret key. Legacy anon/service-role keys are supported too. The secret stays server-side.
4. Create an owner account below.
5. Configure actual delivery zones and enable delivery in Settings. No charges are invented; delivery starts disabled. Takeaway starts enabled.

Migrations include all required tables, foreign keys, indexes, constraints, RLS, atomic ordering routines and the `food-images` Storage bucket. Only admins can upload photos. Uploaded images are decoded, resized and re-encoded as WebP.

## Admin access

Open **http://localhost:3000/admin/login**, or `/admin/login` on your deployed domain.

Create your own owner account locally after configuring `.env`:

```sh
npm run admin:create -- your-email@example.com
```

Enter a password of at least 12 characters in the hidden terminal prompt. The command creates a confirmed Supabase Auth user and active owner profile; it does not store the password. There are no default credentials.

If the email already exists in Supabase Auth, use its existing password and assign its **user UUID** through the SQL Editor:

```sql
insert into public.admin_profiles (user_id, role, active)
values ('REPLACE_WITH_AUTH_USER_UUID', 'owner', true)
on conflict (user_id) do update set role = 'owner', active = true;
```

Only trusted project administrators can assign roles. Set `active=false` to revoke access. Supabase Authentication → Users can manage/reset credentials; the website has no public admin registration.

- `/admin`: dashboard.
- `/admin/orders`: customer details, totals, historical line prices and status changes.
- `/admin/menu`: dishes, photos, availability, featured flags, prices, variants and add-ons.
- `/admin/categories`: category names, ordering and active state.
- `/admin/delivery-zones`: fees, minimums, estimates and active state.
- `/admin/settings`: restaurant/contact details, hours, social links, preparation time and fulfillment switches.

## Customer ordering

The public catalog comes from Supabase. The cart persists in localStorage. Checkout reads official delivery fees and minimums; the server/database validates quantities, availability, variants and add-ons, then calculates the total. Price changes require customer confirmation.

An order transaction saves its `BS-…` number, customer details, lines, add-ons, pending payment and new status. Delivery uses `cash_on_delivery`; takeaway uses `cash_on_pickup`. Historical names/prices survive menu changes. Identical retry requests return the same order instead of duplicating it.

Confirmation links look like `/order/BS-1001#PRIVATE_TOKEN`. Keep these links private. Only a token hash is stored; order numbers alone cannot reveal customer data. Status refreshes every ten seconds while the tracking page is visible. Completing a cash order records payment as paid; staff must confirm cash receipt first.

## Verification

```sh
npm test
npm run test:e2e
```

Database tests run the real PostgreSQL migrations/functions in isolated PGlite instances: pricing, minimums, quantities, add-ons, availability, RLS, duplicate requests, historical snapshots and both status flows.

Hosted browser tests require working Supabase credentials and Chrome. They run real Auth, category/menu CRUD, Storage upload, delivery COD, takeaway cash, order management and customer tracking against Supabase. Temporary QA users, menu records, zones and orders are removed afterward, and fulfillment settings are restored. Use a staging project for future tests on a busy restaurant. There is no production fake-auth or fake-order mode.

## Deploy

This version requires a **Node server**, not a static-only `public_html` upload. Run `npm run build`, then `npm start`. Build output `dist/` contains public files only; server code, migrations and secrets stay outside it. No Vercel services are used.

`npm run package` prepares `release/server-app/` without secrets, node_modules or test artifacts. The old static ZIP is obsolete. See [LAUNCH.md](LAUNCH.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Operational limits and final settings

- Add real delivery areas and charges before enabling delivery.
- Hours are editable display text. Staff pause acceptance with the delivery/takeaway switches; automatic weekly-hours enforcement is not implemented.
- Scheduled pickup uses Pakistan time, allows preparation time and is limited to seven days ahead.
- Order search is paginated across all records. Start with one Node process; multiple replicas require a shared rate-limit store.
- Resolve missing fish prices, the duplicate Chicken Turkish Kabab entry and fries' “F.F.” portion before enabling them.
- Existing PDF food photos have limited resolution. The public design is preserved.
- Enable Supabase leaked-password protection if supported by your plan: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Payment-provider fields support later integration, but no Easypaisa, JazzCash or card gateway is active. The architecture document explains the shared API/database approach for future Flutter apps.
