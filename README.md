# OlympAI

A training space for academic olympiads: a study ladder that takes a topic from
notes to a graded derivation, an AI coach, a route through a chosen subject
toward a chosen competition, and timed mock papers that measure the student's
level.

Next.js 16 (App Router, Turbopack) · React 19 · Supabase (Postgres, Auth, RLS) ·
Tailwind v4 · OpenAI for grading and coaching.

## Running it

```bash
pnpm install
cp .env.example .env.local   # then fill it in — see SUPABASE.md
pnpm db:migrate              # applies anything pending
pnpm dev
```

`pnpm db:status` lists migrations that have not run. `pnpm typecheck` and
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

Every screen can also be looked at without an account: `proxy.ts` lets
everything through when the Supabase variables are absent, so a server started
with them empty renders the whole app in its empty states. The
`olympai-no-auth` entry in `.claude/launch.json` does exactly that on port 3100.
Next allows only one `next dev` per project, so stop the main server first.

## How it fits together

**The dashboard answers one question: what should I do today.** It leads with
the same instruction `/learn` and `/tasks` give, from the same engine, so the
app cannot recommend one thing in one place and something else in another —
and when that instruction is to solve a problem it names the problem, because
sending someone to a filtered list to make a choice the recommender already
made is a step that decides nothing. Then it widens one step at a time: four
figures in a row (today, level, streak, days left), the day's own score, the
shape of the subject, and the distance to the target. Attempts and accuracy
are review rather than action and live on `/me`.

It used to explain itself as it went — where XP comes from, what a streak is
for, what the order of the steps means. Every one of those sentences was true
and none of them was news after the first week. They are on `/method` now,
which is the page for rules; the dashboard is the page for today.

**Two subjects, and a real syllabus inside each.** The other five are hidden
rather than deleted (`subjects.active`): they carry three topics and three
lessons apiece that somebody wrote, and "for now" is a word that means this
comes back. `getReference` filters on the flag and drops their topics and
problems with them, so one place decides what exists.

Inside mathematics and physics the sections are the syllabus rather than four
headings. Filing a functional equation under "Algebra" tells a student nothing
about what to practise, and the topic is what the ladder, the recommender and
the skills radar all read — a problem in the wrong section is a problem nobody
is sent to. New sections carry no lesson yet and say so, which makes the gap
visible instead of hiding it inside a heading broad enough to swallow it.

**The plan is a page now.** `planForGoal` has produced dated milestones since
the goal was built and they went into a variable nobody read; a plan that
exists only inside a function is not a plan the student has. `/plan` answers
three questions in the order they get asked: how long is left, what to do this
week, and what the shape of the rest is. The last is what makes the first two
mean anything — seeing that geometry is four weeks away is what turns this
week's twelve problems into a step rather than a quota.

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

**Every topic runs the same four steps.** Study the notes, check yourself on a
quiz marked the instant you answer, apply it to a real olympiad problem, then
sit a paper. Flashcards used to be the third of five, which put a deck of
definitions between reading a topic and using it, and made the app's daily
instruction "review nine cards" more often than "solve something". The deck is
still there, still scheduled, still linked from the topic — it is beside the
ladder rather than on it, it no longer counts towards a topic's progress, and
it is never what the app tells you to do next. The order is a recommendation
and nothing is locked: a student who already knows the topic can go straight to
the problems. Progress on each step is derived from the rows that produced it
(`lib/ladder.ts`, `lib/srs.ts`), and a step with no content behind it says
"nothing written yet" rather than showing 0%.

**The day is scored out of twenty-five, and the bar is more than fifteen.**
Five axes — theory, solving, head, sleep, taken — five points each, recorded
once a day and scored by `lib/day-state.ts`.

The first set counted hours, focus and company. This one splits the axis that
was doing two jobs — reading and solving are different work and go wrong in
different ways, and a week of each with none of the other both scored well and
were both failures — and replaces "was the day split" with "how much did the
rest of life take", which is a question with an answer rather than a judgement.
`Taken` counts downwards. Nothing about a school day is the student's fault,
which is exactly why it belongs on the diagram: a week that keeps scoring two
there needs a conversation, not more effort.

