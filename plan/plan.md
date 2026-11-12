# Scribbld People — "Who's your Scribbld person?"

A mobile-first, BuzzFeed-style coworker quiz for Scribbld employees: build a scrapbook profile card, answer 28 quick questions, get a playful personality archetype and meet coworkers you share interests with.
It's a side quest for finding easy conversation starters. It is not a psychological test or a work assessment.

## Who it's for
- **Employees** (any `@wearescribbld.com` Microsoft account). Current staff, plus new joiners on their first office day.
- **Admins**:
  - HR: hr@wearescribbld.com
  - Founder: kajol@wearescribbld.com
  - Dev: anchal@wearescribbld.com
  - Review: batul@wearescribbld.com

## Core features and experience
- **Microsoft sign-in, once.** Sign in with your work Microsoft account and stay signed in on that device for 30 days. Any account outside `@wearescribbld.com` is turned away. On first visit you're asked which name you want to go by. It's prefilled from Microsoft and you can edit it.
- **Welcome screen.** Sets a witty, warm tone, says it takes about 20 minutes and makes clear it's just for fun.
- **Profile card (4 screens).**
  - Name to go by
  - Quirky photo: upload, crop/resize, replace or remove
  - Role/team
  - Two short written answers: a fun fact and your current obsession. Pasting is blocked in these fields, they have character limits and a gentle reminder not to share sensitive info.
- **The quiz (28 questions, exactly as in the brief).**
  - One question per screen, grouped into five sections: Your everyday, Pop culture brain, Out and about, At work, Very you.
  - Big visual answer cards. Multi-select (no limit) only where the brief says so.
  - Write-in fields for the "Elsewhere / Something else" options.
  - A lunch restaurant-name field shown only when relevant.
  - Every question can be skipped. There's a progress indicator and Back/edit, and answers autosave after every step so you can leave and resume.
- **Welcome note (end screen).** You write a hello of up to 50 words for a personality match, with a live word counter and a 50-word cap. You review it before anything is sent.
- **Visibility consent.** Off by default. A clear screen explains what coworkers will see before you switch it on.
- **Personality reveal.** An animated reveal of one of four archetypes, each with a short description and three playful traits:
  - The Soft-Landing Specialist
  - The Side-Quest Starter
  - The Rabbit-Hole Researcher
  - The Group-Chat Glue

  Ties show a blended "you contain multitudes" result. The screen carries a clear "for fun, not an assessment" note.
- **People to meet.**
  - Shows 2–5 active, opted-in coworkers who have finished their profiles.
  - Each card gives 2–3 specific, non-sensitive things you share, e.g. "You both love trying new lunch spots and are anime-curious."
  - Ranking weights: interests and culture 50%, hangout/lifestyle 30%, collaboration style 20%. Location and phone preference count only a little.
  - Controls: "Not now", "Hide this person" and "Refresh". The same people aren't shown over and over.
- **Say hi.**
  - Pick a suggested opener or use your welcome note, review it, then send a connection request or copy the message.
  - The receiver sees it in the app and also gets a real email from "Scribbld People" asking them to open the app. They can accept or decline.
  - Status is shown at each step: Sent → Seen → Accepted / Declined.
  - Not a chat. There's no ongoing messaging.
- **Profile controls.** Edit answers, pause discoverability, hide your photo, or delete your profile.
- **Admin area (role-restricted).**
  - Numbers: total employees signed up, completed / in progress / not started, completion rate by team, opt-ins, connection requests sent and accepted.
  - People: search an employee, mark them active or departed (departed people vanish from matches straight away), pause or remove a profile, and see when they gave consent.
  - Question bank: turn questions on or off, edit wording and options, and preview on mobile.
  - Every admin action is logged.

## User flow
1. Open the link → Sign in with Microsoft → confirm the name you go by.
2. Welcome screen → 4 profile screens → 28 questions (skip, back and autosave throughout).
3. Write your 50-word welcome note → choose whether to be visible to coworkers.
4. Animated personality reveal → your scrapbook profile card.
5. People to meet → open a match → pick or review an opener → send.
6. The match gets an email and an in-app request → accepts or declines → the sender sees the result.
7. Come back any time to edit, pause, refresh matches or check your requests.

## UI/UX feel
- **Scrapbook and sticker energy.** Paper textures, tape, hand-drawn doodles and the ✳ Scribbld mark. Playful but readable, with an internet-native voice.
- **Built for 360px phones first.** Big tap targets, short screens, a thumb-reachable bottom action bar and no sideways scrolling. It scales up cleanly to desktop.
- **Lots of motion:**
  - Cards slide between questions and pop when you tap an answer
  - Stickers wiggle, the progress doodle draws itself, confetti plays on completion
  - A card-flip "reveal" for your archetype
  - Staggered entrances for matches and a little "sent" animation
  - Motion is reduced for people who turn it off on their device
- **Accessibility.** Readable contrast, screen-reader labels and keyboard support.

## Implementation phases
**Phase 1 — MVP (built now)**
- Microsoft sign-in, the domain gate and the admin roles
- The full employee journey: welcome, profile, 28 questions, welcome note, consent, reveal, profile card, matches, say hi (in-app plus email), accept/decline and profile controls
- Admin area: completion numbers, people search, marking active/departed, pausing/removing profiles, turning questions on/off and the audit log
- Heavy animation and polish throughout

**Phase 2**
- Fuller question-bank editing (rewrite options, version the question set) with a mobile preview
- Uploading a staff list (CSV) and resending invites
- New-joiner invite on the first office day
- 30-day data retention and purge after someone leaves

**Phase 3**
- Quarterly question refresh
- Smarter balancing so everyone gets shown to others fairly over time
- Shareable profile card image
- Engagement trends for the founder

## Assumptions
- **Microsoft sign-in needs your setup.** Emergent doesn't manage it. Before sign-in can be tested, someone with Scribbld's Microsoft 365 admin access must register the app in Microsoft Entra and provide three values: Tenant ID, Client ID and Client Secret. You'll be asked for these in a secure card, not in chat.
- **"Sign in only one time"** means you stay signed in for 30 days per device. Microsoft or company policy may still ask you to sign in again sometimes, for example after a password change.
- **Who can get in:** anyone with an `@wearescribbld.com` account can join. There's no uploaded staff list in phase 1. Admins can mark people as departed.
- **Admin access levels:**
  - HR (hr@) gets the HR admin controls.
  - Founder (kajol@) and Dev (anchal@) get full access, including system health and individual profiles when necessary.
  - Review (batul@) gets view-only admin access: numbers and lists, no changes.
  - HR can't read private free-text answers.
- **Scoring:** each answer option is tagged Calm, Spark, Curious or Social, and the work-style questions carry less weight. The scoring map lives in one editable config.
- **Photos** are stored privately and shown only to signed-in coworkers.
- **Say-hi emails** come from the display name "Scribbld People" and say only that someone said hi, with a link to open the app. The welcome note itself stays inside the app.
- **Not collected:** age, birthday, address, health, religion, caste, politics or relationship status. Location is limited to the optional Mumbai area question.
- **Not used for work:** quiz data is never used for performance evaluation, and matches never consider seniority or reporting lines.
