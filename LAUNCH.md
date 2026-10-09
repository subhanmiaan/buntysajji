# Launch the ordering system

Admin, database persistence, menu/category management, delivery zones, settings, cash checkout and private tracking are implemented. The public theme uses the restaurant's red-and-white branding.

## First login

The existing restaurant account is `buntysajjiadmin@buntysajji.com`. Open https://buntysajji.vercel.app/admin/login and use the password chosen for that account. Login opens the order desk directly. There is no default password.

Only when setting up a new restaurant owner, configure `.env` and run:

```sh
npm run admin:create -- your-email@example.com
```

Choose your password in the hidden terminal prompt, then open `/admin/login`. There is no default password. For an existing Auth account, assign its UUID an admin profile using the SQL in README.md.

## Restaurant setup

1. Review prices and availability in `/admin/menu`. Fish prices must be entered before those dishes can be enabled.
2. Enter actual delivery areas, fees, minimums and timing in `/admin/delivery-zones`.
3. Confirm phone, address, hours and preparation time in `/admin/settings`; enable the fulfillment types you accept. Delivery starts disabled.
4. Train staff to watch `/admin/orders`, confirm orders and progress statuses. Mark Completed only after cash collection.
5. Test a delivery and takeaway order with staff before announcing the service.

## Vercel deployment

This project is linked to `buntysajji` on Vercel. Follow [VERCEL-SETUP.md](VERCEL-SETUP.md) for the Express build and environment configuration. The API and admin require this server deployment; uploading only static files will show the offline preview.

## Alternative Node hosting

Use hosting that runs a Node server, or a VPS. The previous static ZIP cannot run the backend.

1. Deploy this project or `release/server-app/` from `npm run package` outside the static public root.
2. Run `npm ci` (or `npm ci --omit=dev` in production), then `npm run build`.
3. Configure Supabase URL, publishable key, server secret key, `NODE_ENV=production`, exact HTTPS `APP_URL` and the hosting-assigned `PORT`.
4. Use `HOST=0.0.0.0` if the managed host/container needs network access to Node. A same-machine VPS proxy can use loopback.
5. Start with `npm start`, supervised by the platform/process manager. Forward all routes, including `/api/*`, to Node.
6. Connect the domain and HTTPS. Set `TRUST_PROXY_HOPS` only to the verified number of reverse proxies.
7. Test `/api/health`, `/admin/login`, delivery/takeaway checkout, confirmation and tracking on the real domain.
8. Enable backups and monitor server errors. Never put `.env` or the server secret in browser code, Git or public directories.

Start with one app process. Multiple instances need a shared rate limiter. Admin search is paginated across all orders.

## Payments and owner decisions

Cash on delivery and cash on pickup work. Online payment providers require a separate verified integration; reserved fields do not activate a gateway.

You supply the owner credentials through the setup command, approved delivery areas/fees, final missing prices and hosting/domain configuration. These are business/account settings, not simulated forms or order storage.
