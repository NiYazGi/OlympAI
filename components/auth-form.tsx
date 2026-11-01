'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowRight, GraduationCap, Users } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'
import { SubmitButton } from '@/components/submit-button'
import { requestPasswordReset, signIn, signUp } from '@/app/auth/actions'
import { useT } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'signup'

/**
 * The second submitter on the login form. It posts the same email field to the
 * recovery action, and `useFormStatus` is how it knows to say so while the
 * mail is being sent — without lighting up the Log in button next to it.
 */
function ResetLink() {
  const t = useT()
  const { pending, action } = useFormStatus()
  const sending = pending && action === requestPasswordReset

  return (
    <button
      type="submit"
      formAction={requestPasswordReset}
      formNoValidate
      disabled={pending}
      className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
    >
      {sending ? t.auth.sendingReset : t.auth.forgot}
    </button>
  )
}

const inputClass =
  'mt-2 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/15'

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
  /*
   * Which kind of account this is. It sits at the top of the form because it
   * decides what the rest of it is for — a teacher is never asked for a
   * Telegram username, since the bot asks about a student's own day.
   *
   * Two cards rather than a select: there are two of them, they need a line of
   * explanation each, and this is the one answer on the form that cannot be
   * changed later from inside the app.
   */
  const [role, setRole] = useState<'student' | 'teacher'>('student')

  return (
    <AuthShell
      eyebrow={isSignup ? t.auth.startJourney : t.auth.welcomeBack}
      title={isSignup ? t.auth.signupTitle : t.auth.loginTitle}
    >
      {error ? (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mb-4 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
          {message}
        </p>
      ) : null}

      {/* One form, two submit targets: "Forgot password?" posts the same email
          field to the recovery action instead of the sign-in action. It used to
          be a button that only set a notice saying the feature was unavailable. */}
      <form className="space-y-4" action={isSignup ? signUp : signIn}>
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {isSignup ? (
          <>
            <input type="hidden" name="role" value={role} />
            <fieldset>
              <legend className="text-sm font-medium">{t.auth.role}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <RoleCard
                  icon={GraduationCap}
                  label={t.auth.roleStudent}
                  note={t.auth.roleStudentNote}
                  selected={role === 'student'}
                  onSelect={() => setRole('student')}
                />
                <RoleCard
                  icon={Users}
                  label={t.auth.roleTeacher}
                  note={t.auth.roleTeacherNote}
                  selected={role === 'teacher'}
                  onSelect={() => setRole('teacher')}
                />
              </div>
            </fieldset>
          </>
        ) : null}

        {isSignup ? (
          <label className="block text-sm font-medium">
            {t.auth.yourName}
            <input
              name="full_name"
              maxLength={120}
              required
              autoComplete="name"
              placeholder={t.auth.fullNamePlaceholder}
              className={inputClass}
            />
          </label>
        ) : null}

        <label className="block text-sm font-medium">
          {t.auth.email}
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
          {t.auth.password}
          <input
            name="password"
            type="password"
            required
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            // Only enforced on signup: an existing account may predate this rule.
            minLength={isSignup ? 8 : undefined}
            placeholder={isSignup ? t.auth.minChars : t.auth.enterPassword}
            className={inputClass}
          />
        </label>

        {isSignup && role === 'student' ? (
          <label className="block text-sm font-medium">
            {t.auth.telegram}{' '}
            <span className="font-normal text-muted-foreground">({t.auth.telegramOptional})</span>
            <input
              name="telegram_username"
              maxLength={33}
              autoComplete="off"
              spellCheck={false}
              placeholder={t.auth.telegramPlaceholder}
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs leading-5 font-normal text-muted-foreground">
              {t.auth.telegramNote}
            </span>
          </label>
        ) : null}

        {isSignup ? (
          <label className="flex items-start gap-2.5 pt-2 text-xs leading-5 text-muted-foreground">
            <input type="checkbox" required className="mt-1 accent-primary" />
            {t.auth.terms}
          </label>
        ) : (
          <div className="flex justify-end">
            <ResetLink />
          </div>
        )}

        {/* The form posts to a server action and then redirects, so until the
            new page arrives nothing on screen had changed and people pressed
            it again. */}
        <SubmitButton
          className="h-11 w-full"
          action={isSignup ? signUp : signIn}
          pendingLabel={isSignup ? t.auth.creating : t.auth.loggingIn}
        >
          {isSignup ? t.auth.continue : t.auth.logIn} <ArrowRight className="size-4" />
        </SubmitButton>

        <p className="pt-3 text-center text-sm text-muted-foreground">
          {isSignup ? t.auth.haveAccount : t.auth.newHere}{' '}
          <Link
            href={isSignup ? '/login' : '/signup'}
            className="font-medium text-primary hover:underline"
          >
            {isSignup ? t.auth.logIn : t.auth.createOne}
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

function RoleCard({
  icon: Icon,
  label,
  note,
  selected,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>
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
        'rounded-lg border p-3 text-left transition-colors',
        selected
          ? 'border-primary bg-accent'
          : 'border-input hover:border-primary/40 hover:bg-muted/40',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')} />
        {label}
      </span>
      <span className="mt-1 block text-xs leading-5 font-normal text-muted-foreground">{note}</span>
    </button>
  )
}
