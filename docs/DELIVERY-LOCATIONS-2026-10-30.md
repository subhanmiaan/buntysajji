# Delivery locations — 30 October 2026

Added the owner's 53 supplied names, preserving spelling and capitalization, as active delivery zones. The approved settings for each are Rs. 0 delivery, Rs. 100 minimum order and a 45-minute estimate.

The existing ShahabPura Road record was retained. There are now 54 active zones, shared by the public delivery coverage section, checkout dropdown and Admin > Delivery zones. Each location's name, charge, minimum, estimate and active status remain editable there.

The original requested list is recorded in `scripts/data/delivery-locations.json`. The import script skips existing names case-insensitively and does not update their settings. It checks the original baseline zone to prevent targeting an unrelated database. Its temporary production build invocation was removed after import; normal builds do not write delivery data. The script defaults to a dry run and requires `--apply` for a deliberate future import.

Validation: 53 unique supplied names, approved defaults, duplicate protection, lint and production build. Live checks compare all names/settings with the catalog, public coverage and checkout options, then request checkout quotes for two locations without submitting orders.
