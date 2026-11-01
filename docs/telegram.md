# The Telegram bot

Five questions a day — sleep, lights out, theory, solving, what school took,
how the head was — written into `day_states`, which is the same table the day
diagram on the dashboard draws. It pays no XP and unlocks nothing: it is the
student's own record of their own week.

There are two ways to run it, and **only one can be live at a time**. Setting a
webhook makes `getUpdates` return nothing, so the script will sit there
receiving silence.

| | Where it runs | When to use it |
| --- | --- | --- |
| `scripts/telegram-bot.mjs` | A laptop, long polling | Developing. No public address needed |
| `app/api/telegram/route.ts` | The deployment, webhook | Anywhere real |

## Connecting the webhook

Three variables, then one call to Telegram.

| Variable | What it is |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | The bot's whole identity. Anyone holding it can post as the bot |
| `TELEGRAM_WEBHOOK_SECRET` | Any long random string. Telegram echoes it back in a header, and it is the only proof a call is theirs |
| `CRON_SECRET` | Guards the daily ask at `/api/telegram/ask` |

Set all three on the project (`vercel env add NAME production`), deploy, then
point Telegram at the deployment:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H 'content-type: application/json' \
  -d '{"url":"https://olympai.vercel.app/api/telegram","secret_token":"<TELEGRAM_WEBHOOK_SECRET>","allowed_updates":["message"]}'
```

`{"ok":true}` means Telegram has it. To check later, or to see what it is
failing on:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

`last_error_message` is where a wrong secret or a 500 shows up. To go back to
the laptop script, delete the webhook: `…/deleteWebhook`.

## Why the URL is not the security

The webhook address ends up in Telegram's logs and in whatever terminal history
set it. So the route does not trust the path: it requires the
`x-telegram-bot-api-secret-token` header to match, and answers 401 otherwise.
Without that, anyone who learned the URL could post an update naming any chat
id and write somebody's day.

## Linking a chat to an account

Settings → Telegram shows a deep link carrying a one-time code. Telegram passes
it to the bot as `/start <code>`, the bot links that chat, and the code is spent
on arrival. Opening the settings page again mints a new code and invalidates
the old one — a link that admits a chat to an account should not keep working
out of somebody's history.

Accounts linked the old way, by the Telegram username typed at sign-up, still
work: `/start` with no code falls back to matching the username.

## The evening ask

`vercel.json` has Vercel call `/api/telegram/ask` at 16:00 UTC — 21:00 in
Almaty. It asks everyone linked who has not reported today. On the Hobby plan a
cron runs once a day at an approximate time, which is the right precision for
"some time in the evening".

Running it by hand:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://olympai.vercel.app/api/telegram/ask
```

## Checking it

`.tools/live-telegram.mjs` posts real update payloads at a running server and
checks what lands in the database — the link, the five answers one message at a
time, the day they add up to, and that a stray number answers nothing. No bot
token is needed: sending the replies fails, which is logged and changes nothing
that is written.

```bash
node --import ./.tools/register.mjs .tools/live-telegram.mjs
```

It expects a server on port 3002 with the two Telegram variables set — the
`olympai-telegram` entry in `.claude/launch.json` does exactly that.
