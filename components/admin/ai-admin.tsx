'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, KeyRound, Loader2, Pencil, Plus, RotateCcw, Save, Trash2, Zap } from 'lucide-react'
import { removeAiProfile, saveAiProfile, saveAiPrompt, switchAiProfile, testAiProfile } from '@/app/(app)/admin/ai/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { PROMPT_LABEL, type PromptKey } from '@/lib/ai/prompt-keys'
import { cardClass, cn, fieldClass } from '@/lib/utils'
import type { AdminResult } from '@/lib/supabase/admin-guard'

export type ProfileView = {
  id: string
  name: string
  baseUrl: string
  model: string | null
  keyEnv: string | null
  strictJson: boolean
  timeoutSeconds: number
  reasoningEffort: 'none' | 'low' | 'medium' | 'high' | null
  reasoningEffortFast: 'none' | 'low' | 'medium' | 'high' | null
  builtIn: boolean
  keySource: 'env' | 'stored' | 'missing'
  keyHint: string | null
}

export type PromptView = { key: PromptKey; text: string; custom: boolean; default: string }

type Notice = { ok: boolean; text: string } | null

function useAction() {
  const t = useT()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<Notice>(null)
  const run = (action: () => Promise<AdminResult>, after?: (result: AdminResult) => void) => {
    setNotice(null)
    startTransition(async () => {
      try {
        const result = await action()
        setNotice({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? '' })
        if (result.ok) router.refresh()
        after?.(result)
      } catch {
        setNotice({ ok: false, text: t('That did not save. Check your connection and try again.') })
      }
    })
  }
  return { pending, notice, run }
}

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice?.text) return null
  return (
    <p role="status" className={cn('text-sm', notice.ok ? 'text-success' : 'text-coral')}>
      {notice.text}
    </p>
  )
}

const inputClass = cn(fieldClass, 'mt-1.5 h-10')

function EffortSelect({ name, label, value }: { name: string; label: string; value: string | null }) {
  const t = useT()
  return (
    <label className="block text-sm text-ash">
      {label}
      <select name={name} defaultValue={value ?? ''} className={inputClass}>
        <option value="">{t('Not sent (the API decides)')}</option>
        {['none', 'low', 'medium', 'high'].map((effort) => (
          <option key={effort} value={effort}>
            {effort}
          </option>
        ))}
      </select>
    </label>
  )
}

