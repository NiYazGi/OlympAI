export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div
        className="flex items-center gap-3 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading OlympAI…
      </div>
    </main>
  )
}