Solving is the one axis the app can partly see. Most of it happens on paper, so
the student's own figure is what counts — but the app will not score someone
lower than the work it watched them do, which is what a floor rather than an
override means. Zero on `head` means the question was not answered, not that
the day went badly; a day nobody reported scores nothing at all, because
otherwise an untouched day collected five points for being free.

They are interchangeable on purpose, and that is the whole reason the panel
exists. Short of the bar by five, you can solve another problem — or you can go
to bed, which is worth the same five and is usually the one you were not going
to spend. The card says which of the two is cheaper tonight rather than leaving
it to be worked out from a radar.

The rules come from one coach's method and they are written out on `/method`,
because several of them contradict what a training app usually says. The load
changes with the date: two to three hours a day as a floor, ten to twelve in
the last fortnight, lights out by 22:30 from two weeks out so the night before
the paper is one that has been rehearsed. In the last two days the scoring
inverts — hours and graded work earn points for being *low*, because two days
of rest cost nothing that could have been learnt in them. Focus and people are
five or nothing rather than a fraction: half marks for a half-split day would
be the app agreeing that a startup on the side is a manageable proportion of an
olympiad season, which is the thing the method says it is not.

The date is the student's own (`profiles.target_date`), like every date in this
app — see the note on olympiad dates below.

**Motion means something or it is not there**, and mostly it is not there. The
first version of this section moved the page on every click — a slide out, a
slide in, a stagger inside it — and the result read as jerky rather than
smooth, because a transition is time the student waits before they can act.
What is left answers a question they would otherwise have to ask, and nothing
stands between a click and the thing it opened.

*Has it loaded?* A skeleton hands over to its content — the placeholder leaves
downward and fast, the real thing arrives upward and more gently, and the
arrival waits out the departure (`components/reveal.tsx`). Every route that has
to fetch before it can render anything has a `loading.tsx` drawn to the shape of
that page (`components/skeletons.tsx`): same column width, same header, the same
cards in the same places, with whatever is fixed text on the real page — "Recall",
"Back to problems" — as real text there too, so the handover moves nothing but
the content. There used to be one loading screen for every route, shaped like
the dashboard, which turned the topic page, the lesson and the quiz into a flash
of the wrong layout.

*Did my click register?* A navigation that has to wait on the server draws a
thin bar across the top (`components/navigation-progress.tsx`), and only after
120ms: a click that is already fast should flash nothing at all.

*Is this the same thing I clicked?* A title on both sides of a navigation is one
object moving rather than two objects swapping: topic names and problem titles
are paired with `<ViewTransition name>`, and the navigation's active ring is one
element with one name, so it travels from the item you left to the item you
opened. The page around them does not move at all.

*How far along am I?* Every measure fills from empty the first time it is seen
(`components/meter.tsx`), so the eye lands on the length of the bar, which is
the one thing the bar is for. Lists arrive in order with a capped stagger, so a
catalogue of twenty does not take a second and a half to finish appearing.

*What just happened?* A verdict, a hint and a menu unfold from the control that
asked for them, and Sulu's reply is three dots until there are words and a caret
while there are more coming. A solved problem used to fire confetti over the
feedback; the celebration is now that the verdict is scrolled into view, which
is what someone who has just solved something wants next.

Everything is off under `prefers-reduced-motion`, including the view
transitions themselves.

**A Telegram bot asks, so the dashboard does not have to.** Five short
questions once a day, in the evening, and the answers land in the same
`day_states` row the form on the dashboard writes (`scripts/telegram-bot.mjs`).
Long polling rather than a webhook: this app runs on a laptop and has no public
address, so the bot reaches out to Telegram instead of waiting to be called,
which also means no tunnel and no deployment.

