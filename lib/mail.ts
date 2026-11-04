import 'server-only'

import type { Locale } from '@/lib/i18n/config'

/**
 * Service mail, sent through OlympMail on the same machine.
 *
 * OlympMail has no SMTP submission port and its MX does not relay, so it takes
 * service mail over a local HTTP endpoint (OlympMail/server/transactional.ts)
 * guarded by a shared token. It signs with the domain's DKIM key and retries
 * through its queue, so a slow recipient server does not hold up a signup.
 *
 * Without MAIL_API_URL — local development — the message is written to the
 * server log instead, which is where the code can be read.
 */

type Message = { to: string; subject: string; text: string; html: string }

export class MailError extends Error {}

export async function sendMail(message: Message): Promise<void> {
  const url = process.env.MAIL_API_URL
  const token = process.env.MAIL_API_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') throw new MailError('Mail is not configured.')
    console.info(`[mail] (not sent, MAIL_API_URL unset) to ${message.to}: ${message.subject}\n${message.text}`)
    return
  }
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (cause) {
    console.error('[mail] OlympMail unreachable', cause)
    throw new MailError('Mail server unreachable.')
  }
  if (!response.ok) {
    console.error(`[mail] OlympMail refused the message: ${response.status}`)
    throw new MailError('Mail server refused the message.')
  }
}

// ---------------------------------------------------------------- letters ---

export type CodePurpose = 'signup' | 'reset'

const COPY: Record<Locale, Record<CodePurpose, { subject: string; lead: string; ignore: string }> & { valid: string; team: string }> = {
  ru: {
    signup: {
      subject: 'Код подтверждения OlympAI: {code}',
      lead: 'Чтобы закончить регистрацию в OlympAI, введите этот код:',
      ignore: 'Если вы не регистрировались, просто проигнорируйте письмо — без кода аккаунт не заработает.',
    },
    reset: {
      subject: 'Код для сброса пароля OlympAI: {code}',
      lead: 'Кто-то, надеемся вы, запросил сброс пароля в OlympAI. Введите этот код, чтобы задать новый пароль:',
      ignore: 'Если вы не запрашивали сброс, проигнорируйте письмо — пароль останется прежним.',
    },
    valid: 'Код действует {minutes} минут.',
    team: 'Команда OlympAI',
  },
  kk: {
    signup: {
      subject: 'OlympAI растау коды: {code}',
      lead: 'OlympAI-да тіркелуді аяқтау үшін осы кодты енгізіңіз:',
      ignore: 'Егер сіз тіркелмеген болсаңыз, хатты елемеңіз — кодсыз аккаунт іске қосылмайды.',
    },
    reset: {
      subject: 'OlympAI құпиясөзін қалпына келтіру коды: {code}',
      lead: 'OlympAI-да құпиясөзді қалпына келтіру сұралды. Жаңа құпиясөз орнату үшін осы кодты енгізіңіз:',
      ignore: 'Егер сіз сұрамаған болсаңыз, хатты елемеңіз — құпиясөз өзгермейді.',
    },
    valid: 'Код {minutes} минут жарамды.',
    team: 'OlympAI командасы',
  },
  en: {
    signup: {
      subject: 'Your OlympAI confirmation code: {code}',
      lead: 'To finish signing up for OlympAI, enter this code:',
      ignore: 'If you did not sign up, ignore this email — the account does nothing without the code.',
    },
    reset: {
      subject: 'Your OlympAI password reset code: {code}',
      lead: 'Someone, hopefully you, asked to reset your OlympAI password. Enter this code to choose a new one:',
      ignore: 'If you did not ask for this, ignore this email — your password stays as it is.',
    },
    valid: 'The code is valid for {minutes} minutes.',
    team: 'The OlympAI team',
  },
}

const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))

/** The code letter in the student's interface language, as text and HTML. */
export function codeLetter(purpose: CodePurpose, code: string, minutes: number, locale: Locale): Omit<Message, 'to'> {
  const copy = COPY[locale] ?? COPY.ru
  const letter = copy[purpose]
  const vars = { code, minutes }
  const subject = fill(letter.subject, vars)
  const text = [letter.lead, '', code, '', fill(copy.valid, vars), letter.ignore, '', `— ${copy.team}`].join('\n')
  // Inline styles and a table: what mail clients actually render.
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:460px;background:#ffffff;border-radius:14px;padding:28px">
<tr><td style="font-size:18px;font-weight:600;padding-bottom:18px">Olymp<span style="color:#ff6363">AI</span></td></tr>
<tr><td style="font-size:15px;line-height:1.55;padding-bottom:18px">${letter.lead}</td></tr>
<tr><td align="center" style="padding-bottom:18px"><div style="display:inline-block;font-family:SFMono-Regular,Consolas,Menlo,monospace;font-size:32px;font-weight:600;letter-spacing:8px;background:#f4f4f5;border-radius:10px;padding:14px 22px">${code}</div></td></tr>
<tr><td style="font-size:13px;line-height:1.55;color:#52525b">${fill(copy.valid, vars)} ${letter.ignore}</td></tr>
<tr><td style="font-size:13px;color:#71717a;padding-top:22px">${copy.team}</td></tr>
</table></td></tr></table></body></html>`
  return { subject, text, html }
}
