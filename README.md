# MAGIC CREATIONS — Digital Invitations

MAGIC CREATIONS is an original Sri Lankan digital-invitation website and dashboard prototype.

## Public links

- Website: https://dgdammika585-sys.github.io/Magic-creation/
- Main dashboard / My Invitations: https://dgdammika585-sys.github.io/Magic-creation/dashboard.html

## Main dashboard — one-page flow

- First-visit onboarding state for a new customer with no invitations
- My Invitations list with All, Live and Draft filters when events exist
- Create a new invitation using event name, event type, date, time and venue
- Invitation cards with Preview, Open dashboard, and local Publish / Unpublish status actions
- Upcoming Event and Recent RSVPs panels
- Four-step How it works guide and original suggested templates
- Dashboard, Templates, Billing and Guide navigation
- Opening an event displays its event workspace inside the same dashboard page; the return button brings the user back to My Invitations without navigating away

## Individual event workspace

- Event overview and editable event details
- Original template gallery and live invitation editor preview
- Guest list: add guests, update RSVP statuses, assign tables, export / import CSV
- WhatsApp shortcut for inviting a guest with a phone number
- Event agenda, seating tables, local guest gallery, sample guestbook and budget tracker
- Sample invitation link and public invitation preview with countdown, agenda, venue directions, optional video/audio URLs, approved sample wishes and WhatsApp RSVP buttons

## Important limitations

This is a static GitHub Pages prototype, not the finished production platform.

- There is no secure customer registration, login or account profile system yet. The profile badge shown in the dashboard is visual only.
- Workspace records are stored in the current browser's local storage only; they do not sync across devices or customers.
- Publish / Unpublish changes a local prototype status; it does not securely publish data to a cloud backend.
- Generated sample invitation URLs contain encoded event details. Anyone who obtains a link may be able to read those details; do not place confidential information in these samples.
- WhatsApp RSVP links open a pre-filled message. They do not automatically save guest responses to the dashboard.
- Gallery images are stored in the current browser only; public guest uploads and secure cloud media storage are not connected.
- Video and music fields accept URLs; the application does not upload or transcode media.
- Online payments, production orders and a protected administrator backend are not connected.

## Source structure

- index.html — public website and invitation design collection
- dashboard.html — main My Invitations dashboard, onboarding, Templates, Billing, Guide and the embedded event-workspace view
- event-workspace.html — the event planner/editor rendered inside the dashboard frame
- supabase-schema.sql and SUPABASE-SETUP.md — starter schema and manual setup notes for a future backend

## Suggested production roadmap

1. Connect customer authentication and a cloud database.
2. Implement event ownership and private access-control rules.
3. Publish invitation URLs backed by database records rather than encoded private details.
4. Save guest RSVP submissions and show them in the correct dashboard.
5. Add secure media storage, QR guest uploads and moderation.
6. Finish protected admin, order and payment workflows.
7. Test permissions, mobile layouts, performance, backups and deployment end to end.
