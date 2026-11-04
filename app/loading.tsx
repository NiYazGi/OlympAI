import { getT } from '@/lib/i18n/server'
export default async function Loading() {
  const t = await getT()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-void p-6">
      <div
        className="flex items-center gap-3 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <span className="size-4 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        {t('Loading OlympAI…')}
      </div>
    </main>
  )
}
