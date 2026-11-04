# OlympAI

A training space for academic olympiads: a study ladder that takes a topic from
notes to a graded derivation, an AI coach, a route through a chosen subject
toward a chosen competition, and timed mock papers that measure the student's
level.

Next.js 16 (App Router, Turbopack) · React 19 · embedded Postgres (PGlite) with
RLS and local auth · Tailwind v4 · OpenAI for grading and coaching.

## Running it

```bash
pnpm install
pnpm dev                     # development, compiles pages on first visit
pnpm preview                 # production build + server: what visitors get
```

No database to set up. The app runs Postgres itself (PGlite, compiled to
WebAssembly) with its files in `.data/db`, creates it on first start and
applies `supabase/migrations/*` — schema, RLS policies and seed content —
automatically. In development it also creates an admin account: login `test`,
password `test`. Accounts, sessions and password hashes live in the same
database (`lib/db/auth.ts`); there is no mail server, so password-reset links
are printed to the server log.

**The task library** is the Kazakhstan mathematics olympiad archive
(olympiads.bc-pf.org): 1818 problems from the regional, national and ГЖО
rounds (grades 6-11) and the APMO, Balkan, Junior Balkan and Silk Road papers,
imported by `scripts/import-kz-math.py` into migration `0033`. Each task carries
a grade range (`grade_min`/`grade_max`, migration `0032`), its source URL, and
LaTeX that `components/math-text.tsx` typesets on the server. No reference
solutions exist, so the grader judges reasoning on its own; the licence is
recorded as unknown until the terms are confirmed. The olympiad list is empty.

Physics adds 272 problems from the Kazakhstan national and regional rounds
(grades 9-11, theory tours, 2010-2025), migration `0035` via
`scripts/import-kz-physics.py`. Those papers exist only as PDFs, so each
problem was transcribed from the page images into text with LaTeX, and its
figures cropped into `public/tasks/physics/` and referenced from the statement
as `![…](/tasks/physics/…)` lines, which `components/math-text.tsx` renders.
Experimental tours are left out; data-processing tours whose measurements are
given in the statement are kept. Misprints in the source papers are kept as
printed.

`.env.local` is only needed for Sulu and grading (`OPENAI_API_KEY`); see
`.env.example`. `pnpm db:status` lists migrations, `pnpm db:migrate` applies pending ones
without starting the app, `pnpm db:reset` deletes the
database so the next start rebuilds it. Stop the app before either: one
process owns the data directory at a time, and that also means one server
process — the database is not shared across machines or instances.

Admins: `pnpm db:create-admin <login>` (app stopped) creates one with a random
32-character password and writes it to `.data/credentials-<login>.txt`, which
git ignores — move it somewhere safe and delete the file. Admins can promote
others from `/admin/users`. The development-only `test`/`test` admin is created
only while the database has no admin at all.

Students can contest a grade ("I think the check is wrong") or flag a mistake in
a statement from the task page. Reports land in `/admin/reports`, where an
admin answers them and, for a grading report, can re-score the attempt; the
answer shows on the student's task page, and topic statistics follow the new
score because they are derived from the attempts.

### Deploying

- **One Node server with a persistent disk.** `pnpm build && pnpm start`. The
  database is a directory (`OLYMPAI_DB_DIR`, default `.data/db`) owned by that
  one process: no serverless hosting (Vercel, Netlify functions), no second
  instance behind a load balancer, no ephemeral container filesystem.
- **HTTPS in front of it.** The session cookie is `Secure` in production, so
  over plain HTTP nobody can log in. A reverse proxy (Caddy, nginx) that
  forwards the original Host header keeps Server Actions' origin check happy.
- **Environment:** `OPENAI_API_KEY` (Sulu and grading do not work without
  it), `NEXT_PUBLIC_SITE_URL` (the public https URL), optionally
  `OLYMPAI_DB_DIR`.
- **Back up the data directory.** Stop the app, or copy a snapshot of the disk;
  copying files out from under a running Postgres can catch it mid-write.
- **Never run `pnpm dev` on the server.**
- No mail server: password-reset links are written to the server log, so
  resets go through whoever runs it. Sign-up is open and not email-verified.
- Login is throttled per account (10 failures per 15 minutes, in memory).

The hosted-Supabase setup this replaced is described in SUPABASE.md, kept for
the reasoning behind the RLS and grading design, which still applies. `pnpm typecheck` and
`pnpm lint` both have to pass; they are the only automated checks in the repo.

Checks that run against the live grader, model and database are in `.tools/`,
started through a loader that resolves the `@/` import alias:

```bash
node --import ./.tools/register.mjs .tools/live-mock.mjs [--keep] [Subject]
```

They write real rows and remove them afterwards; `--keep`, where a script
accepts it, leaves them in place. They read `.env.local` from an absolute path
on the machine they were written on, so they need adjusting before they run
anywhere else.

## How it fits together

