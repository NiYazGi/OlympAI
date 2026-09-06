import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { updatePassword } from '@/app/auth/actions'

export const metadata = { title: 'Choose a new password' }

const inputClass =
  'mt-2 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/15'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <AuthShell eyebrow="Account recovery" title="Choose a new password">
      <form className="space-y-4" action={updatePassword}>
        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <label className="block text-sm font-medium">
          New password
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Repeat new password
          <input
            name="password_confirmation"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className={inputClass}
          />
        </label>

        <Button className="h-11 w-full" type="submit">
          Save new password
        </Button>
      </form>
    </AuthShell>
  )
}
