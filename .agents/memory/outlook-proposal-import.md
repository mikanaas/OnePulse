---
name: Outlook proposal import
description: Confirmed product behavior and rollout constraint for creating proposals from Outlook emails.
---

**Rule:** The Outlook action should create a new improvement proposal immediately from the open email, without showing a review or edit form first.

**Why:** The user explicitly selected direct creation over a preview step to keep the workflow to one click.

**How to apply:** Preserve direct submission when changing the Outlook add-in. Keep duplicate protection, show only progress/result feedback, and remember that actual availability requires a stable published HTTPS URL plus Microsoft 365 administrator deployment.