'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteClass } from '@/app/(app)/class/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'

/**
 * At the bottom of the page, on its own, behind a confirm.
 *
 * It used to sit inside the invite card, a few pixels under the code a teacher
 * had come to that card to copy. Nothing about the two belongs together except
 * that both concern the class.
 */
export function DeleteClass({ classId }: { classId: string }) {
  const t = useT()
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function remove() {
    if (!confirm(t.classes.deleteConfirm)) return
    setError('')
    const formData = new FormData()
    formData.set('class_id', classId)
    startTransition(async () => {
      const result = await deleteClass(formData)
      if (result.ok) router.push('/class')
      else setError(result.error ?? t.common.notSaved)
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button variant="destructive" size="lg" onClick={remove} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        {pending ? t.classes.deleting : t.classes.delete}
      </Button>
    </div>
  )
}
