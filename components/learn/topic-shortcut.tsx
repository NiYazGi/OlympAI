import Link from 'next/link'
import { Brain, BookOpen, ClipboardCheck, Layers } from 'lucide-react'
import type { TopicShortcut as Shortcut } from '@/lib/supabase/study'
import { getT } from '@/lib/i18n'
import { cardClass, cn } from '@/lib/utils'

/**
 * "This problem is the last step of Mechanics" — with the earlier steps linked.
 *
 * Rendered on the task page. Nothing here is a hint about the problem itself;
 * it is the route back to the material, which is a different kind of help from
 * the one the grader and the coach provide.
 */
export async function TopicShortcutPanel({ shortcut }: { shortcut: Shortcut }) {
  const t = await getT()
  const links = [
    shortcut.lessonTitle
      ? {
          href: `/learn/${shortcut.slug}/lesson`,
          icon: BookOpen,
          label: t.shortcut.readNotes,
          detail: shortcut.lessonTitle,
        }
      : null,
    shortcut.quizTotal > 0
      ? {
          href: `/learn/${shortcut.slug}/quiz`,
          icon: ClipboardCheck,
          label: t.shortcut.checkYourself,
          detail:
            shortcut.quizLeft > 0
              ? t.shortcut.quizLeft(shortcut.quizLeft, shortcut.quizTotal)
              : t.shortcut.quizAll(shortcut.quizTotal),
        }
      : null,
    shortcut.cardsTotal > 0
      ? {
          href: `/learn/${shortcut.slug}/cards`,
          icon: Brain,
          label: t.shortcut.cards,
          detail:
            shortcut.cardsDue > 0
              ? t.shortcut.cardsDue(shortcut.cardsDue)
              : t.shortcut.cardsNoneDue(shortcut.cardsTotal),
        }
      : null,
  ].filter((item) => item !== null)

  if (links.length === 0) return null

  return (
    <section className={cn(cardClass, 'p-4 sm:p-5')}>
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">
          {t.shortcut.lastStepOf}{' '}
          <Link
            href={`/learn/${shortcut.slug}`}
            prefetch
            className="text-primary underline-offset-4 hover:underline"
          >
            {shortcut.name}
          </Link>
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Stuck on the method rather than the arithmetic? Go back a step.
      </p>

      <ul className="mt-3 space-y-1.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              prefetch
              className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/60"
            >
              <link.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{link.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{link.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
