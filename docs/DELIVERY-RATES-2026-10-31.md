# Delivery charges — 31 October 2026

Applied the owner's 54 location/rate pairs from `scripts/data/delivery-rates-2026-10-31.json`. Amounts are PKR, shown as Rs. alongside each delivery area and in checkout.

- Added Shikarpur at PKR 210.
- Renamed Ugoki Road to Ugoki Morr at PKR 150, preserving its database ID.
- Set the legacy ShahabPura Road entry to the same PKR 30 charge as Shahabpura.
- Preserved existing minimum orders, delivery estimates, active status and zone IDs. Shikarpur uses the previously approved Rs. 100 minimum and 45-minute estimate.
- Existing orders retain their recorded delivery amounts; new quotes use the updated rates.

The one-time update uses a single database upsert. Its temporary production build invocation was removed after deployment. Normal builds do not write rates; future admin edits remain authoritative. The manual script defaults to a dry run and requires `--apply` to update data.

Validation covers every rate, unique IDs, repeat-run behavior, name changes and preserved settings; lint/build; live public coverage and checkout options; and fee-inclusive quotes without placing orders.
