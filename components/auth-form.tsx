'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, GraduationCap, Users, type LucideIcon } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { cn, fieldClass } from '@/lib/utils'
import { requestPasswordReset, signIn, signUp } from '@/app/auth/actions'
import { useT } from '@/components/i18n-provider'

type AuthMode = 'login' | 'signup'

const inputClass = cn(fieldClass, 'mt-2')

export function AuthForm({
  mode,
  error,
  message,
  next,
}: {
  mode: AuthMode
  error?: string
  message?: string
  next?: string
}) {
  const t = useT()

  const isSignup = mode === 'signup'
  // Which kind of account this is. It decides what the rest of the form is
  // for: a teacher is never asked for Telegram, since the bot asks about a
  // student's own day.
  const [role, setRole] = useState<'student' | 'teacher'>('student')

  return (
    <AuthShell
      eyebrow={isSignup ? t('Start your journey') : t('Welcome back')}
      title={isSignup ? t('Create your OlympAI account') : t('Log in to your training space')}
    >
      {error ? (
        <p role="alert" className="mb-4 rounded-lg bg-ember/60 p-3 text-sm text-destructive shadow-key">
          {t(error)}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mb-4 rounded-lg bg-foreground/[0.05] p-3 text-sm text-foreground shadow-key">
          {t(message)}
        </p>
      ) : null}

      {/* One form, two submit targets: "Forgot password?" posts the same email
          field to the recovery action instead of the sign-in action. It used to
          be a button that only set a notice saying the feature was unavailable. */}
      <form className="space-y-4" action={isSignup ? signUp : signIn}>
        {/* Enter submits with the form's first submit button, and "Forgot
            password?" comes before "Log in" — so Enter used to request a reset
            link instead of logging in. This invisible default goes first. */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {isSignup ? (
          <>
            <input type="hidden" name="role" value={role} />
            <fieldset>
              <legend className="text-[13px] font-medium text-ash">{t('I am')}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <RoleCard
                  icon={GraduationCap}
                  label={t('A student')}
                  note={t('I train for olympiads: problems, papers, a plan.')}
                  selected={role === 'student'}
                  onSelect={() => setRole('student')}
                />
                <RoleCard
                  icon={Users}
                  label={t('A teacher')}
                  note={t('I run a class and want to see my students’ work.')}
                  selected={role === 'teacher'}
                  onSelect={() => setRole('teacher')}
                />
              </div>
            </fieldset>
          </>
        ) : null}

        {isSignup ? (
          <label className="block text-[13px] font-medium text-ash">
            {t('Your name')}
            <input
              name="full_name"
              maxLength={120}
              required
              autoComplete="name"
              placeholder={t('Your full name')}
              className={inputClass}
            />
          </label>
        ) : null}

        <label className="block text-[13px] font-medium text-ash">
          {isSignup ? t('Email address') : t('Email or username')}
          <input
            name="email"
            type={isSignup ? 'email' : 'text'}
            required
            autoComplete={isSignup ? 'email' : 'username'}
            placeholder={isSignup ? t('you@example.com') : t('you@example.com or username')}
            className={inputClass}
          />
        </label>

        <label className="block text-[13px] font-medium text-ash">
          {t('Password')}
          <input
            name="password"
            type="password"
            required
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            // Only enforced on signup: an existing account may predate this rule.
            minLength={isSignup ? 8 : undefined}
            placeholder={isSignup ? t('At least 8 characters') : t('Enter your password')}
            className={inputClass}
          />
        </label>

        {isSignup && role === 'student' ? (
          <label className="block text-[13px] font-medium text-ash">
            {t('Telegram')} <span className="font-normal text-muted-foreground">({t('optional')})</span>
            <input
              name="telegram_username"
              maxLength={33}
              autoComplete="off"
              spellCheck={false}
              placeholder="@username"
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs leading-5 font-normal text-muted-foreground">
              {t('Our bot asks five short questions about your day in the evening. You can link it later in settings.')}
            </span>
          </label>
        ) : null}

        {isSignup ? (
          <label className="flex items-start gap-2.5 pt-2 text-xs leading-5 text-muted-foreground">
            <input type="checkbox" required className="mt-1 accent-primary" />
            {t('I agree to the terms and understand that OlympAI is a practice tool.')}
          </label>
        ) : (
          <div className="flex justify-end">
            <button
              type="submit"
              formAction={requestPasswordReset}
              formNoValidate
              className="text-[13px] text-ash transition-colors hover:text-foreground"
            >
              {t('Forgot password?')}
            </button>
          </div>
        )}

        <Button size="lg" className="h-11 w-full" type="submit">
          {isSignup ? t('Continue') : t('Log in')} <ArrowRight className="size-4" />
        </Button>

        <p className="pt-3 text-center text-sm text-muted-foreground">
          {isSignup ? t('Already have an account?') : t('New to OlympAI?')}{' '}
          <Link
            href={`${isSignup ? '/login' : '/signup'}${next ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-medium text-foreground hover:underline"
          >
            {isSignup ? t('Log in') : t('Create an account')}
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

/** One of the two kinds of account, as a card that can be picked. */
function RoleCard({
  icon: Icon,
  label,
  note,
  selected,
  onSelect,
}: {
  icon: LucideIcon
  label: string
  note: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex items-start gap-3 rounded-xl p-3 text-left ring-1 transition-colors',
        selected ? 'bg-foreground/[0.06] ring-foreground/40' : 'ring-foreground/10 hover:bg-foreground/[0.03]',
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', selected ? 'text-foreground' : 'text-muted-foreground')} />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{note}</span>
      </span>
    </button>
  )
}
