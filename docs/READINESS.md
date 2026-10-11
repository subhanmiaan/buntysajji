# Website readiness — October 10, 2026

## Implemented and verified

- Dark/light storefront, homepage customization, timed offers and vouchers.
- Smaller local responsive dish photos: 197 source images total 29,190,518 bytes; the 480px variants total 4,890,520 bytes (83% smaller). Browsers select a larger variant when needed. This is an asset-size comparison, not a promise that every page loads 83% faster.
- Official circular logo retained; its web copy is 4.8 KB. The supplied text artwork replaces the typed brand name with a transparent WebP.
- Local fonts with optional loading, a homepage hero in the initial HTML, early navigation/bag controls, stable tablet/mobile layout, request timeouts, retry messaging, image fallbacks, and content that remains visible without entrance animations.
- Menu prices and promotions are revalidated at checkout. Mutating requests are never automatically retried. A failed order response preserves the same idempotency key and private tracking token for a safe manual retry.
- Shared order-attempt limits in PostgreSQL, a signed checkout session, a hidden bot-trap field, canonical Pakistani mobile numbers, phone/network order limits, and an admin phone blocklist.
- Pending orders now show a customer-initiated WhatsApp confirmation button with the order number, name, phone and total. The admin desk warns staff to match the incoming WhatsApp number before accepting or preparing the order. This has no per-message API charge because the customer starts the conversation.
- Optional Cloudflare Turnstile support is implemented with mandatory server-side validation and a short-lived signed human-check cookie. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Vercel to enable it; leaving either unset keeps it disabled.

## Staff workflow for suspicious orders

Open **Admin → Order protection** to block or unblock a phone number after confirming abuse. Never infer that a number belongs to an attacker merely because it appeared on a fake order: customers can type somebody else's number.

New orders stay pending staff acceptance. Call the customer to confirm the address and cash total before preparing food, particularly first-time or unusually large orders. Limits are 5 orders per phone per hour, at most 2 active orders per phone, a 30-second gap between new orders, and 20 orders per network per hour. Attempts are capped at 20 per network per 10 minutes. IPv6 addresses are grouped by /56. Raw IPs are not stored; keyed network hashes are kept in service-only tables and cleaned opportunistically after one day.

The network identity on Vercel comes from its platform-provided header; self-hosted installations use the configured Express client IP. See [Vercel request headers](https://vercel.com/docs/headers/request-headers). `ORDER_SECURITY_SECRET` can be set server-side; otherwise a domain-separated HMAC uses the existing server-only Supabase secret. Rotating it invalidates open checkout sessions.

## Still needed / not implemented

1. **Automated phone ownership verification.** The free WhatsApp confirmation is a staff-verified workflow. SMS or automated WhatsApp OTP still requires a provider, credentials, and a sending budget. Current controls reduce spam, but only staff matching the incoming WhatsApp number confirms ownership. Turnstile code is ready but remains disabled until free Cloudflare keys are added in Vercel.
2. **Four fish prices.** Pangasius with rice, pangasius grilled, pangasius tikka, and grilled rahu remain unavailable without priced variants. Restaurant staff must supply those prices.
3. **Online payments.** Orders currently use cash on delivery/pickup. Easypaisa, JazzCash and card payments are not integrated.
4. **Automatic opening-hours enforcement.** Hours are display text. Staff must pause delivery/takeaway in Settings when the kitchen stops accepting orders.
5. **Admin account hardening.** Supabase reports leaked-password protection disabled. Enable it if the project plan supports it: [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). MFA enrollment and recovery procedures are not part of the current admin UI.
6. **Production operations.** Set up error/uptime alerts and perform a backup-restore drill before relying on the site for all orders. High-load testing and shared limits for non-order endpoints are still outstanding.

Delivery and takeaway were enabled during the readiness audit, with two public delivery zones. Staff should confirm that their actual fees, minimums and coverage are correct. No business prices or delivery charges were invented during this update.

## Artwork provenance

The supplied `Gemini_Generated_Image_12t0ts12t0ts12t0.jpg` was used as the edit target with the built-in image tool. Prompt: remove the baked gray/white checkerboard, use a genuinely transparent background, preserve the Bunty سجی lettering, colors and red outline, add no elements, and keep a small transparent margin. The edited source is `assets/wordmark-source.png`; the optimized website asset is `assets/wordmark.webp`. The official `assets/logo.jpg` is unchanged.
