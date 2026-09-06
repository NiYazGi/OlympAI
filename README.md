# OlympAI

A training space for academic olympiads: a graded problem library, an AI coach,
a route through a chosen subject toward a chosen competition, and timed mock
papers that measure the student's level.

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

## How it fits together

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

**Provenance travels with content.** Every task and every resource records
where it came from and what may be done with it; a database trigger refuses
material whose licence is `unknown`.

### Where things live

| Concern | Path |
| --- | --- |
| Grading | `app/(app)/tasks/actions.ts` → `lib/sulu/grade.ts` |
| Coach streaming | `app/api/sulu/route.ts` → `lib/sulu/provider.ts` |
| Prompts, answer redaction | `lib/sulu/prompt.ts`, `lib/sulu/redact.ts` |
| XP, levels | `lib/xp.ts` |
| Path through a subject | `lib/path.ts` |
| Deadline, workload, readiness | `lib/goal.ts` |
| Mock composition and scoring | `lib/mock.ts` |
| Licensing | `lib/licence.ts` |
| Migrations + runner | `supabase/migrations/`, `scripts/migrate.mjs` |

## Screens

`/` marketing · `/login` `/signup` `/reset-password` · `/onboarding` ·
`/dashboard` · `/path` · `/tasks` `/tasks/[slug]` · `/mock` `/mock/[id]` ·
`/sulu-ai` · `/olympiads` · `/me` · `/settings` `/settings/material`

`/profile`, `/progress` and `/study-plan` redirect: they were merged into `/me`
and `/path`.

## Things worth knowing before changing anything

- **Never edit an applied migration.** Two renames in this repo were done as
  new migrations for exactly this reason (`0010`, `0014`).
- **The catalogue carries no competition dates.** Sittings move every year; the
  student supplies the target date. Adding dates would be inventing them.
- **Empty means empty.** Several screens ship with nothing in them
  (`competitions`, `resources`). That is deliberate — placeholder content that
  reads as real is worse than an empty state.
- `.env.local` holds four secrets and is gitignored. `SUPABASE_DB_URL` is only
  used by the migration runner.

## Known gaps

- No automated tests. Pure logic (`lib/xp.ts`, `lib/mock.ts`, `lib/goal.ts`,
  `lib/licence.ts`, `lib/path.ts`) is written to be testable and has been
  checked by hand; nothing runs in CI.
- The task library is 23 problems written for this project. Real olympiad
  material has not been imported, and there is no ingestion pipeline yet.
- Mock papers, the exam timer and grading have not been exercised end to end
  with a real session.
