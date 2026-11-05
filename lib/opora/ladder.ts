/**
 * Opora's hint ladder, shared by the server and the chat.
 *
 * A student climbs only when they ask or when they are stuck; a direct
 * question is answered directly at whatever level they are on.
 */

/** 1 nudge, 2 idea, 3 step, 4 walkthrough, 5 check of understanding. */
export type Level = 1 | 2 | 3 | 4 | 5

/** What the student pressed. `ask` is a typed message. */
export type TutorAction = 'hint' | 'more' | 'reveal' | 'check' | 'ask'

export const TUTOR_ACTIONS: TutorAction[] = ['hint', 'more', 'reveal', 'check', 'ask']

/** The card field that holds a ready text for a level, where one can exist. */
export const HINT_KEYS = { 1: 'nudge', 2: 'idea', 3: 'step', 5: 'check' } as const
export type HintKey = (typeof HINT_KEYS)[keyof typeof HINT_KEYS]

/** English keys, translated where shown. */
export const LEVEL_LABEL: Record<Level, string> = {
  1: 'Nudge',
  2: 'Idea',
  3: 'Step',
  4: 'Walkthrough',
  5: 'Check',
}

/** What the student's own bubble says for a button press. */
export const ACTION_TEXT: Record<Exclude<TutorAction, 'ask'>, string> = {
  hint: 'Give me a hint',
  more: 'Explain in more detail',
  reveal: 'Show the solution',
  check: 'Check my understanding',
}

/** Which level an action asks for, given the highest level reached so far. */
export function targetLevel(action: TutorAction, reached: number): Level {
  const current = Math.max(0, Math.min(5, reached))
  switch (action) {
    case 'hint':
      return Math.min(3, current + 1) as Level
    case 'more':
      return Math.max(1, Math.min(3, current || 1)) as Level
    case 'reveal':
      return 4
    case 'check':
      return 5
    case 'ask':
      return Math.max(1, Math.min(4, current || 1)) as Level
  }
}

export type TutorMeta = { level: Level; source: 'model' | 'card'; guarded?: boolean; action?: TutorAction }