The link is a Telegram username, asked for at sign-up. They are unique across
Telegram and cannot be held by two people at once, so a message from @someone
is from the account that typed @someone. That is not a security boundary and is
not used as one — the bot writes self-reported days, which pay no XP and unlock
nothing. Anything that mattered goes through the session, like everything else.

The bot's token lives in `.env.local` beside the other secrets and nowhere
else. It is not a setting; it is the whole of the bot's identity.

**The interface speaks two languages.** Russian and English, chosen per
account and kept in a cookie (`lib/i18n/`). There is no `/ru` prefix on the
routes: a locale in the path means every link has to carry it, every redirect
has to rebuild it, and a shared link decides the reader's language for them.
The cookie is read on the server, so the first paint is already right — no
flash of English, no client round trip. A first visit with no cookie is matched
against `Accept-Language`.

Only the two-letter code crosses into the browser, never the dictionary: half
its values are functions that take a count, and props have to be serialisable.
Client components look the strings up themselves from the same module the
server used, so the plural rules live in one place. Russian needs three plural
forms picked by the last digit, with the teens as an exception — 21 день, 22
дня, 25 дней, but 11 дней — and getting that wrong is the clearest sign that an
interface was translated rather than written (`lib/i18n/plural.ts`).

The rule for what is translated is *taxonomy, not content*. The seven subject
names, the five competition levels, the regions, the four rating buttons: fixed
short lists that name a part of the interface, and they are translated. Lessons,
problem statements, topic names and quiz questions are content, and they stay in
the language they were written in — which for olympiad material is the language
you will sit the paper in anyway. The olympiad write-ups are the exception, and
they are written twice, because a catalogue is not much use in a language you
are not reading the interface in.

Doing this turned up a bug that had nothing to do with language. Several
filters stored their own caption as their value — selecting "Hard" compared the
string "Hard" against a string the same function had produced — which is a
filter that silently matches nothing the moment the caption changes. Keys and
captions are now separate everywhere (`difficultyKey` vs `difficultyLabel`).

**Blue, and the neutral it sits on.** Two families and nothing else: one blue
that carries every action, and the surface under it — near-black with a navy
cast in the dark theme, white in the light one, with panels a step off the page
rather than boxes drawn on it. Tinted surfaces are that same blue drained
almost to grey, so the only saturated thing on a screen is the thing to press.
An earlier version of this section was ink and amber, with a hairline grid and
a soft glow painted under the page; both read as texture in a screenshot and as
noise on a page being worked through.

Two colours are held apart from the brand (`--success`, `--warning` in
`app/globals.css`): a muted green for something settled, amber for something to
look at. They are rationed to those two jobs, because a page where five things
are coloured has nothing left to point with.

The blue is an ink blue: darker, and a few degrees towards violet, than the one
before it, which sat within four degrees of the blue Khan Academy wears. It is
the colour the jury writes in — the marks, notes and points of a protocol —
while the student's own lines stay in the text colour. Every text token clears
4.5:1 on the surfaces it is set on, in both themes: `node .tools/contrast.mjs`
reads the tokens out of `app/globals.css` and says which pair does not. That check is why the
amber and green were darkened a step in the light theme, and why words on the
blue are navy rather than white in the dark one.

**Where you stand, as one shape.** The dashboard's skills radar
(`components/charts.tsx`) plots every topic in the target subject on a single
figure: where the outline caves in is where the next session goes. It replaced
a column of bars that answered the same question one topic at a time, which is
a thing nobody reads to the bottom of. Under three topics there is no shape to
draw, so the bars are what is shown instead.

It is built from the ladder (`getSkillShape`), not from graded attempts. Those
only exist once a student has submitted a derivation, so an account three
lessons and two quizzes in had no topics at all and the chart was simply
absent — at exactly the point in a first week where watching an outline start
to fill is the whole of the reward. A topic at nought is drawn at nought: that
is a fact about the plan, and the collapsed side of the shape is the point.

