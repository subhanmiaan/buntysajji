# Vercel ordering deployment

The Express backend and production environment variables are configured on the
existing `buntysajji` Vercel project. Live health, catalog, checkout quotes,
admin authentication and logout have been verified. The steps below are for
future deployments or restoring this setup.

The old configuration published the repository as static files. `/api/catalog`
returned HTML, so the website correctly fell back to the offline menu.

This version uses Vercel's Express framework with `server.mjs`. The build
copies only browser assets into `public/`; protected admin pages and the API
are served by Express. Do not set Output Directory to `.` or `dist`.

1. Push these changes to the Git repository connected to **buntysajji**.
2. In Vercel → buntysajji → Settings → Environment Variables, add the values
   from your local `.env` to the **Production** environment:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`)
   - `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`; server-only)
   - `APP_URL=https://buntysajji.vercel.app`
   - `NODE_ENV=production`
3. Under Build and Deployment, remove old overrides. The repository selects
   Express and `npm run build:vercel`. Leave Output Directory at its framework
   default. Use Node.js 24.x or a supported version >=22.12.
4. Redeploy the latest commit after setting the environment variables.
5. Open `https://buntysajji.vercel.app/api/health`. It must return JSON containing
   `"ok":true,"configured":true`, not the homepage. `/api/catalog` must also
   return JSON with menu items.

## Admin access

- Login: https://buntysajji.vercel.app/admin/login
- Orders: https://buntysajji.vercel.app/admin/orders
- Existing owner email: `buntysajjiadmin@buntysajji.com`
- Use the password chosen when that account was created. There is no default
  password and the website cannot display or retrieve it.

After login, the order desk opens with **Active**, **New**, **Completed**, and
**All orders** filters. Search by customer name, phone or order number. The
cards show food items, phone, cash total and a single next-action button.

Open an order and use **Accept order → Start cooking → Send for delivery / Ready
for pickup → Cash received — complete**. Complete only after collecting cash.
Cancellation has a separate confirmation. The list refreshes every 15 seconds.

Delivery areas, fees and acceptance switches are managed under Delivery zones
and Settings. A 12 km service radius does not determine the delivery fee or
minimum order; set those business values before accepting delivery orders.

Local `.env` values are not automatically copied into Vercel. Never publish the
file or put the server secret in browser JavaScript or a public-prefixed variable.

The in-memory API rate limiter is per function instance on Vercel. Use shared
rate limiting or Vercel Firewall controls before scaling to significant traffic.
