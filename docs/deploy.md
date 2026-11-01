# Deploying

The app runs on Vercel at **https://olympai.vercel.app** (project
`gizatuly-team/olympai`). Deployed from the laptop with the Vercel CLI, not
from a git remote: the repository has no origin, and `vercel --prod` uploads
the working directory.

```bash
npx vercel --prod
```

The database it talks to is the same Supabase project the laptop talks to.
There is one environment, and a deployment is pointed at live student data from
its first request.

## The five variables the server needs

A deployment with none of them builds and serves the signed-out pages, and
every route that needs a session quietly behaves as though Supabase were not
configured — `/class` answers 200 instead of redirecting to the login page.
That is the symptom of a missing environment, not of a broken build.

| Variable | Why the server needs it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Every query |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Every query, under RLS |
| `SUPABASE_SECRET_KEY` | Grading, joining a class, the shared content cache |
| `OPENAI_API_KEY` | The grader and the coach |
| `SULU_MODEL` | Which model those two use |
| `NEXT_PUBLIC_SITE_URL` | `https://olympai.vercel.app` — the origin Supabase mails links to |

Add them to the project (Vercel → Settings → Environment Variables, or
`npx vercel env add NAME production`), then deploy again: environment changes
only reach a build that happens after them.

**Three more for the Telegram bot**, which now runs on the deployment rather
than on a laptop — `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` and
`CRON_SECRET`. The full runbook, including the one call that points Telegram at
the deployment, is in `docs/telegram.md`.

**One variable stays off the server on purpose.** `SUPABASE_DB_URL` is full
database access with RLS bypassed. Only `scripts/migrate.mjs` uses it, and
migrations are applied from a laptop.

## Supabase has to be told the new origin

Supabase only redirects to origins it has been given. Until this is done,
confirmation and password-reset mails land back on `localhost`:

Supabase → Authentication → URL Configuration

- **Site URL**: `https://olympai.vercel.app`
- **Redirect URLs**: add `https://olympai.vercel.app/**`

Preview deployments get their own hostname per deployment, so either add
`https://olympai-*-gizatuly-team.vercel.app/**` as well or accept that the mail
flow is production-only.

## Migrations are not part of a deploy

Nothing in the build touches the schema. A migration is applied by hand, from
the laptop, before the deploy that depends on it:

```bash
npm run db:status   # what is pending
npm run db:migrate  # apply it
```

A deployed build that expects a column the database does not have will fail at
runtime, per request, with a PostgREST error. In that order — migrate, then
deploy — it cannot happen.

## What is uploaded

`.vercelignore` replaces `.gitignore` for the upload, so everything that must
stay out has to be named in it: the env files first of all, because an uploaded
`.env.local` would both ship secrets into the build and override the variables
configured on the project.

Its patterns are anchored with a leading slash. Without one they match at any
depth, the way `.gitignore` does — a bare `supabase/` also matched
`lib/supabase/`, and the first two deploys failed on a missing
`@/lib/supabase/admin`.

## Analytics

`@vercel/analytics` is mounted in production builds only. Running `next start`
locally is a production build, so the browser console shows a 404 for
`/_vercel/insights/script.js` on localhost. On Vercel it loads, once Web
Analytics is enabled for the project.
