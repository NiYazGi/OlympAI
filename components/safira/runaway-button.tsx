'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const REPLIES = ['не-а', 'мимо!', 'слишком медленно', 'ну почти', 'ха-ха', 'даже не думай', 'а если так?', 'промах', 'я быстрее', 'ещё разок?']

/** How close, in px, the pointer may get to the button before it bolts. */
const DANGER = 60

export function RunawayButton() {
  const slot = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [tries, setTries] = useState(0)

  const flee = useCallback((px: number, py: number) => {
    const el = button.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const margin = 14
    const maxX = Math.max(margin, window.innerWidth - w - margin)
    const maxY = Math.max(margin, window.innerHeight - h - margin)

    let best = { x: margin, y: margin }
    let bestDistance = -1
    for (let i = 0; i < 30; i++) {
      const x = margin + Math.random() * (maxX - margin)
      const y = margin + Math.random() * (maxY - margin)
      const d = Math.hypot(x + w / 2 - px, y + h / 2 - py)
      if (d > bestDistance) {
        best = { x, y }
        bestDistance = d
      }
      if (d > 280) break
    }

    // First escape: start from where the button sits now so it visibly leaps.
    setPos((current) => {
      if (current) return best
      const r = el.getBoundingClientRect()
      requestAnimationFrame(() => setPos(best))
      return { x: r.left, y: r.top }
    })
    setTries((t) => t + 1)
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = button.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (
        e.clientX > r.left - DANGER &&
        e.clientX < r.right + DANGER &&
        e.clientY > r.top - DANGER &&
        e.clientY < r.bottom + DANGER
      ) {
        flee(e.clientX, e.clientY)
      }
    }
    const onResize = () => {
      setPos((p) => {
        const el = button.current
        if (!p || !el) return p
        return {
          x: Math.min(p.x, Math.max(14, window.innerWidth - el.offsetWidth - 14)),
          y: Math.min(p.y, Math.max(14, window.innerHeight - el.offsetHeight - 14)),
        }
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', onResize)
    }
  }, [flee])

  const dodge = (e: React.SyntheticEvent, x: number, y: number) => {
    e.preventDefault()
    flee(x, y)
  }

  const fixed = pos !== null
  const bubbleBelow = pos !== null && pos.y < 64

  return (
    <div ref={slot} className="sf-runaway-slot">
      <button
        ref={button}
        type="button"
        className={`sf-runaway${fixed ? ' sf-runaway-fixed' : ''}`}
        style={fixed ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined}
        onPointerDown={(e) => dodge(e, e.clientX, e.clientY)}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          dodge(e, r.left + r.width / 2, r.top + r.height / 2)
        }}
        onFocus={() => {
          const r = button.current?.getBoundingClientRect()
          if (r) flee(r.left + r.width / 2, r.top + r.height / 2)
        }}
      >
        получить 70гб
        {tries > 0 && (
          <span key={tries} className={`sf-runaway-bubble${bubbleBelow ? ' sf-runaway-bubble-below' : ''}`} aria-hidden>
            {REPLIES[(tries - 1) % REPLIES.length]}
          </span>
        )}
      </button>
      {tries > 0 && <p className="sf-runaway-count">попыток поймать: {tries}</p>}
    </div>
  )
}
