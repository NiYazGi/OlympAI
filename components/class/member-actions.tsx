'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Loader2, LogOut, UserMinus } from 'lucide-react'
import { leaveClass, removeStudent } from '@/app/(app)/class/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'

/** Taking a student off a roster. Their work is not touched, and the confirm says so. */
export function RemoveStudent({
  classId,
  studentId,
  name,
}: {
  classId: string
  studentId: string
  name: string
}) {
  const t = useT()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function remove() {
    if (!confirm(t.classes.removeConfirm(name))) return
    const formData = new FormData()
    formData.set('class_id', classId)
    formData.set('student_id', studentId)
    startTransition(async () => {
      await removeStudent(formData)
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={remove}
      disabled={pending}
      aria-label={t.classes.remove}
      title={t.classes.remove}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <UserMinus className="size-3.5" />}
    </Button>
  )
}

/** The same decision from the student's side, which is theirs to make. */
export function LeaveClass({ classId }: { classId: string }) {
  const t = useT()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function leave() {
    if (!confirm(t.classes.leaveConfirm)) return
    const formData = new FormData()
    formData.set('class_id', classId)
    startTransition(async () => {
      await leaveClass(formData)
      router.refresh()
    })
  }

  return (
    <Button variant="ghost" size="sm" onClick={leave} disabled={pending}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
      {pending ? t.classes.leaving : t.classes.leave}
    </Button>
  )
}
