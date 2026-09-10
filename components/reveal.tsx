import { Suspense, ViewTransition, type ReactNode } from 'react'

/**
 * A Suspense boundary whose skeleton hands over to the content instead of
 * being replaced by it.
 *
 * Without this the swap is instantaneous: the placeholder vanishes and the real
 * thing appears in the same frame, which reads as a flicker rather than as
 * loading finishing. Here the skeleton leaves downward and quickly, the content
 * arrives upward and more gently, and the arrival waits for the departure so
 * the two never overlap.
 *
 * `default="none"` keeps both halves still during navigations they are not part
 * of — otherwise every named transition on the page animates whenever any
 * transition runs.
 *
 * The timings live in one place, app/globals.css, so the whole app loads with
 * the same gesture rather than eight slightly different ones.
 */
export function Reveal({
  fallback,
  children,
}: {
  fallback: ReactNode
  children: ReactNode
}) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="slide-down" default="none">
          {fallback}
        </ViewTransition>
      }
    >
      <ViewTransition enter="slide-up" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  )
}
