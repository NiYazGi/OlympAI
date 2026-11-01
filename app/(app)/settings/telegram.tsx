import { randomBytes } from 'node:crypto'
import { Send } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { hasSupabaseSecretKey } from '@/lib/supabase/secret-env'
import { botUsername, hasTelegram } from '@/lib/telegram'
import { getT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { cardClass, cn } from '@/lib/utils'

/**
 * The one screen that links a Telegram chat to an account.
 *
 * It hands out a deep link rather than asking the student to type their
 * username somewhere and hope the bot finds it. Telegram passes the code
 * through to the bot as `/start <code>`, so the chat that arrives holding it is
 * the chat that opened this link, and the code is spent on arrival.
 *
 * The code is minted on view, which means opening this page twice invalidates
 * the first link. That is the right trade for a credential that admits a chat
 * to an account: a stale link in somebody's history should not keep working.
 */
export async function TelegramLink() {
  const t = await getT()

  if (!hasTelegram() || !hasSupabaseSecretKey()) {
    return (
      <Section title={t.settings.telegram}>
        <p className="text-sm leading-6 text-muted-foreground">{t.settings.telegramOff}</p>
      </Section>
    )
  }

  const user = await getVerifiedUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('telegram_chat_id, telegram_linked_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.telegram_chat_id) {
    return (
      <Section title={t.settings.telegram}>
        <p className="text-sm leading-6 text-muted-foreground">{t.settings.telegramLinked}</p>
      </Section>
    )
  }

  const code = randomBytes(9).toString('base64url')
  await admin.from('profiles').update({ telegram_link_code: code }).eq('id', user.id)
  const bot = await botUsername()

  return (
    <Section title={t.settings.telegram}>
      <p className="text-sm leading-6 text-muted-foreground">{t.settings.telegramNote}</p>
      {bot ? (
        <Button
          className="mt-4"
          nativeButton={false}
          render={
            <a href={`https://t.me/${bot}?start=${code}`} target="_blank" rel="noreferrer">
              <Send className="size-4" /> {t.settings.telegramConnect}
            </a>
          }
        />
      ) : (
        <p className="mt-4 text-sm text-destructive">{t.settings.telegramOff}</p>
      )}
    </Section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <h2 className="flex items-center gap-2 font-semibold">
        <Send className="size-4 text-primary" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}
