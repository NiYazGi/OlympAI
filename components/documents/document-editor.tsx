'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileCheck2, Loader2, Printer } from 'lucide-react'
import { issue } from '@/app/(app)/documents/actions'
import { DocumentSheet } from '@/components/documents/document-sheet'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { cleanData, templateById, type DocumentData } from '@/lib/documents/templates'
import { cardClass, cn, fieldClass } from '@/lib/utils'

const REMEMBER_KEY = (kind: string) => `olympai-doc-defaults:${kind}`

function today() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** The form and its live A4 preview. Issuing numbers it and opens the saved copy. */
export function DocumentEditor({ kind, initial }: { kind: string; initial?: DocumentData }) {
  const t = useT()
  const router = useRouter()
  const template = templateById(kind)!
  const [data, setData] = useState<DocumentData>(() => cleanData(template, { date: today(), ...initial }))
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Letterhead and signer come back on the next document, on this device.
  useEffect(() => {
    if (initial) return
    try {
      const saved = JSON.parse(window.localStorage.getItem(REMEMBER_KEY(kind)) ?? '{}') as DocumentData
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of browser storage after mount
      setData((current) => ({ ...current, ...cleanData(template, { ...current, ...saved, date: current.date, body: current.body, recipient: current.recipient, subject: current.subject }) }))
    } catch {
      // Storage can be unavailable; the form simply starts empty.
    }
  }, [kind, initial, template])

  const update = (name: string, value: string) => setData((current) => ({ ...current, [name]: value }))

  const remember = () => {
    try {
      const kept = Object.fromEntries(template.fields.filter((field) => field.remember).map((field) => [field.name, data[field.name]]))
      window.localStorage.setItem(REMEMBER_KEY(kind), JSON.stringify(kept))
    } catch {
      // Not remembering is fine.
    }
  }

  const submit = () => {
    setError('')
    remember()
    startTransition(async () => {
      const result = await issue(kind, data)
      if (!result.ok) setError(result.error)
      else router.push(`/documents/${result.id}?print=1`)
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section className={cn(cardClass, 'print-hide h-fit space-y-4 p-5')}>
        {template.fields.map((field) => (
          <label key={field.name} className="block text-sm">
            <span className="mb-1 block font-medium">{t(field.label)}</span>
            {field.kind === 'textarea' ? (
              <textarea
                className={cn(fieldClass, 'min-h-20 py-2', field.name === 'body' && 'min-h-56')}
                value={data[field.name]}
                maxLength={field.max}
                placeholder={field.name === 'body' ? t(field.placeholder ?? '') : field.placeholder}
                onChange={(event) => update(field.name, event.target.value)}
              />
            ) : (
              <input
                className={fieldClass}
                type={field.kind === 'date' ? 'date' : 'text'}
                value={data[field.name]}
                maxLength={field.max}
                placeholder={field.placeholder}
                onChange={(event) => update(field.name, event.target.value)}
              />
            )}
          </label>
        ))}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-col gap-2">
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <FileCheck2 className="size-4" />}
            {t('Issue with a number')}
          </Button>
          <Button variant="outline" onClick={() => { remember(); window.print() }}>
            <Printer className="size-4" /> {t('Print a draft without a number')}
          </Button>
        </div>
      </section>

      <div className="doc-print overflow-x-auto rounded-xl bg-foreground/[0.04] p-4 sm:p-6">
        <div className="mx-auto w-fit">
          <DocumentSheet data={data} number={null} />
        </div>
      </div>
    </div>
  )
}
