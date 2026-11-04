import { cn, fieldClass } from '@/lib/utils'

/**
 * The six-digit code from the email. One field rather than six boxes, so paste
 * and the phone's "from Messages/Mail" suggestion (one-time-code) both work.
 */
export function CodeField({ label }: { label: string }) {
  return (
    <label className="block text-[13px] font-medium text-ash">
      {label}
      <input
        name="code"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\s*\d{3}\s*\d{3}\s*"
        maxLength={8}
        autoFocus
        placeholder="000000"
        className={cn(fieldClass, 'mt-2 text-center font-mono text-2xl tracking-[0.5em] tabular-nums')}
      />
    </label>
  )
}

/**
 * The notices a code screen shows. "wait:NN" is the resend cooldown, sent by the
 * action as a number so the sentence can be translated with it.
 */
export function codeNotice(error: string | undefined, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (!error) return null
  const wait = /^wait:(\d+)$/.exec(error)
  return wait
    ? t('A code was sent a moment ago. You can ask for another in {n} {n|second|seconds}.', { n: Number(wait[1]) })
    : t(error)
}