**Every topic ends with somewhere else to go.** The lesson is this project's
own, and it is one lesson; `Read further` on a topic page lists the standard
open reference for that subject — OpenStax, cp-algorithms, Project Euler — with
its licence and credit rendered from the row rather than left to whoever added
it. Only sources whose own licence permits it are listed, which is why
geography and linguistics have none: nothing open exists at that level yet, and
an empty section is more honest than a link we cannot stand behind.

**Mathematics is rendered as mathematics.** Statements arrive with LaTeX in
them — `\(x^2-2\)` — and a maths product that prints that literally is not one.
`components/math-text.tsx` splits a statement on the delimiters and renders
each fragment with KaTeX on the server, so a problem is complete in the first
flush and costs the browser no script at all. A malformed formula in one
imported problem prints itself in red rather than taking down the page the
other four hundred are on.

**The olympiad catalogue answers "is this one mine".** Fifty-two contests, and
each one carries what a student actually asks before committing a season to it:
what the papers look like, who may enter, how you get there, when it was
founded, and where the official page is (`/olympiads/[slug]`). The list is
searchable across all of it — "team" finds the ones entered in teams, "лаборатор"
finds EUSO — because past forty rows scrolling stops being a way of finding
something.

Still no dates. The rule that kept them out has not changed: the sitting moves
every year and the organiser's page is the only trustworthy source, so every
entry links to it and the student's own target date lives on their goal. The
same rule decides what does go in — the shape of the papers, the age limit, the
founding year, all of which stay put — and anything that was not solid is null
rather than guessed. A blank line in a detail panel costs a student nothing; a
confident wrong one costs them a deadline.

**Words in one face, figures in another.** Headings, prose, labels and
controls are Manrope — a geometric grotesque with a tall x-height, which is
what keeps a dense screen readable at 13px. The whole interface was
monospaced for a while, on the argument that this is a tool for people who
spend their day in one; the argument holds for a column of numbers and falls
apart over a paragraph, where a fixed advance turns every line into a row of
gaps.

So the mono (IBM Plex Mono) stayed for everything that is a figure rather than
a word: scores, counts, dates, the line numbers of a marked solution. Numbers in
a proportional face shift under their own labels when they change, and a
dashboard is mostly numbers that change. The labels that name a panel used to
be small spaced mono capitals; they are Manrope in the words' own case now
(`labelClass`), because that label is the one every generated dashboard wears.
The sizes are roles rather than numbers — page, block, reading, ui, caption,
score, as `text-*` utilities in `app/globals.css` — so a problem statement and a
lesson cannot drift apart. Two tokens point at the same
mono and two at the same sans (`--font-sans`, `--font-display`,
`--font-mono`, `--font-reading` in `app/globals.css`), so the long-prose places
stay addressable if that stops being true.

Everything sits half a step heavier than the usual defaults: body text at 500
rather than 400, headings bold, panel labels semibold. Manrope is a variable
face, so this costs nothing to download. At 400 a screen of 13px labels reads
thin against a near-black panel, which is the weight most of this interface is
actually made of.

**Unsent work survives, and the keyboard is enough.** A derivation is kept in
the tab's storage as it is typed (`lib/session-draft.ts`), the same way a mock
paper's answers are: the panel beside the editor invites the student back to
the notes mid-problem, and taking that offer used to throw away everything they
had written. Quiz answers are number keys and Enter, a card turns on space and
is rated 1–4, and a solution submits with ⌘/Ctrl+Enter — each hint printed
next to the control it belongs to, and hidden on a touch screen where there is
no keyboard to press. Rating a card moves the deck on at once and saves in the
background, because waiting for the round trip put half a second between the
judgement and the next card; a rating that fails to save says so and leaves the
card due, which is the harmless failure.

