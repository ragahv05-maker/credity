## 2025-04-12 - Icon-only share buttons lack ARIA labels
**Learning:** Found an accessibility issue pattern in the `share-modal` where read-only inputs for share URLs and icon-only copy buttons lack ARIA labels, making them invisible or unclear to screen readers.
**Action:** Always ensure inputs (even read-only ones) and icon-only buttons (especially stateful ones like copy/copied) have descriptive `aria-label`s.