**The dashboard answers one question: what should I do today.** It leads with
the same instruction `/learn` and `/tasks` give, from the same engine, so the
app cannot recommend one thing in one place and something else in another —
and when that instruction is to solve a problem it names the problem, because
sending someone to a filtered list to make a choice the recommender already
made is a step that decides nothing. Below it sit the two things that put the
answer in context: the rhythm being kept, and the target it is being kept for.
Attempts and accuracy are review rather than action and live on `/me`; streak
and total XP were already on screen inside the daily goal block.

**One plan, not two.** `/path` and `/learn` were the same journey ordered
twice — one by task difficulty, one by topic — and a student had to work out
which was the plan. The goal panel, the schedule and the week rhythm now sit on
`/learn`, and `/path` is the fourth route to redirect rather than the second
plan to maintain. Choosing a target is the first thing `/learn` asks, because
until it is answered there is nothing to order the topics by.

**Both study pages open with one instruction.** `/learn` and `/tasks` used to
be two catalogues side by side, each behind its own filters, neither answering
the question a student actually arrives with. They now lead with the same
sentence — read this, review these cards, solve this — chosen by
`lib/next-action.ts` from a fixed priority order, with the reason printed
underneath it. A trainer that says "do this" without saying why is one a
student overrules the moment they disagree.

**Material is narrowed to the subject being trained for.** The target comes
from `getGoal()` — the competition's subject, else the explicit choice, else
onboarding — and both pages show only that subject. Seven subjects for someone
preparing for one is not a library, it is noise. The narrowing is never silent:
every page says which subject it is showing and links to the rest, and a
`?topic=` link pointing outside the target widens the page rather than landing
on an empty filter.

**Every topic runs the same five steps.** Study the notes, check yourself on a
quiz marked the instant you answer, keep the facts with spaced-out cards, apply
it to a real olympiad problem, then sit a paper. The order is a recommendation
and nothing is locked: a student who already knows the topic can go straight to
the problems. Progress on each step is derived from the rows that produced it
(`lib/ladder.ts`, `lib/srs.ts`), and a step with no content behind it says
"nothing written yet" rather than showing 0%.

**Motion means something or it is not there.** Three gestures, defined once in
`app/globals.css` and used everywhere. A skeleton hands over to its content —
the placeholder leaves downward and fast, the real thing arrives upward and
more gently, and the arrival waits out the departure (`components/reveal.tsx`).
A title that appears on both sides of a navigation is the same object moving,
not two objects swapping: topic names and problem titles are paired with
`<ViewTransition name>`. Lists arrive in order, with a capped stagger, so a
catalogue of twenty does not take a second and a half to finish appearing. And
the navigation's active ring is one element with one view-transition name, so it
travels from the item you left to the item you opened rather than blinking out
in one place and reappearing in another.
Everything is off under `prefers-reduced-motion`, including the view
transitions themselves.

**Figures are stored as parameters, not as pictures.** A lesson block can carry
a diagram, and the diagram is a dozen numbers in `jsonb` drawn by fixed
components (`lib/figures.ts`, `components/learn/figure.tsx`). Asking a model for
a picture per page view would cost a call every time, produce a slightly
different drawing each time, and give nobody a moment to notice a mislabelled
axis. It also keeps generated markup out of the database, which is an XSS hole
a licence trigger cannot help with. The model is used once, at authoring time,
to emit the parameters; the strokes are drawn in order, because on a whiteboard
that sequence is half the explanation.

**XP is paid for evidence, never for a claim.** Solved problems and first-time
quiz answers earn it, because both are marked on the server and cannot be
asserted by a client. Card ratings and "mark as read" are the student's own
account of their own work and are written by the browser under RLS, so they move
the topic's progress and not the level — and the interface says so, on the daily
goal and on the deck, rather than leaving a student to infer it from a number
that did not move. A quiz question pays once, ever, for the same reason a
repeated solve pays a tenth.

**Grading is the product.** A submitted derivation goes to the model with the
task's reference solution, comes back as a verdict plus a score, and is written
to `task_attempts` — with the service role, because a row the browser can write
is a row the browser can score. Everything downstream (mastery, XP, the path,
readiness) is derived from those rows on read. Nothing is cached in a counter
that could drift away from the attempts that produced it.

**Two auth paths, on purpose.** Page rendering and route gating verify the JWT
locally with `getClaims()`; the one privileged write calls `getUser()`, which
asks the auth server. See the comment in `proxy.ts`.

**Reference content is shared, user content is not.** Subjects, topics and
tasks are identical for everyone and read once through a cross-request cache
(`lib/supabase/reference.ts`). Attempts, chats and goals are per-user and go
through RLS.

**Provenance travels with content.** Every task, lesson, quiz question,
resource and shared card records where it came from and what may be done with
it; a database trigger refuses material whose licence is `unknown`. A card a
student writes for themselves is the one exception, and it is filed as
`original`: it is theirs, and nobody else can see it.

**Answer keys are not just unselected, they are ungranted.** `authenticated`
holds no column privilege on `tasks.official_solution`,
`quiz_questions.correct_index` or `quiz_questions.explanation`, so the answer
key cannot be fetched over the REST API with a publishable key either. The
grader and the quiz marker read those columns with the service role. Adding a
column to either table means adding it to the grant in migration `0022` before
the browser can see it.