**Submitting a paper asks first.** It is the one irreversible thing a student
can do here, and the question it asks is the one that matters: how many answers
are still blank.

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
task's reference solution, its lines numbered, and comes back as a protocol: a
verdict, points out of seven, one sentence from the jury, a mark on every line
(holds, needs a reason, error, strong idea), the marking scheme and the first
line where the argument breaks (`lib/sulu/grade.ts`, `lib/protocol.ts`). A
verdict that disagrees with its own margin is corrected — a solution with a
wrong step in it is not complete — and every word passes the answer-secrecy
guard, margin notes included. It is written to `task_attempts` — with the
service role, because a row the browser can write is a row the browser can
score. `score` is still written, as the points scaled to a hundred, because
everything downstream (mastery, XP, the path, readiness) reads it and derives
from those rows on read. Nothing is cached in a counter that could drift away
from the attempts that produced it.

The protocol replaces the editor the moment it is graded and keeps an address
of its own, `/tasks/[slug]/attempts/[id]`, reached again from the list of
attempts beside the editor. Attempts graded before it have no marks and get
none; their points are derived from the old score and say so.
`.tools/live-protocol.mjs` breaks one line in real reference solutions and
checks that the margin finds it: 13 of 15 on the run that shipped it, no error
marks on the untouched ones.

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

### The order problems are met in

**A route through a subject is a syllabus, not a sort.** `topics.position`
holds it — kinematics before dynamics before fields, algebra before number
theory before geometry. It used to be the mean difficulty of each topic's
problems, which made the curriculum a property of the last import: fourteen
invariants problems averaging 2.79 put them ahead of geometry, and every batch
reshuffled the subject. `/learn`, `/plan` and `/tasks` all sort by the same
column, so the three pages cannot disagree about what comes next.

**A topic asks for a number of problems, not for all of them.** Algebra holds
659; "clear algebra" is a track nobody finishes and a student who never reaches
geometry. The default is `DEFAULT_TARGET` in `lib/path.ts` — eight, a fortnight
of evenings — and it is what makes the plan's arithmetic survive a library this
size. Readiness, the weekly pace and the milestones are all measured against
the route's totals now, not the library's.

**A section with one problem is not a section.** `MIN_STAGE` in `lib/path.ts`
is three. Statics holds one problem and Conservation Laws holds one; as stages
they cleared on the first solve, which made the gate after them meaningless,
and took a week of the plan each, which made the plan meaningless. They stay
visible and solvable — `path.thin` carries them to the screen — and stop
pretending to be a stage of a course.

**The weekly pace is the student's rhythm, not the deadline's arithmetic.** It
used to be `remaining / weeksLeft`, so the number was whatever the date
demanded and the "unrealistic" band was the app disagreeing with a figure it
had invented. `perWeekFor` reads the rhythm chosen at onboarding — three, five
or ten problems a week — and the plan says whether the route fits before the
date. That is the question a plan exists to answer.

**A teacher can replace both for their class.** `class_tracks` holds a row per
topic the teacher has moved or re-targeted; everything they have not touched
keeps following the syllabus, including when the syllabus changes. The editor
is arrows and a number box rather than drag and drop, which works on a phone,
with a keyboard, and with a screen reader.

**`/tasks` opens on the track, not on the catalogue.** The section the student
is on, the problems it asks for in easiest-first order, then what is next and
what is behind. The filterable list of all 1672 is `?list=1` — "what is there"
is a different question from "what now", and only one of them is worth
answering unprompted.

### Two kinds of account

**A teacher does not practise, they watch.** `profiles.role` is `student` or
`teacher`, chosen once at sign-up and not editable from inside the app. A
teacher's profile is created with onboarding already complete — grade, level
and "which subject are you training for" are a student's questions — and
`/dashboard` redirects them to `/class`. Their navigation holds the class, the
subjects and the problem bank, and nothing that measures their own practice.

**A class is a roster and a code.** Six unambiguous characters
(no I, L, O, 0 or 1, because the code gets read out across a room), a link at
`/join/<code>`, and `rotateJoinCode` for when the link has travelled too far.
The invite page is public — the person opening it usually has no account yet —
and carries the code through sign-up and onboarding on the query string, so a
new student lands back on the invite with a Join button rather than on a
dashboard with no idea what they clicked.

