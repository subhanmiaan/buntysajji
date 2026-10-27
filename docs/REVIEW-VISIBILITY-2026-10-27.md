# Review and dining visibility follow-up

- [x] Read live saved settings: review enabled with quote/author/source; dining disabled with an empty description.
- [x] Reproduced the visibility problem: the review appeared inside a small dining sidebar near the footer, without a review section heading.
- [x] Added an independent **Customer Reviews** section and a **Read Reviews** shortcut, including when dining publication is disabled.
- [x] Moved reviews and dining ahead of the homepage story section.
- [x] Pointed **Dine In** at the dining section and handled direct `/#reviews` / `/#dining` links after asynchronous rendering.
- [x] Added saved publication status and preview links to Admin → Homepage. Unsaved edits do not alter the displayed saved status.

Dining remains an enquiry unless the administrator enters confirmed details, selects **Publish confirmed dining and event facilities**, and saves. This fix does not change the owner's saved production content or publish unverified facilities.

Validation: lint/build and the isolated audit browser suite, including a regression for reviews published while dining is disabled. Production verification is performed after the GitHub-triggered deployment.
