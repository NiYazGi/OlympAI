'use client'

import { useState, useTransition } from 'react'
import { Ban, Loader2, LogOut, MailCheck, RotateCcw, Trash2, UserCog } from 'lucide-react'
import {
  blockUser,
  confirmUserEmail,
  deleteUser,
  resetOnboarding,
  setRole,
  signOutEverywhere,
  unblockUser,
  updateProfile,
} from '@/app/(app)/admin/users/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn, fieldClass } from '@/lib/utils'
import type { AdminResult } from '@/lib/supabase/admin-guard'

type Account = {
  id: string
  email: string
  full_name: string | null
  username: string | null
  grade: string | null
  role: string
  is_admin: boolean
  email_confirmed_at: string | null
  banned_at: string | null
  ban_reason: string | null
  sessions: number
}

/** Everything an admin can change about one account, in one panel. */
export function UserControls({ account, isSelf, grades }: { account: Account; isSelf: boolean; grades: readonly string[] }) {
  const t = useT()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')

  function run(action: () => Promise<AdminResult>, confirm?: string) {
    if (confirm && !window.confirm(confirm)) return
    setNotice(null)
    startTransition(async () => {
      try {
        const result = await action()
        setNotice({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? '' })
      } catch (cause) {
        if (cause && typeof cause === 'object' && 'digest' in cause && String(cause.digest).startsWith('NEXT_REDIRECT')) throw cause
        setNotice({ ok: false, text: t('That did not save. Check your connection and try again.') })
      }
    })
  }

  return (
    <div className="space-y-4">
      {notice?.text ? (
        <p role="status" className={cn('rounded-lg px-3 py-2 text-sm', notice.ok ? 'bg-success/10 text-success' : 'bg-coral/10 text-coral')}>
          {notice.text}
        </p>
      ) : null}

      <section className={cn(cardClass, 'space-y-4 p-5')}>
        <h2 className="text-[15px] font-medium text-foreground">{t('Profile')}</h2>
        <form
          action={(formData) => run(() => updateProfile(account.id, formData))}
          className="space-y-3"
        >
          <label className="block text-sm text-ash">
            {t('Name')}
            <input name="full_name" defaultValue={account.full_name ?? ''} maxLength={120} className={cn(fieldClass, 'mt-1.5 h-10')} />
          </label>
          <label className="block text-sm text-ash">
            {t('Username')}
            <input name="username" defaultValue={account.username ?? ''} maxLength={40} className={cn(fieldClass, 'mt-1.5 h-10')} />
          </label>
          <label className="block text-sm text-ash">
            {t('Grade')}
            <select name="grade" defaultValue={account.grade ?? ''} className={cn(fieldClass, 'mt-1.5 h-10')}>
              <option value="">—</option>
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {t(grade)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {t('Save profile')}
          </Button>
        </form>
      </section>

      <section className={cn(cardClass, 'space-y-3 p-5')}>
        <h2 className="text-[15px] font-medium text-foreground">{t('Account')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () => setRole(account.id, account.role === 'teacher' ? 'student' : 'teacher'),
                account.role === 'teacher' ? t('Make this a student account?') : t('Make this a teacher account?'),
              )
            }
          >
            <UserCog className="size-3.5" />
            {account.role === 'teacher' ? t('Make student') : t('Make teacher')}
          </Button>
          {!account.email_confirmed_at ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => confirmUserEmail(account.id))}>
              <MailCheck className="size-3.5" /> {t('Confirm email')}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={pending || account.sessions === 0}
            onClick={() => run(() => signOutEverywhere(account.id), t('Sign this account out on every device?'))}
          >
            <LogOut className="size-3.5" /> {t('Sign out everywhere')} ({account.sessions})
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => resetOnboarding(account.id), t('Show them the setup questions and the tour again?'))}
          >
            <RotateCcw className="size-3.5" /> {t('Reset onboarding')}
          </Button>
        </div>
      </section>

      {!isSelf ? (
        <section className={cn(cardClass, 'space-y-3 p-5')}>
          <h2 className="text-[15px] font-medium text-foreground">{t('Block')}</h2>
          {account.banned_at ? (
            <>
              <p className="text-sm text-coral">
                {t('Blocked.')} {account.ban_reason ? `${t('Reason:')} ${account.ban_reason}` : ''}
              </p>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => unblockUser(account.id))}>
                {t('Unblock')}
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs leading-5 text-ash">{t('A blocked account cannot sign in. Its data stays; unblocking restores it as it was.')}</p>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={300}
                placeholder={t('Reason (only admins see it)')}
                className={cn(fieldClass, 'h-10')}
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={pending || account.is_admin}
                title={account.is_admin ? t('Remove admin access first, then block.') : undefined}
                onClick={() => run(() => blockUser(account.id, reason), t('Block this account and sign it out everywhere?'))}
              >
                <Ban className="size-3.5" /> {t('Block account')}
              </Button>
            </>
          )}
        </section>
      ) : null}

      {!isSelf ? (
        <section className={cn(cardClass, 'space-y-3 p-5 ring-1 ring-coral/20')}>
          <h2 className="text-[15px] font-medium text-coral">{t('Delete account')}</h2>
          <p className="text-xs leading-5 text-ash">
            {t('Deletes the account and everything in it: attempts, chats, classes it teaches. This cannot be undone. Type the email to confirm.')}
          </p>
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={account.email}
            autoComplete="off"
            className={cn(fieldClass, 'h-10')}
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={pending || account.is_admin || typed.trim().toLowerCase() !== account.email.toLowerCase()}
            onClick={() => run(() => deleteUser(account.id, typed))}
          >
            <Trash2 className="size-3.5" /> {t('Delete forever')}
          </Button>
        </section>
      ) : null}
    </div>
  )
}
