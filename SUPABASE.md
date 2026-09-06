# Supabase setup

OlympAI uses Supabase Auth, Postgres and Row Level Security.

## 1. Create a project

Create a project at https://supabase.com/dashboard, then copy `.env.example` to
`.env.local` and fill it in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SECRET_KEY=your-service-role-key
OPENAI_API_KEY=your-server-only-openai-api-key
SULU_MODEL=gpt-5-mini
```

`NEXT_PUBLIC_*` values are shipped to the browser by design. `SUPABASE_SECRET_KEY`
and `OPENAI_API_KEY` are server-only: never prefix them with `NEXT_PUBLIC_`, and
never import `lib/supabase/admin.ts`, `lib/supabase/secret-env.ts` or `lib/sulu/*`
from a `'use client'` file. Those modules import `server-only`, so the build fails
if you do.

In practice nothing in the browser talks to Supabase at all. Every read goes
through a server component, every write through a server action or the API
route, so neither key reaches the client bundle — verify with
`grep -r sb_ .next/static` after a build. There is deliberately no
`createBrowserClient` helper: browser-side writes are how the self-grading hole
and the unvalidated onboarding profile got in. Add one back only with a reason.

### Why a service-role key is required

Grades are written with the service role, not with the caller's session.

`task_attempts` carries `is_correct` and `score`. RLS can check *who* writes a
row, but not *what* they write, so an insert policy scoped to `auth.uid()` still
let any signed-in user POST a perfect attempt straight from the browser console
without ever calling the grader — and the `record_task_attempt_progress` trigger
then folded that into their mastery figures. `authenticated` therefore has
`select` on `task_attempts` and nothing else; the graded row is inserted by
`submitTaskAttempt` after the model has answered, with `user_id` taken from a
verified `getUser()` call. The same reasoning removed the client-facing write
policies on `user_progress`, which is derived state maintained by the trigger.

Without `SUPABASE_SECRET_KEY` the app refuses to grade rather than falling back
to a score nobody can trust.

## 2. Apply the database schema

Run the migrations in timestamp order in the SQL Editor:

```text
supabase/migrations/202608190001_initial_schema.sql
supabase/migrations/202608190002_seed_reference_content.sql
supabase/migrations/202608190003_profile_personalization.sql
supabase/migrations/202608190004_onboarding_completion.sql
supabase/migrations/202608190005_neutral_reference_labels.sql
supabase/migrations/202608190006_harden_rls.sql
supabase/migrations/202608190007_task_content.sql
supabase/migrations/202608190008_competitions.sql
supabase/migrations/202608190009_more_subjects.sql
supabase/migrations/202608190010_rename_coach.sql
```

`0006` closes the write holes described above and bounds the profile fields that
reach the model's system prompt. `0007` fills in the full statement, givens,
hints and reference solution for all nine reference tasks — the app reads its
catalogue from these rows only. `0008` adds the `competitions` and
`competition_registrations` tables behind the Olympiads page; both ship empty.
`0009` adds Biology, Economics, Geography and Linguistics, each with topics and
two worked tasks — a subject with no content would appear in onboarding and then
hand the student an empty catalogue. `0010` renames the coach to Sulu AI in the
one place the old name was stored: a column default.

Or let the runner do it. Set `SUPABASE_DB_URL` in `.env.local` and:

```bash
pnpm db:status    # what would run
pnpm db:migrate   # apply everything pending
```

It records applied versions in `supabase_migrations.schema_migrations` — the
same table the Supabase CLI uses — and runs each file inside a transaction, so a
failure leaves that file fully rolled back. Each file is sent as a single query
rather than split on semicolons, which keeps dollar-quoted blocks and semicolons
inside string literals intact.

On a database whose migrations were applied by hand, record them first with
`node scripts/migrate.mjs --baseline` so the runner does not try to re-run them.

The Supabase CLI works too:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 3. Configure Auth

In **Authentication → URL Configuration** set the Site URL to where the app runs
and add `<site>/auth/callback` to the redirect allow-list. Both the signup
confirmation and the password-recovery links land there, and
`app/auth/callback/route.ts` exchanges the code for a session.

Enable the Email provider in **Authentication → Providers**. Email confirmation
is respected: with it on, signup redirects to a message asking the user to
confirm before logging in.

## 4. Run the app

```bash
pnpm install
pnpm dev
```

## Where things live

| Concern | File |
| --- | --- |
| Auth actions, password recovery | `app/auth/actions.ts`, `app/auth/callback/route.ts` |
| Session refresh and route protection | `proxy.ts` |
| Server and service-role clients | `lib/supabase/{server,admin}.ts` |
| Public env / secret env | `lib/supabase/env.ts`, `lib/supabase/secret-env.ts` |
| User-scoped reads | `lib/supabase/{queries,chat,competitions}.ts` |
| Attempt grading | `app/(app)/tasks/actions.ts` → `lib/sulu/grade.ts` |
| Coach streaming | `app/api/sulu/route.ts` → `lib/sulu/provider.ts` |
| Prompt construction | `lib/sulu/prompt.ts` |
| Per-hour quotas | `lib/rate-limit.ts` |

## Protected routes

`proxy.ts` protects `/dashboard`, `/tasks`, `/sulu-ai`, `/progress`,
`/study-plan`, `/olympiads`, `/profile` and `/onboarding`. Unauthenticated
visitors are redirected to `/login` with a `next` path, which is validated as a
same-origin path before use.

When the Supabase variables are absent the proxy passes through so the marketing
page stays previewable; the authenticated pages then report the missing
configuration instead of rendering placeholder data.

## Security notes

- No Supabase key of any kind reaches the browser bundle.
- Every server-side check uses `supabase.auth.getUser()`, which revalidates the
  JWT, not `getSession()`, which trusts the cookie.
- `task_attempts` and `user_progress` are read-only to `authenticated`.
- Chat messages are reachable only through ownership of the parent session.
- Sulu's context — subject, topic, difficulty, statement, the student's level —
  is assembled server-side from the database. It used to arrive in the request
  body and land verbatim in the system instructions.
- Conversation history is reloaded from `chat_messages` per turn rather than
  accepted from the client, so a caller cannot forge an assistant turn.
- `tasks.official_solution` is selected only inside the grader. It is never part
  of a page payload.
- `/api/sulu` and the grader are both capped per user per hour.
