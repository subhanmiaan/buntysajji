# Transparent paired branding

The public header/footer and admin branding now display the chicken emblem on the left and neon wordmark on the right. Both assets have verified alpha transparency; CSS uses transparent backgrounds and contains the complete artwork. The pair keeps its left-to-right order in both language modes.

Workspace assets:
- `assets/bunty-emblem-transparent.png` (240 x 264)
- `assets/bunty-wordmark-transparent.png` (720 x 215)

Created with the built-in imagegen tool, then trimmed and resized for web delivery while preserving alpha. Original uploads were not overwritten.

## Edit prompts

Emblem: Use case: background-extraction. Edit target: supplied chicken restaurant logo. Remove ONLY the flat gray exterior background to actual alpha transparency. Preserve the complete chicken, red and yellow circular badge, black outlines, sunglasses, green chili, and all original Bunty Urdu lettering exactly. Do not redraw, redesign or change the text. Clean antialiased silhouette, tightly framed with a small transparent margin. Output a transparent PNG website emblem.

Wordmark: Use case: background-extraction. Edit target: supplied neon Bunty Urdu wordmark. Remove the black rectangular background to actual alpha transparency, including background visible in letter counters. Preserve original lettering shapes, spelling, cyan blue letters, yellow y, pink outline, white highlights and pink neon edge glow. Do not redraw or redesign. Tightly frame the wide horizontal wordmark with small transparent padding, avoiding large blank margins. Output transparent PNG website wordmark, no checkerboard or opaque backdrop.

## Checks

- Build and lint pass.
- Browser checks cover home, admin login and admin menu at 320, 390, 768 and 1440px in both themes: no horizontal overflow, both assets load, emblem remains left of wordmark, and image CSS backgrounds are transparent.
- Mobile light-theme and desktop dark-theme screenshots inspected.
- Existing 35-test browser regression suite run before publication.