### Where things live

| Concern | Path |
| --- | --- |
| The one thing to do next | `lib/next-action.ts` |
| Motion vocabulary, view transitions | `app/globals.css` |
| Skeleton-to-content handover | `components/reveal.tsx` |
| Diagram specs and their validation | `lib/figures.ts` |
| Drawing them | `components/learn/figure.tsx` |
| The five steps, and where a student stands | `lib/ladder.ts` |
| Spaced repetition | `lib/srs.ts` |
| Study reads (lessons, quizzes, decks) | `lib/supabase/study.ts` |
| Quiz marking, card reviews, own cards | `app/(app)/learn/actions.ts` |
| Grading | `app/(app)/tasks/actions.ts` → `lib/sulu/grade.ts` |
| Coach streaming | `app/api/sulu/route.ts` → `lib/sulu/provider.ts` |
| Prompts, answer redaction | `lib/sulu/prompt.ts`, `lib/sulu/redact.ts` |
| XP, levels | `lib/xp.ts` |
| Path through a subject | `lib/path.ts` |
| Deadline, workload, readiness | `lib/goal.ts` |
| Mock composition and scoring | `lib/mock.ts` |
| Licensing | `lib/licence.ts` |
| Database, migrations, query layer | `lib/db/` (`index.ts`, `query.ts`), `supabase/migrations/` |
| Accounts and sessions | `lib/db/auth.ts`, `lib/db/password.ts` |

## Screens

`/` marketing · `/login` `/signup` `/reset-password` · `/onboarding` ·
`/dashboard` · `/learn` `/learn/[topic]` and its `/lesson` `/quiz` `/cards` ·
`/tasks` `/tasks/[slug]` · `/mock` `/mock/[id]` · `/sulu-ai` · `/olympiads` ·
`/me` · `/settings` `/settings/material`

`/profile`, `/progress`, `/study-plan` and `/path` redirect: they were merged
into `/me` and `/learn`.

## Things worth knowing before changing anything

- **Never edit an applied migration.** Two renames in this repo were done as
  new migrations for exactly this reason (`0010`, `0014`).
- **A worked example never solves a task from the library.** The mechanics
  lesson pulls two blocks across a table rather than working the Atwood machine,
  because `two-masses-pulley` is a graded five-star problem. Teaching the method
  is the point; handing over the answer would make the grader a formality.
- **The next action is always about the target subject**, never about what is
  on screen. Opening the full catalogue to look something up must not change
  what the app says you ought to be doing.
- **Reference content is read once per request** (`lib/supabase/reference.ts`),
  not cached across requests: the database is in-process, so a fresh read costs
  less than the cache did, and new content appears immediately.
- **`lib/supabase/*` now talks to the local database.** The names stayed so
  every query in the app kept compiling against the generated types;
  `lib/db/query.ts` implements the part of the Supabase query builder in use
  and runs each statement as `anon`, `authenticated` or `service_role`, so RLS
  is enforced as before. A filter it does not support throws rather than
  silently matching everything.
- **`<ViewTransition>` comes from the React build Next vendors**, not from the
  installed `react` package, and `@types/react` does not declare it yet — hence
  `types/react-view-transition.d.ts`. Delete that file when the types catch up.
- **A view transition is skipped while the document is hidden.** Worth knowing
  before concluding that one is broken.
- **Never animate `transform` on an SVG element that carries a `transform`
  attribute.** The CSS property wins, and every rotated axis label silently
  loses its rotation and leaves the canvas. `.wb-appear` animates opacity only,
  for this reason.
- **Adding a protected route means two edits to `proxy.ts`** — the prefix list
  and the `matcher` at the bottom. Miss the second and the middleware never runs
  for that path, so the gate silently does nothing.
- **The catalogue carries no competition dates.** Sittings move every year; the
  student supplies the target date. Adding dates would be inventing them.
- **Empty means empty.** Several screens ship with nothing in them
  (`competitions`, `resources`). That is deliberate — placeholder content that
  reads as real is worse than an empty state.
- `.env.local` holds four secrets and is gitignored. `SUPABASE_DB_URL` is only
  used by the migration runner.

## Known gaps

- No automated tests. Pure logic (`lib/xp.ts`, `lib/mock.ts`, `lib/goal.ts`,
  `lib/licence.ts`, `lib/path.ts`, `lib/ladder.ts`, `lib/srs.ts`) is written to
  be testable and has been checked by hand; nothing runs in CI.
- The task library is 23 problems written for this project. Real olympiad
  material has not been imported, and there is no ingestion pipeline yet.
  Candidate sources and what each one's licence allows are listed in
  `docs/content-sources.md`.
- Every topic has study content, and only just: one lesson per topic — 21
  lessons, 126 quiz questions, 192 flashcards and 9 figures across all seven
  subjects. Enough to exercise the ladder end to end, not yet a course.
- Four subjects have two problems each, which is below the three a mock paper
  needs, so `/mock` cannot offer them at all.
- Grading, the mock paper end to end and the coach stream have been exercised
  against the live database and the live model; the screens behind the login
  have not been walked by hand.
