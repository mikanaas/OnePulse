---
name: Outlook proposal submission
description: Confirmed product behavior and rollout constraint for submitting proposals from Outlook.
---

**Rule:** The Outlook ribbon action opens the same proposal questions as OnePulse and submits without a separate OnePulse login. Use the active Microsoft 365 identity silently.

**Why:** The user corrected the initial direct-email-import concept: they want a Phish Alert-style ribbon button, a short form, and no OnePulse login prompt.

**How to apply:** Keep the form aligned with “Nytt forslag” in OnePulse. Use Microsoft NAA for silent identity and require a stable HTTPS URL, Entra app registration, and Microsoft 365 administrator deployment.