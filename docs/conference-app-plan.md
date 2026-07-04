# Conference App Build Plan

A phase-by-phase plan for building the Conference App and integrating it with the existing Expansion app. Each phase matches the numbering in `Conference App Figma Mockup/timeline.md` (Phase 2 was missing from that doc and has been filled in here).

### Phase 1 — Foundation
Build the conference app's screens (lobby, schedule, map) inside the existing app, and hook up everything that should already work for free: profile editing, direct messages, notifications, add-to-calendar. Add a static venue map. Put "Scan QR" and "Check In" buttons on the lobby screen now (so the design doesn't need to change later) even though they won't do anything yet. Show a simple sponsor highlight and a live attendee count.

### Phase 2 — Getting people in
Set up how someone actually gets into a conference: when they buy a ticket, we email them a one-tap "magic link" — no password, no code to type. Clicking it signs them in (creating their account automatically if it's their first time) and drops them straight into that conference. Also builds: the screen where people choose between the Expansion app and the Conference app if they have both; admin tools to create a conference, set its end date, and upload a list of ticket buyers; and what happens when a conference's date passes (it closes gently, nothing gets deleted). Badges/achievements get set up so conference badges and expansion badges never mix.

### Phase 3 — Making it feel alive
Add real chat: a general conference chat, chat rooms per session, community discussion boards, reactions, and @mentions, all with push notifications. Add a "Messages" tab inside the conference app that shows your conversations with people from that conference (using the same DM system as the rest of the app). Add reminder notifications shortly before a session starts.

### Phase 4 — Networking
Let people scan each other's QR code to instantly connect and start a chat, exchange a digital business card, and jot a note about how they met. Add "suggested people to meet" based on shared interests/industry/goals.

### Phase 5 — Insights
Build dashboards for admins: which sessions people attended most, how sponsors are performing, community health, and how many people stick around after the conference ends. Also tracks ad performance numbers (impressions, clicks) feeding into Phase 6's ad features.

### Phase 6 — Sponsors and ads
Build real sponsor and exhibitor profiles, ads/promotions that show up in the spots we reserved back in Phase 1 and 3, sponsor lead capture, and an upgraded interactive venue map that can point you to a sponsor's booth.

### Phase 7 — Ticketing automation and check-in
Connect Eventbrite so ticket buyers get their access email automatically the moment they purchase (no manual upload needed anymore). Add QR-based check-in at the door and per-session, with attendance reports.

### Along the way
- Every phase that sends a notification or email is called out above — nothing is bundled in vaguely.
- The three "missions" on the lobby screen (attend sessions, connect with people, visit booths) get counted for real as each matching phase ships (3 → sessions, 4 → connections, 6 → booths), not all at once.
