'use client'

import { useEffect, useState, type CSSProperties } from 'react'

/**
 * Marks the document before first paint so `[data-reveal]` content can start
 * hidden. Without JS the class never lands and everything is simply visible.
 */
export function MotionScript() {
  const script = `document.documentElement.classList.add('js-motion')`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}

/**
 * One observer for the whole document rather than one per element.
 *
 * Reveals: any `[data-reveal]` element resolves out of its blur the first time
 * it is 12% in view, and stays resolved. A MutationObserver picks up elements
 * that stream in after hydration (Suspense boundaries, client navigation).
 *
 * Spotlight: pointer position over a `.spotlight` element is written to two
 * custom properties, which the CSS turns into a soft light and a lit edge.
 */
export function MotionRuntime() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const reveal = (el: Element) => el.setAttribute('data-revealed', 'true')

    const io = reduce
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue
              reveal(entry.target)
              io?.unobserve(entry.target)
            }
          },
          { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
        )

    const scan = (root: ParentNode) => {
      root.querySelectorAll('[data-reveal]:not([data-revealed])').forEach((el) => {
        if (io) io.observe(el)
        else reveal(el)
      })
    }
    scan(document)

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          if (node.matches('[data-reveal]:not([data-revealed])')) {
            if (io) io.observe(node)
            else reveal(node)
          }
          scan(node)
        })
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    const onPointer = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest?.('.spotlight') as HTMLElement | null
      if (!target) return
      const rect = target.getBoundingClientRect()
      target.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
      target.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
    }
    document.addEventListener('pointermove', onPointer, { passive: true })

    return () => {
      io?.disconnect()
      mo.disconnect()
      document.removeEventListener('pointermove', onPointer)
    }
  }, [])

  return null
}

/** True once the window has scrolled past `offset` pixels. */
export function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > offset)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [offset])
  return scrolled
}

/**
 * A label that rolls over letter by letter when its link or button is hovered.
 * Screen readers get the plain text; the letter strips are hidden from them.
 */
export function RollText({ children }: { children: string }) {
  return (
    <span className="roll">
      <span className="sr-only">{children}</span>
      <span aria-hidden className="inline-flex">
        {Array.from(children).map((char, i) => (
          <span key={i} className="roll-char" data-c={char} style={{ '--i': i } as CSSProperties}>
            {char}
          </span>
        ))}
      </span>
    </span>
  )
}