**What a teacher may see is decided in policies, not in pages.** Migration 43
adds select policies on `task_attempts`, `user_progress`, `quiz_attempts`,
`lesson_views`, `mock_tests` and `profiles`, each guarded by
`public.teaches(user_id)` — a security-definer function that answers "is the
caller the teacher of this student". The roster is a plain query under RLS: a
teacher who does not teach somebody gets no rows, from the database, rather
than from an `if` somebody could forget to write.

Three things are deliberately not in that list and should stay out:

| Not visible | Why |
| --- | --- |
| `day_states` | Sleep, state of mind, how much school took. Migration 32 promises the student nobody else can read it. |
| `chat_sessions`, `chat_messages` | What they asked when they were stuck. A student read over the shoulder stops asking. |
| `flashcards`, `flashcard_reviews` | Their own cards, written for nobody. |

The product says so on the class page rather than leaving it implied.

**Joining is written with the service role**, like a grade is, and for the same
kind of reason: the authority is the code, and a row-level policy cannot see
it. `authenticated` has no insert on `class_members` at all, so knowing a class
id is not enough — only the six characters are.
`.tools/live-class.mjs` walks all of this against the live database with real
sessions: 24 checks, including the three tables above coming back empty.

### Where things live

| Concern | Path |
| --- | --- |
| The one thing to do next | `lib/next-action.ts` |
| Languages, cookie, plural rules | `lib/i18n/` |
| The strings themselves | `lib/i18n/dictionaries/{en,ru}.ts` |
| Olympiad catalogue and write-ups | `supabase/migrations/…_olympiad_detail.sql` |
| Searching the catalogue | `components/competitions/olympiad-browser.tsx` |
| Rendering mathematics | `components/math-text.tsx` |
| Importing the olympiad archives | `.tools/import-bcpf.mjs`, `.tools/import-bcpf-physics.mjs` |
| Importing the daryn.kz papers, with solutions | `.tools/import-daryn.mjs`, `.tools/import-zhmb.mjs` |
| Reading one of those papers | `.tools/daryn-parse.mjs` |
| Pulling figures out of a PDF | `.tools/pdf-figures.mjs` |
| Task figures themselves | `public/figures/` |
| The day's five axes, and the phases | `lib/day-state.ts` |
| The Telegram bot, deployed | `app/api/telegram/route.ts`, `lib/telegram.ts` |
| The same bot on a laptop | `scripts/telegram-bot.mjs` |
| The evening ask | `app/api/telegram/ask/route.ts`, `vercel.json` |
| Connecting it | `docs/telegram.md` |
| Reading and writing a day | `lib/supabase/day.ts`, `app/(app)/dashboard/actions.ts` |
| The day's panel and its check-in | `components/day/` |
| The method, written out | `app/(app)/method/page.tsx` |
| Palette, type scale, page texture | `app/globals.css` |
| The fonts themselves | `app/layout.tsx` |
| Motion vocabulary, view transitions | `app/globals.css` |
| Skeleton-to-content handover | `components/reveal.tsx` |
| Route skeletons | `components/skeletons.tsx`, each `loading.tsx` |
| Waiting on the server | `components/navigation-progress.tsx` |
| Bars and rings that fill | `components/meter.tsx` |
| Charts: skills radar, day radar, trend | `components/charts.tsx` |
| Readings attached to a topic | `supabase/migrations/…_topic_reading.sql` |
| Theme, and the circle it spreads from | `lib/theme.ts` |
| Diagram specs and their validation | `lib/figures.ts` |
| Drawing them | `components/learn/figure.tsx` |
| The four steps, and where a student stands | `lib/ladder.ts` |
| Spaced repetition | `lib/srs.ts` |
| Study reads (lessons, quizzes, decks) | `lib/supabase/study.ts` |
| Quiz marking, card reviews, own cards | `app/(app)/learn/actions.ts` |
| Grading | `app/(app)/tasks/actions.ts` → `lib/sulu/grade.ts` |
| Coach streaming | `app/api/sulu/route.ts` → `lib/sulu/provider.ts` |
| Prompts, answer redaction | `lib/sulu/prompt.ts`, `lib/sulu/redact.ts` |
| XP, levels | `lib/xp.ts` |
| Path through a subject | `lib/path.ts` |
| The syllabus order, and a class's own | `supabase/migrations/…_track_order.sql`, `lib/supabase/track.ts` |
| The track a student works down | `components/problems/track.tsx` |
| Ordering it for a class | `components/class/track-editor.tsx` |
| The plan, as a page | `app/(app)/plan/page.tsx` |
| Filing problems into sections | `.tools/reclassify.mjs` |
| Deadline, workload, readiness | `lib/goal.ts` |
| Classes, rosters, what a teacher sees | `lib/supabase/classes.ts` |
| Creating, inviting, joining, leaving | `app/(app)/class/actions.ts` |
| The roster and one student in it | `app/(app)/class/` |
| Who sees which navigation | `components/rail-links.tsx` |
| Deploying | `docs/deploy.md` |
| Mock composition and scoring | `lib/mock.ts` |
| Licensing | `lib/licence.ts` |
| Migrations + runner | `supabase/migrations/`, `scripts/migrate.mjs` |

