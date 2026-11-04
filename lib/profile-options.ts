/**
 * The closed sets of values a profile may hold. Shared by the onboarding flow,
 * the profile form and the server action that validates the submission — a
 * `'use server'` module may only export async functions, so they live here.
 */
export const SUBJECTS = [
  'Physics',
  'Mathematics',
] as const
export const GRADES = ['Grade 7–8', 'Grade 9–10', 'Grade 11–12', 'University'] as const

/**
 * The school grades a profile answer covers, for matching tasks set per grade.
 * University students get the senior papers, the hardest there are.
 */
export function gradeRange(grade: string | null | undefined): [number, number] | null {
  switch (grade) {
    case 'Grade 7–8':
      return [7, 8]
    case 'Grade 9–10':
      return [9, 10]
    case 'Grade 11–12':
    case 'University':
      return [11, 12]
    default:
      return null
  }
}

/** True when a task set for gradeMin-gradeMax suits a student in `range`. Ungraded tasks suit everyone. */
export function fitsGrade(task: { gradeMin: number | null; gradeMax: number | null }, range: [number, number] | null) {
  if (!range || task.gradeMin === null || task.gradeMax === null) return true
  return task.gradeMin <= range[1] && task.gradeMax >= range[0]
}
export const LEVELS = ['Getting started', 'Building momentum', 'Competition ready'] as const
export const GOALS = [
  'Build a consistent practice habit',
  'Reach a new personal rating',
  'Qualify for my national team',
] as const
export const TARGET_COMPETITION_TYPES = [
  'School or regional',
  'National selection',
  'International preparation',
  'Exploring for now',
] as const
export const INTENSITIES = [
  '3 short sessions a week',
  '5 focused sessions a week',
  'Daily intensive practice',
] as const

export const PROFILE_OPTIONS = {
  grade: GRADES,
  primary_subject: SUBJECTS,
  level: LEVELS,
  goal: GOALS,
  target_competition_type: TARGET_COMPETITION_TYPES,
  training_intensity: INTENSITIES,
} as const

export type ProfileField = keyof typeof PROFILE_OPTIONS

/** Fields a student may leave unanswered during onboarding. */
export const OPTIONAL_FIELDS = ['target_competition_type'] as const satisfies readonly ProfileField[]

export function isOptional(field: ProfileField) {
  return (OPTIONAL_FIELDS as readonly string[]).includes(field)
}

export function isAllowed(field: ProfileField, value: unknown): value is string {
  return typeof value === 'string' && (PROFILE_OPTIONS[field] as readonly string[]).includes(value)
}
