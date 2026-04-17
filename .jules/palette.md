## 2024-04-17 - Missing ARIA labels on Icon-Only Buttons
**Learning:** Discovered a systemic accessibility pattern where `<Button size="icon">` components lacked `aria-label` attributes across multiple pages and components (e.g., QR scanner, share modal, profile, settings, connections). This makes these actions invisible or confusing to screen reader users.
**Action:** Always verify that buttons lacking textual content include descriptive `aria-label`s, especially when utilizing the `size="icon"` variant from the UI library.
