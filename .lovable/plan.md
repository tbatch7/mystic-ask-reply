# SecretSpice — Plan (v3, final)

A spicy, intimate question game for couples. Sender creates a session, shares a link, responder rates how willing they are to share answers to deeply personal questions. Sender sees the results live.

## User flows

**Sender (authenticated)**
1. `/` — landing + sign in / sign up. Email + password, or "Continue as guest" (anonymous).
2. `/dashboard`:
   - **"Create New Game for My Partner"** → creates session, modal with shareable URL `/play/<slug>` + Copy.
   - **"Solo Test Mode"** → creates a test session and routes the same browser straight into the responder flow with a "Test mode" badge. After submit, automatically redirects to `/games/<sessionId>` (sender results view).
   - Past games list (status, date, openness score, view, delete). Test games in a separate section.
   - **"Delete All My Data"** danger button (red, bottom of page) — confirm dialog → deletes all of the user's sessions (and answers cascade). Useful for cleanup during testing.
3. `/games/<sessionId>` — live results: overall Openness Score, Secrets Level (with emoji), per-category bars, per-question answers + slider stop label. Realtime subscription.

**Responder (no login)**
1. `/play/<slug>` — seductive intro + persistent amber warning: "⚠ Your answers will be shared with the person who invited you." Optional first name.
2. Questions screen:
   - 30+ questions grouped by category, single column, mobile-first.
   - Sticky top progress bar: "Question 12 of 32" + filled bar.
   - Each question: full text + slider 0–100 with 5 labeled stops: Never / Only if pushed / Maybe someday / I'm open / I already told them. Default 50.
   - **Skip** button under each slider (stored as `skipped = true`, excluded from score, shown as "Skipped" on sender view).
3. Sticky bottom bar: progress + "Submit All Answers". Confirm dialog reiterates warning.
4. After submit: results page with own Openness Score + Secrets Level reveal. Locked.

## Scoring + Secrets Level (with emojis)

- Each non-skipped answer 0–100. Average = **Openness Score** (%).
- 0–33 **🔒 Guarded** · 34–55 **🌶️ Mild** · 56–78 **💋 Spicy** · 79–100 **🔥 Burning**.
- Per-category score = average of non-skipped answers in that category.

## Results page design (sender + responder)

- Large headline: emoji + level + score (e.g. **🔥 Burning · 84%**) with subtle glow.
- Animated radial/linear progress for overall score.
- 5 category cards, each with: category name, mini-emoji, gradient progress bar (cool→hot), score %, count of answered/skipped.
- Sender view also lists every question with: text, the stop-label they chose, color-coded chip (green = open, red = never, grey = skipped).
- Smooth fade-in animations (Framer Motion–style via tailwind animations).

## Token format — readable slugs

3-word slugs, `adjective-noun-noun` from curated wordlists (e.g. `velvet-midnight-ember`). Unique check on insert with retry. Regex `^[a-z]+-[a-z]+-[a-z]+$`, length 8–48.

## Question bank (`src/lib/questions.ts`)

~32 questions, 5 categories, ~6–7 each. Tone: explicit-but-tasteful, focused on the things partners are usually nervous to share. After build, the full list will be pasted into chat for review/tweaking.

Categories + themes:
1. **Relationship Secrets** — hidden lies, doubts you've never voiced, things you'd never want them to find.
2. **Jealousy** — specific people in their life that bother you, snooping, ex-related triggers, situations that hurt.
3. **Fantasies & Turn-ons** — fantasies involving people you both know, kinks you've never asked for, recurring scenarios you replay.
4. **Past Experiences** — honest partner count, hookup details you've hidden, someone from your past you still think about, things you did you've never described.
5. **Attractions** — celebrities, friends, coworkers, their friends — people you've thought about in detail.

## Data model (Lovable Cloud)

- `profiles` (id pk → auth.users, display_name, created_at) — auto via signup trigger.
- `sessions` (id, sender_id, token unique, responder_name, status `pending|completed`, openness_score int, secrets_level text, is_test bool default false, created_at, completed_at).
- `answers` (id, session_id fk cascade, question_key, category, value int 0–100, skipped bool default false, created_at, unique(session_id, question_key)).

### RLS

- `profiles`: user selects/updates own row.
- `sessions`: sender selects/deletes own; public select by token (safe columns); insert authenticated with `sender_id = auth.uid()`; update only via server function.
- `answers`: select only by session's sender; insert only via the public submit server function.

### Server functions (`src/lib/game.functions.ts`)

- `createSession({ isTest? })` (auth) → `{ token, sessionId }`.
- `getSessionByToken({ token })` (public) → minimal info for responder page.
- `submitAnswers({ token, responderName, answers })` (public, Zod) → ensures `pending`, inserts answers, computes score + level (excluding skipped), marks `completed`.
- `listMySessions()` (auth).
- `getMySession({ id })` (auth, sender-only) → session + answers grouped by category.
- `deleteMySession({ id })` (auth, sender-only).
- `deleteAllMyData()` (auth) → deletes every session owned by the user (answers cascade).

Validation: token slug regex, value 0–100, skipped bool, allowed `question_key`s + categories from seeded list, max array length.

## Routes

- `src/routes/index.tsx` — landing.
- `src/routes/auth.tsx` — sign in / sign up + "Continue as guest".
- `src/routes/_authenticated.tsx` — guard.
- `src/routes/_authenticated/dashboard.tsx` — CTAs, past games, Delete All My Data.
- `src/routes/_authenticated/games.$sessionId.tsx` — sender results (realtime).
- `src/routes/play.$token.tsx` — public responder page (intro → questions → results).

## UI / design

- Dark seductive theme via semantic oklch tokens in `src/styles.css`: near-black bg, deep crimson primary, rose/ember accent, soft gold highlights.
- Headings: Playfair Display. Body: Inter.
- Gradient glow on primary buttons; slider track gradient cool→hot.
- Mobile-first, large tap targets, sticky progress + sticky submit on responder.
- Persistent amber warning banner on every responder screen.
- Test Mode badge on every test-flow screen.

## Realtime

`/games/<sessionId>` subscribes to that session row + its answers via Supabase realtime so scores populate live.

## Out of scope (v1)

Multi-responder games, custom user-authored questions, notifications/email, in-app chat.

Confirm and I'll build it. After build, the full question list will be posted in chat for review.
