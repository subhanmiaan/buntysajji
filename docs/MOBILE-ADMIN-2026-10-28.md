# Supplied logo and mobile admin

- [x] Use the owner's original JPEG artwork in the public header/footer, admin login/sidebar and social preview metadata. Preserve the image bytes; CSS fits the artwork into the existing theme.
- [x] Add an accessible collapsible admin menu on phones, with two columns of navigation links and 44px minimum touch targets.
- [x] Display administrative table rows as labelled cards below 600px; keep desktop tables.
- [x] Keep editor fields and variant controls inside the viewport and use 16px mobile input text.
- [x] Build, lint and whitespace checks pass.
- [x] All 35 existing browser regression tests pass, including admin CRUD, homepage publication, order completion and four-width layout checks.
- [x] Additional browser checks pass for navigation toggle/link use, supplied image loading and dish-editor control bounds at 320, 390 and 768px. Mobile navigation/editor/home screenshots reviewed.

Admin write checks use the isolated test database. Production settings and customer data are unchanged.
