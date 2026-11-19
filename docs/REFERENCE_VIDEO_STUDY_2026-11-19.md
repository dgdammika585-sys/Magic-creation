# Reference Video Study — Two Wedding Invitations
**Date:** 2026-11-19  
**Project:** MAGIC CREATIONS  
**Branch:** `ceo/project-completion-2026-11-18`

## Scope and method
Two user-supplied WhatsApp videos were reviewed independently. Both are portrait mobile recordings at 480 × 854 pixels with an audio stream. Video 1 (11:57 AM file) is approximately 60.39 seconds; Video 2 (11:46 AM file) is approximately 59.60 seconds. Frames were sampled at roughly four-second intervals to map the visible design sequence. The source HTML files were then inspected to distinguish what is already implemented from what remains incomplete.

This is a reference study and source-level comparison, not a browser/device visual sign-off. The audio tracks were detected but not transcribed or identified.

## Reference 1 — Aravind & Nihara / Sunset Romance
**Existing source:** `templates/template-04-aravind-nihara.html`  
**Catalogue entry:** Design 12 / 12 — Aravind & Nihara — Sunset Romance

### Visual language observed in the video
- Portrait, mobile-first invitation.
- Warm sunset landscape with a romantic couple-on-scooter hero image.
- Hero copy is centered over the image, with names in a large flowing script and a clear “View Invitation” action.
- A second, darker romantic section uses a heart-shaped couple-photo frame, floating heart accents and a music control.
- Warm rose, champagne and brown tones; elegant serif/script typography.
- Subsequent sections use a light ivory/paper background with delicate floral corner decoration and restrained ornamental dividers.
- The visible sequence includes a countdown, story/milestone content, event programme, venue/directions, contact details, guest photo sharing and a closing thank-you panel.

### Existing HTML implementation found
- 10 main sections.
- Has loader, sunset-style hero, heart-shaped photo treatment, countdown, story, agenda, venue, gallery, seat finder, RSVP and a photo file input.
- Has music button/audio handling and reduced-motion CSS.
- Does not contain a native video element.
- Does not contain a Guest Book section in the inspected source.
- Existing source includes family details and seat-finder/RSVP sections that were not clearly visible in the sampled video frames.
- The video’s visible contact-card and closing thank-you treatments are not represented as dedicated sections in the current source.

### Required fidelity work
1. Replace the illustrative scooter SVG with a configurable real hero image/video media slot, while retaining a graceful fallback.
2. Recreate the warm sunset hero composition and the dark heart-photo interlude with the floating-heart atmosphere.
3. Add the light paper background and floral corner ornament system consistently across the scroll sections.
4. Match the video’s visible story, countdown, programme, venue/directions, contact cards, photo-share and thank-you sequence.
5. Keep all names, date, time, venue, map link, contacts, images and story content configurable; do not hard-code sample couple data.
6. Preserve accessible controls, keyboard operation, reduced-motion behavior and manual-only music playback.
7. Clarify the photo-upload UI as a preview/placeholder until it is connected to authenticated storage and owner moderation.

## Reference 2 — Sandun & Sajya / Poruwa Floral
**Existing source:** `templates/template-01-sandun-sajya.html`  
**Catalogue entry:** Design 09 / 12 — Sandun & Sajya — Poruwa Floral

### Visual language observed in the video
- Portrait, mobile-first, traditional Sri Lankan wedding invitation.
- Deep, warm floral/heritage opening with a decorated arch and a full-length couple portrait.
- A “You’re invited” reveal precedes the main invitation; the couple’s names are prominent in elegant script.
- The scroll changes to a warm ivory/cream paper layout with delicate floral/heritage borders and gold/brown accents.
- Family details appear early, followed by the wedding/Poruwa event details and countdown.
- Calendar actions are presented as a compact, clear choice (Google Calendar and Apple/Outlook).
- Couple photographs are shown in a vertically flowing gallery/story layout.
- Venue/directions and a structured RSVP form appear toward the lower part of the invitation.
- A restrained monogram-style closing screen finishes the invitation.

### Existing HTML implementation found
- 16 main sections.
- Has hero, invitation introduction, family blocks, Poruwa ceremony, event details, countdown, story, save-the-date, promise, agenda, gallery, venue, guest finder, seat finder, guest book, RSVP and photo-upload UI.
- Has calendar-related UI, music control/audio handling and reduced-motion CSS.
- Does not contain a native video element.
- The HTML has more feature sections than the sampled reference video; the order and visual treatment need to be aligned to the reference rather than simply adding more content.
- Upload and guest-related controls in this static HTML are not proof of live authenticated backend integration.

### Required fidelity work
1. Recreate the dark floral/heritage arch opening and full-length portrait composition.
2. Add a distinct “You’re invited” transition before the names and invitation action.
3. Match the cream paper scroll surface, floral border details, gold/brown palette and elegant typography.
4. Match the reference sequence: family details → event/Poruwa details → countdown → calendar actions → couple gallery/story → venue/directions → RSVP → monogram closing.
5. Keep the Google Calendar and Apple/Outlook actions separate and ensure they use customer event data.
6. Keep the layout genuinely mobile-first and check that the floral frame never obscures content or controls.
7. Clearly label seat finder, guest book and photo upload as demo/unavailable until their workspace services are connected.

## Shared implementation requirements
- Build these as two distinct design systems; do not merge their palettes, hero treatments or section order.
- Use customer data/configuration rather than sample couple names and dates.
- Keep music manually started by the visitor; never autoplay audio.
- Add native opening-video support only where a customer supplies a valid video, with a poster/fallback image and reduced-motion handling.
- Use responsive layouts and semantic headings/forms; test at narrow mobile width and desktop preview width.
- Do not claim RSVP, seating, guest book or photo upload is live until the backend integration is actually connected and tested.
- Preserve the existing catalogue IDs and selection mappings unless the dashboard mapping is separately verified.

## Current status
- Both references reviewed separately.
- Existing matching template files identified; no duplicate template files created.
- Source-level feature comparison completed.
- No template source has been modified in this study commit.
- No browser screenshots, mobile-device test, live RSVP test, upload test or audio identification has been completed.

## Recommended next implementation order
1. Bring Reference 1 (Aravind & Nihara) into visual alignment with its sunset/heart-frame/flower-paper/contact/thank-you reference.
2. Bring Reference 2 (Sandun & Sajya) into visual alignment with its heritage-arch/cream-paper/family/calendar/RSVP/monogram reference.
3. Run HTML/JS checks, inspect responsive CSS and verify reduced-motion/manual-audio behavior.
4. Render both pages in a browser at mobile and desktop widths before calling the visual review complete.
