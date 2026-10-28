# MAGIC CREATIONS — Digital Invitations

MAGIC CREATIONS is an original Sri Lankan digital-invitation website and dashboard prototype.

## Public links

- **Website:** https://dgdammika585-sys.github.io/Magic-creation/
- **Main dashboard / My Invitations:** https://dgdammika585-sys.github.io/Magic-creation/dashboard.html
- **Individual event workspace:** https://dgdammika585-sys.github.io/Magic-creation/event-workspace.html

## Main dashboard

- My Invitations list with All, Live and Draft filters
- Create a new invitation using event name, event type, date, time and venue
- Invitation cards with Preview, Open dashboard, Publish / Unpublish actions
- Upcoming Event panel with date countdown
- Recent RSVPs panel using the currently saved guest records
- Design-tip panel linking to the template collection
- Templates, Billing and Guide navigation pages
- WhatsApp help link

## Individual event workspace

- Event overview and editable event details
- Original template gallery and live invitation editor preview
- Draft settings and event data saved in the current browser
- Guest list: add guests, update RSVP statuses, assign tables, export / import CSV
- WhatsApp invitation shortcut for a guest with a phone number
- Event agenda: add and remove schedule items
- Seating tables and guest assignments
- Guest gallery: local image uploads
- Guest book: add, approve/hide and remove sample wishes
- Budget tracker: planned and actual expenses
- Generate a shareable sample invitation link containing the selected event details
- Public invitation pages can show a countdown, agenda, venue directions, optional video/audio links, approved sample wishes and WhatsApp RSVP buttons when an organizer number is supplied

## Important limitations

This is a **static GitHub Pages prototype**, not the finished production platform.

- There is no secure customer registration or login yet.
- Workspace records are saved in the current browser's local storage only; data does not sync across devices or users.
- Publish / Unpublish in the main dashboard only changes the local prototype status; it does not deploy or securely publish private event data to a cloud backend.
- Generated sample invitation links encode event details in the URL. Anyone with the URL may be able to read those details. Do not place confidential information in a sample invitation.
- WhatsApp RSVP buttons open a pre-filled WhatsApp message. They do not automatically save guest replies into the dashboard.
- Gallery images are stored locally in the current browser; there is no secure cloud media storage or public guest-upload backend.
- Video and music fields accept URLs; the application does not upload or transcode media files.
- There is no online payment processing, production order system or protected administrator backend yet.

## Source structure

- `index.html` — public marketing website
- `dashboard.html` — main “My Invitations” dashboard
- `event-workspace.html` — individual event planner/editor and sample invitation renderer
- `supabase-schema.sql` and `SUPABASE-SETUP.md` — starter schema and manual setup notes for a future backend

## Next production steps

1. Connect managed authentication and a cloud database.
2. Implement private event ownership and access rules.
3. Implement public invitation links backed by database records instead of URL-encoded private details.
4. Persist guest RSVP submissions and make them appear in the correct dashboard.
5. Move image/video uploads to secure object storage.
6. Finish protected admin, order, payment and moderation workflows.
7. Test permissions, mobile behavior, performance, backups and deployment end to end.
