# MAGIC CREATIONS — Digital Invitations

MAGIC CREATIONS is an original Sri Lankan digital invitation website and event-workspace prototype.

## Public links

- **Website:** https://dgdammika585-sys.github.io/Magic-creation/
- **Workspace / dashboard prototype:** https://dgdammika585-sys.github.io/Magic-creation/dashboard.html

## Current features

### Public website
- Responsive premium homepage and invitation design gallery
- Original wedding, engagement, birthday, animated and video design concepts
- Sinhala / English text toggle
- Template filtering and sample invitation preview
- WhatsApp inquiry links

### Event workspace prototype
- Event overview and editable event details
- Original template gallery and live invitation editor preview
- Draft saving in the current browser
- Guest list: add guests, update RSVP statuses, assign tables, export CSV
- Event agenda: add and remove schedule items
- Seating tables and guest assignments
- Guest gallery: local image uploads
- Guest book: add, approve/hide and remove sample wishes
- Budget tracker: planned and actual expenses
- Generate a shareable sample invitation link containing the selected event's details
- Public invitation pages include template-dependent colour themes, a live countdown, agenda, Google Maps directions, optional video/audio links, approved sample wishes and WhatsApp RSVP buttons when an organizer number is supplied

## Important limitations

This is a **static GitHub Pages prototype**, not the finished production platform.

- There is no secure customer registration or login yet.
- Workspace records are saved in the current browser's local storage only; they do not sync across devices or accounts.
- Generated sample invitation links encode their event details in the URL. Anyone with that URL may be able to read those details. Do not place confidential information in a sample invitation.
- WhatsApp RSVP buttons open a pre-filled WhatsApp message. They do not automatically save guest replies into the event dashboard.
- Gallery images are stored locally in the current browser; there is no secure cloud media storage or public guest upload backend.
- Video and music fields accept URLs; the application does not upload or transcode media files.
- There is no payment processing, production order system, or fully protected admin backend yet.

## Source structure

- `index.html` — public marketing website
- `dashboard.html` — event workspace and public invitation prototype
- `README.md` — project notes

## Next production steps

1. Connect managed authentication and a cloud database.
2. Implement per-customer access rules and event ownership.
3. Persist guest RSVP submissions from public invitation pages.
4. Move image/video uploads to secure object storage.
5. Finish protected admin, orders, payment and moderation workflows.
6. Test access control, mobile behavior, performance, backups and deployment end to end.