function ProfileForm({ profile, onDone }: { profile: ProfileView | null; onDone: () => void }) {
  const t = useT()
  const { pending, notice, run } = useAction()
  return (
    <form
      action={(formData) => run(() => saveAiProfile(profile?.id ?? null, formData), (result) => result.ok && onDone())}
      className="grid gap-3 sm:grid-cols-2"
    >
      <label className="block text-sm text-ash">
        {t('Name')}
        <input name="name" required maxLength={80} defaultValue={profile?.name ?? ''} className={inputClass} />
      </label>
      <label className="block text-sm text-ash">
        {t('Model')}
        <input name="model" maxLength={120} defaultValue={profile?.model ?? ''} placeholder={profile?.builtIn ? t('From the server settings') : 'gpt-5.4-mini'} className={inputClass} />
      </label>
      <label className="block text-sm text-ash sm:col-span-2">
        {t('API address')}
        <input name="base_url" required defaultValue={profile?.baseUrl ?? ''} placeholder="https://api.example.com/v1" className={cn(inputClass, 'font-mono text-[13px]')} />
      </label>
      <label className="block text-sm text-ash sm:col-span-2">
        {t('API key')}
        <input
          name="api_key"
          type="password"
          autoComplete="off"
          maxLength={400}
          placeholder={profile ? (profile.keyHint ? t('Leave empty to keep the current key ({hint})', { hint: profile.keyHint }) : t('No key yet')) : 'sk-…'}
          className={cn(inputClass, 'font-mono text-[13px]')}
        />
        <span className="mt-1 block text-[11px] text-smoke">{t('Stored encrypted on the server. It is never shown again, only its last four characters.')}</span>
      </label>
      <label className="block text-sm text-ash">
        {t('Timeout, seconds')}
        <input name="timeout" inputMode="numeric" maxLength={3} defaultValue={profile?.timeoutSeconds ?? 60} className={inputClass} />
      </label>
      <EffortSelect name="effort" label={t('Reasoning: chat and card drafts')} value={profile?.reasoningEffort ?? null} />
      <EffortSelect name="effort_fast" label={t('Reasoning: hints, grading, photo reading')} value={profile?.reasoningEffortFast ?? null} />
      <p className="text-[11px] leading-5 text-smoke sm:col-span-2">{t('Thinking models: low answers in seconds, high is the most careful and the slowest.')}</p>
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-ash">
        <input type="checkbox" name="strict_json" defaultChecked={profile?.strictJson ?? true} className="size-4 accent-coral" />
        {t('The API enforces a JSON schema')}
      </label>
      <p className="text-[11px] leading-5 text-smoke sm:col-span-2">
        {t('The API must speak the Responses format (POST /responses). Without an enforced schema, the format is described in the prompt and every reply is checked, with one retry.')}
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {t('Save profile')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <NoticeLine notice={notice} />
      </div>
    </form>
  )
}

function ProfileCard({ profile, active }: { profile: ProfileView; active: boolean }) {
  const t = useT()
  const { pending, notice, run } = useAction()
  const [editing, setEditing] = useState(false)

  return (
    <section className={cn(cardClass, 'space-y-4 p-5', active && 'ring-2 ring-primary/60')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {active ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /> : <Circle className="mt-0.5 size-5 shrink-0 text-smoke" />}
          <div className="min-w-0">
            <h3 className="text-[15px] font-medium text-foreground">
              {profile.name}
              {active ? <span className="ml-2 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] text-primary">{t('Active')}</span> : null}
            </h3>
            <p className="mt-1 truncate font-mono text-[12px] text-ash">{profile.baseUrl}</p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ash">
              <span>
                {t('Model')}: <span className="font-mono text-foreground">{profile.model ?? t('from the server settings')}</span>
              </span>
              <span className={cn('inline-flex items-center gap-1', profile.keySource === 'missing' && 'text-coral')}>
                <KeyRound className="size-3" />
                {profile.keySource === 'missing'
                  ? t('no key')
                  : profile.keySource === 'env'
                    ? t('key from the server env {hint}', { hint: profile.keyHint ?? '' })
                    : t('stored key {hint}', { hint: profile.keyHint ?? '' })}
              </span>
              <span>{profile.strictJson ? t('strict JSON') : t('JSON checked by the site')}</span>
              <span>{t('timeout {n} s', { n: profile.timeoutSeconds })}</span>
              {profile.reasoningEffort || profile.reasoningEffortFast ? (
                <span>{t('reasoning: {e}', { e: `${profile.reasoningEffort ?? '-'} / ${profile.reasoningEffortFast ?? '-'}` })}</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!active ? (
            <Button size="sm" disabled={pending || profile.keySource === 'missing'} onClick={() => run(() => switchAiProfile(profile.id))}>
              {t('Switch to this')}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => testAiProfile(profile.id))}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
            {t('Test')}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing((value) => !value)}>
            <Pencil className="size-3.5" /> {t('Edit')}
          </Button>
          {!profile.builtIn && !active ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => window.confirm(t('Delete the profile “{name}”?', { name: profile.name })) && run(() => removeAiProfile(profile.id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
      <NoticeLine notice={notice} />
      {editing ? <ProfileForm profile={profile} onDone={() => setEditing(false)} /> : null}
    </section>
  )
}

export function AiProfiles({ profiles, activeId }: { profiles: ProfileView[]; activeId: string }) {
  const t = useT()
  const [adding, setAdding] = useState(false)
  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} active={profile.id === activeId} />
      ))}
      {adding ? (
        <section className={cn(cardClass, 'space-y-3 p-5')}>
          <h3 className="text-[15px] font-medium text-foreground">{t('New API profile')}</h3>
          <ProfileForm profile={null} onDone={() => setAdding(false)} />
        </section>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> {t('Add an API profile')}
        </Button>
      )}
    </div>
  )
}

function PromptCard({ prompt }: { prompt: PromptView }) {
  const t = useT()
  const { pending, notice, run } = useAction()
  const [text, setText] = useState(prompt.text)
  const [open, setOpen] = useState(false)
  const label = PROMPT_LABEL[prompt.key]
  const changed = text.trim() !== prompt.text.trim()

  return (
    <section className={cn(cardClass, 'p-5')}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-start justify-between gap-3 text-left">
        <span>
          <span className="block text-[15px] font-medium text-foreground">
            {t(label.title)}
            <span className={cn('ml-2 rounded-full px-2 py-0.5 text-[11px]', prompt.custom ? 'bg-primary/12 text-primary' : 'bg-foreground/[0.05] text-ash')}>
              {prompt.custom ? t('custom') : t('default')}
            </span>
          </span>
          <span className="mt-0.5 block text-xs text-ash">{t(label.note)}</span>
        </span>
        <span className="shrink-0 text-xs text-ash">{open ? t('Hide') : t('Edit')}</span>
      </button>
      {open ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={16}
            className={cn(fieldClass, 'h-auto min-h-64 py-2.5 font-mono text-[12.5px] leading-6')}
          />
          <p className="text-[11px] leading-5 text-smoke">
            {t('The problem, the student’s work, the output format and the identity rule are added by the site after this text, so they cannot be lost by editing it.')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={pending || !changed} onClick={() => run(() => saveAiPrompt(prompt.key, text))}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {t('Save prompt')}
            </Button>
            {prompt.custom ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(t('Restore the default prompt for this task?'))) return
                  setText(prompt.default)
                  run(() => saveAiPrompt(prompt.key, ''))
                }}
              >
                <RotateCcw className="size-3.5" /> {t('Restore default')}
              </Button>
            ) : null}
            <NoticeLine notice={notice} />
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function AiPrompts({ prompts }: { prompts: PromptView[] }) {
  return (
    <div className="space-y-3">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.key} prompt={prompt} />
      ))}
    </div>
  )
}