## Screens

`/` marketing · `/login` `/signup` `/reset-password` · `/onboarding` ·
`/dashboard` · `/method` · `/learn` `/learn/[topic]` and its `/lesson` `/quiz` `/cards` ·
`/tasks` `/tasks/[slug]` · `/mock` `/mock/[id]` · `/sulu-ai` ·
`/olympiads` `/olympiads/[slug]` · `/plan` ·
`/class` `/class/[id]` `/class/[id]/[studentId]` · `/join/[code]` ·
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
- **PostgREST stops at a thousand rows, silently.** Not an error — a complete
  response that happens to be short, with `data.length` the only sign. The
  catalogue passed a thousand in September and the app went on showing 1000 of
  1779: the rest were missing from the bank, from every route through a
  subject, from the mock composer, and from their own URLs, while the counts
  said otherwise because they were SQL counts. `lib/supabase/reference.ts` now
  pages with `allRows` until a page comes back short. **Any new read of a table
  that can exceed a thousand rows needs the same treatment** — `getAttempts`
  in `lib/supabase/queries.ts` is the next one that will hit it, at a thousand
  attempts by one student.
- **Reference content is cached across requests for a minute**
  (`lib/supabase/reference.ts`). A stale entry survives a server restart and
  deleting `.next/cache`, so if content added by a migration has to appear
  immediately, bump the version suffix in the cache key.
- **`<ViewTransition>` comes from the React build Next vendors**, not from the
  installed `react` package. Its types — and `addTransitionType`'s — now arrive
  through `@types/react`'s canary channel, which `next/dist/types.d.ts` already
  references, so the hand-written declaration this repo carried is gone.
- **An enter animation belongs to the outermost `<ViewTransition>` that was
  inserted**, and to no boundary inside it. Wrapping a whole page in one is
  therefore enough to animate the page — and was tried, and taken out again:
  moving the page on every navigation reads as jerky, not smooth, especially in
  `next dev`, where the route is compiled on first visit and React cancels the
  transition mid-flight (`flushSync ... skip the View Transition`). Judge motion
  on a build, not on the dev server.
- **A view transition is skipped while the document is hidden.** Worth knowing
  before concluding that one is broken.
- **Never animate `transform` on an SVG element that carries a `transform`
  attribute.** The CSS property wins, and every rotated axis label silently
  loses its rotation and leaves the canvas. `.wb-appear` animates opacity only,
  for this reason.
