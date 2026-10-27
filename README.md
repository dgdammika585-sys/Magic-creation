# MAGIC CREATIONS — Digital Invitations

MAGIC CREATIONS is an original Sri Lankan digital invitation website and event-workspace prototype.

## Public links

- **Website:** https://dgdammika585-sys.github.io/Magic-creation/
- **Workspace / dashboard prototype:** https://dgdammika585-sys.github.io/Magic-creation/dashboard.html

## Current features

### Public website
- Premium responsive homepage and invitation design gallery
- Wedding, engagement, birthday, animated and video invitation concepts
- Sinhala / English language toggle
- Template filtering and sample invitation preview
- WhatsApp inquiry links

### Workspace prototype
- Event overview and editable event details
- Original template gallery and live invitation editor preview
- Guest list: add guests, update RSVP statuses, assign tables, export CSV
- Event agenda: add and remove schedule items
- Tables and seating assignments
- Guest gallery: local image uploads
- Guest book: add, approve/hide and remove sample wishes
- Budget tracker: planned and actual expenses
- Generate a shareable sample invitation link containing the event's public details

## Important limitations

This version is hosted as a static GitHub Pages website. It does **not** yet include secure customer accounts, a cloud database, real-time shared RSVP storage, private cloud media storage, payment processing or a production admin system. Workspace records are saved in the current browser's local storage. A generated sample invitation link embeds its public event details in its URL; do not include private information.

These features are a foundation for continued development, not a claim that the full production platform is complete.

## Source structure

- `index.html` — public marketing website
- `dashboard.html` — event workspace prototype
- `README.md` — project notes

## Next production steps

1. Connect managed authentication and a database.
2. Implement per-customer access rules and event ownership.
3. Move image/video uploads to secure object storage.
4. Persist RSVP submissions from guest invitation pages.
5. Finish the protected admin, orders, payments and moderation workflows.
6. Test and verify the deployed production application.
