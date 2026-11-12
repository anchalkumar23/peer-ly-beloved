# Scribbld People — PRD

## Original problem
"Follow the docs and make the project as said, the website should be mobile friendly and focus should be more on the frontend, please add as many animations and design and make it UI UX good". Docs = Scribbld People Quiz product brief (mobile-first coworker personality quiz + connection tool for @wearescribbld.com).

## Architecture
- FastAPI (server.py, quiz_config.py = question bank/scoring/matching config, emailer.py = Emergent Resend, storage.py = Emergent Object Storage), MongoDB.
- Auth: Microsoft Entra OIDC via Authlib (needs ENTRA_TENANT_ID / CLIENT_ID / CLIENT_SECRET), server-side sessions in Mongo, httpOnly cookie, 30 days. Preview-only dev sign-in behind DEV_LOGIN_ENABLED.
- Admin roles via env: ADMIN_FULL_EMAILS (kajol, anchal), ADMIN_HR_EMAILS (hr), ADMIN_VIEW_EMAILS (batul).
- React + framer-motion + canvas-confetti + react-easy-crop, scrapbook design (Caveat Brush + Plus Jakarta Sans).

## Implemented (Phase 1, Nov 2026)
- Sign-in + domain gate, name confirm, welcome, 4 profile screens (photo crop/replace/remove, paste-blocked facts)
- 28 questions exactly per brief, multi/single, write-ins, lunch follow-up on food question, skip/back/autosave/resume
- 50-word welcome note with preview, visibility consent (default off), shuffle + card-flip archetype reveal (4 + blended), scrapbook card
- Matching (50/30/20 weights, low-weight location/phone), 2–3 commonalities, Not now (7 days)/Hide/Refresh, exposure penalty
- Say hi: openers, review, send/copy, email notification, Sent→Seen→Accepted/Declined, inbox accept/decline (email revealed on accept)
- Settings: visibility, hide photo, edit, delete, sign out
- Admin: stats (team grouping <3), people search, active/departed, pause/remove, individual view (full only, audited), question on/off + wording + mobile preview, audit log

## Backlog
- P0: Enter real Entra credentials, set DEV_LOGIN_ENABLED=false before going live, update PUBLIC_BASE_URL for the production domain
- P1: Full option editing/versioning, CSV roster import + invites, new-joiner invite, 30-day purge after departure
- P2: Quarterly refresh, fair-exposure balancing, shareable card image, founder engagement trends
