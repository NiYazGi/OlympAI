'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { createClass } from '@/app/(app)/class/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SubjectChoice = { slug: string; name: string }

const inputClass =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/15'

/**
 * Two fields, because a class is two facts: what it is called and what it is
 * for. Everything else about it — the code, the roster, the numbers — follows
 * from students joining.
 *
 * "Both" is a real answer and the subject stays optional: a teacher who takes
 * one group for maths and physics should not have to run two classes. The
 * readiness column is the only thing that needs a single subject, and it says
 * so by being empty rather than by forcing the choice here.
 */
export function CreateClass({ subjects }: { subjects: SubjectChoice[] }) {
  const t = useT()
  const router = useRouter()
  const [subject, setSubject] = useState(subjects[0]?.slug ?? '')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    setError('')
    startTransition(async () => {
      try {
        const result = await createClass(formData)
        if (result.ok && result.classId) router.push(`/class/${result.classId}`)
        else setError(result.error ?? t.common.notSaved)
      } catch {
        setError(t.common.offline)
      }
    })
  }

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="subject" value={subject} />

      <label className="block text-sm font-medium">
        {t.classes.nameLabel}
        <input
          name="name"
          required
          maxLength={80}
          placeholder={t.classes.namePlaceholder}
          className={cn(inputClass, 'mt-2')}
        />
      </label>

      <div className="text-sm font-medium">
        {t.classes.subjectLabel}
        <div className="mt-2 flex flex-wrap gap-2">
          {[...subjects, { slug: '', name: '' }].map((option) => {
            const label = option.slug ? (t.subjects[option.name] ?? option.name) : t.classes.bothSubjects
            return (
              <button
                key={option.slug || 'both'}
                type="button"
                onClick={() => setSubject(option.slug)}
                aria-pressed={subject === option.slug}
                className={cn(
                  'h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
                  subject === option.slug
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-input hover:bg-muted/40',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {pending ? t.classes.creating : t.classes.create}
      </Button>
    </form>
  )
}
