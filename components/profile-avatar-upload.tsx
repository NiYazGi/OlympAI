'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus } from 'lucide-react'
import { saveProfileAvatar, type PreferencesResult } from '@/app/(app)/me/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

async function avatarThumbnail(file: File): Promise<Blob | null> {
  const image = await createImageBitmap(file)
  try {
    const side = Math.min(image.width, image.height)
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256)
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
  } finally {
    image.close()
  }
}

export function ProfileAvatarUpload({ hasAvatar }: { hasAvatar: boolean }) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<PreferencesResult | null>(null)
  const [pending, startTransition] = useTransition()
  const label = t(hasAvatar ? 'Change profile photo' : 'Add profile photo')

  function upload(file: File) {
    setResult(null)
    if (!IMAGE_TYPES.includes(file.type) || file.size > 10 * 1024 * 1024) {
      setResult({ ok: false, error: t('Choose a JPEG, PNG or WebP image up to 10 MB.') })
      return
    }

    startTransition(async () => {
      let thumbnail: Blob | null = null
      try {
        thumbnail = await avatarThumbnail(file)
      } catch {
        // A corrupt image can have a valid filename and MIME type.
      }
      if (!thumbnail) {
        setResult({ ok: false, error: t('Choose a valid JPEG, PNG or WebP image.') })
        return
      }
      const form = new FormData()
      form.set('avatar', thumbnail, 'avatar')
      try {
        setResult(await saveProfileAvatar(form))
      } catch {
        setResult({ ok: false, error: t('The profile photo could not be saved. Try again.') })
      }
    })
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept={IMAGE_TYPES.join(',')} aria-label={label} hidden disabled={pending}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) upload(file)
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
        <ImagePlus aria-hidden /> {pending ? t('Saving…') : label}
      </Button>
      {result?.ok ? <span role="status" className="text-xs text-muted-foreground">{t('Profile photo updated.')}</span> : null}
      {result?.error ? <span role="alert" className="text-xs text-destructive">{result.error}</span> : null}
    </div>
  )
}
