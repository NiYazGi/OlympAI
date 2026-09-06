'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { requestPasswordReset, signIn, signUp } from '@/app/auth/actions'

type AuthMode = 'login' | 'signup'

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
  const isSignup = mode === 'signup'

  return (
    <AuthShell
      eyebrow={isSignup ? 'Start your journey' : 'Welcome back'}
      title={isSignup ? 'Create your OlympAI account' : 'Log in to your training space'}
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
        {!isSignup && next ? <input type="hidden" name="next" value={next} /> : null}

        {isSignup ? (
          <label className="block text-sm font-medium">
            Your name
            <input
              name="full_name"
              maxLength={120}
              required
              autoComplete="name"
              placeholder="Your full name"
              className={inputClass}
            />
          </label>
        ) : null}

        <label className="block text-sm font-medium">
          Email address
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
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            // Only enforced on signup: an existing account may predate this rule.
            minLength={isSignup ? 8 : undefined}
            placeholder={isSignup ? 'At least 8 characters' : 'Enter your password'}
            className={inputClass}
          />
        </label>

        {isSignup ? (
          <label className="flex items-start gap-2.5 pt-2 text-xs leading-5 text-muted-foreground">
            <input type="checkbox" required className="mt-1 accent-primary" />
            I agree to the terms and understand that OlympAI is a practice tool.
          </label>
        ) : (
          <div className="flex justify-end">
            <button
              type="submit"
              formAction={requestPasswordReset}
              formNoValidate
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        <Button className="h-11 w-full" type="submit">
          {isSignup ? 'Continue' : 'Log in'} <ArrowRight className="size-4" />
        </Button>

        <p className="pt-3 text-center text-sm text-muted-foreground">
          {isSignup ? 'Already have an account?' : 'New to OlympAI?'}{' '}
          <Link
            href={isSignup ? '/login' : '/signup'}
            className="font-medium text-primary hover:underline"
          >
            {isSignup ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
