import type { Dictionary } from '@/lib/i18n/dictionaries'

/**
 * The guided tour, as data.
 *
 * Each step names what it points at by a `data-tour` value in the page, in
 * order of preference: the first one that is on screen wins. Nav items are on
 * the rail on a laptop and in the bottom bar on a phone, and three of them are
 * behind "More" on a phone — so those steps fall back to the More button and
 * say so. A step whose target is nowhere (a teacher with no classes yet) is
 * shown in the middle of the screen rather than skipped: the words still hold.
 */
export type TourStepKey = keyof Dictionary['tour']['steps']

export type TourStep = {
  key: TourStepKey
  /** `data-tour` values to point at; none for a step that is just words. */
  targets: string[]
  /** Shown under the text when the step had to fall back to "More". */
  more?: boolean
}

const STUDENT: TourStep[] = [
  { key: 'welcome', targets: [] },
  { key: 'today', targets: ['today'] },
  { key: 'stats', targets: ['stats'] },
  { key: 'flame', targets: ['flame'] },
  { key: 'day', targets: ['day'] },
  { key: 'plan', targets: ['nav:/plan', 'nav:more'], more: true },
  { key: 'learn', targets: ['nav:/learn'] },
  { key: 'tasks', targets: ['nav:/tasks'] },
  { key: 'mock', targets: ['nav:/mock'] },
  { key: 'sulu', targets: ['nav:/sulu-ai'] },
  { key: 'classes', targets: ['nav:/class', 'nav:more'], more: true },
  { key: 'finish', targets: ['today'] },
]

const TEACHER: TourStep[] = [
  { key: 'teacherWelcome', targets: [] },
  { key: 'teacherCreate', targets: ['class-create'] },
  { key: 'teacherPlan', targets: ['class-list'] },
  { key: 'teacherLearn', targets: ['nav:/learn'] },
  { key: 'teacherTasks', targets: ['nav:/tasks'] },
  { key: 'teacherOlympiads', targets: ['nav:/olympiads'] },
  { key: 'teacherFinish', targets: ['class-create'] },
]

export type TourRole = 'student' | 'teacher'

export const tourFor = (role: TourRole) => (role === 'teacher' ? TEACHER : STUDENT)

/** Where each kind of account's tour runs: the page its targets are on. */
export const tourHome = (role: TourRole) => (role === 'teacher' ? '/class' : '/dashboard')