- **Adding a protected route means two edits to `proxy.ts`** — the prefix list
  and the `matcher` at the bottom. Miss the second and the middleware never runs
  for that path, so the gate silently does nothing.
- **The olympiad catalogue is Kazakhstan only** (migration 46). Fifty-two
  entries, one of them Kazakh, is a list about somebody else. The other
  forty-seven are hidden rather than deleted — `competitions.active`, the same
  flag pattern as hidden subjects. What is left is the four stages of the
  republican olympiad, national team selection, and the Zhautykov olympiad,
  each checked against daryn.kz or izho.kz.
- **A mock can be a real sitting.** `tasks.paper` names the paper a problem was
  written for, and `realPapers()` groups them: twelve whole rounds of the
  Kazakh olympiad, the problems that were set, in the order they were printed,
  for the time that was given. `composeMock` still builds one from the library
  when that is what somebody wants, but a composed paper is an imitation and
  this is not.
- **The catalogue carries no competition dates.** Sittings move every year; the
  student supplies the target date. Adding dates would be inventing them.
- **Empty means empty.** Several screens ship with nothing in them
  (`competitions`, `resources`). That is deliberate — placeholder content that
  reads as real is worse than an empty state.
- **A policy that reads the table it protects recurses.** The class policies go
  through `public.is_teacher()`, `owns_class()`, `in_class()` and `teaches()`,
  which are `security definer` for exactly that reason. Each takes the caller's
  own `auth.uid()` and returns a boolean about the caller, so none of them can
  be asked about anybody else.
- **A student cannot read their teacher's profile**, and should not be able to:
  it would mean opening a whole profile row to every student taught. The one
  field they need — the name of the person who can see their work — is read
  with the service role in `getMemberships`.
- **`.vercelignore` patterns need a leading slash.** They match at any depth
  otherwise, the way `.gitignore` does: a bare `supabase/` also matched
  `lib/supabase/` and two deploys failed on a missing module. See
  `docs/deploy.md`.
- `.env.local` holds four secrets and is gitignored. `SUPABASE_DB_URL` is only
  used by the migration runner, and `TELEGRAM_BOT_TOKEN` only by the bot — both
  stay off the deployed server.

## Known gaps

- No automated tests. Pure logic (`lib/xp.ts`, `lib/mock.ts`, `lib/goal.ts`,
  `lib/licence.ts`, `lib/path.ts`, `lib/ladder.ts`, `lib/srs.ts`) is written to
  be testable and has been checked by hand; nothing runs in CI.
- **The library is 1672 problems and 76 solutions.** Mathematics 1491 (486
  oblast, 926 republican, 76 international); physics 167 (62 oblast, 99
  republican, none international). 1649 of them carry `licence: 'unknown'` —
  see below. The 159 OpenStax textbook exercises were deleted on 1 November
  2026: they were not olympiad material and read badly next to it. A copy of
  the rows is in `.tools/out/openstax-tasks-backup.json` on the machine that
  deleted them. The sources and what each one allows are in
  `docs/content-sources.md`.
- **Solutions are the thin part, not problems.** 3 of the mathematics
  problems have a reference solution and 59 of the physics ones; the rest are
  statements alone. The grader is honest about it (`buildGraderInstructions`
  says when there is no reference) and marks better when there is one, which is
  why the daryn.kz papers — published with their marking schemes — are worth
  more per problem than a bigger statement-only archive.
- **Study content is the thinnest part of all.** Three lessons in mathematics
  and three in physics, against 11 and 13 sections: 18 quiz questions and ~26
  cards per subject. Eighteen sections have problems and nothing to read first,
  so for most of the syllabus the ladder starts at its third rung.
- Two sections hold nothing at all: Graphs, and Molecular Physics.
- Grading, the mock paper end to end and the coach stream have been exercised
  against the live database and the live model. The screens themselves have been
  walked — every route, both themes, desktop and phone — but against stand-in
  rows, not against this account's own data: signing in is the student's to do.
  What that leaves unchecked is content, not behaviour.
