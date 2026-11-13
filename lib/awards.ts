/**
 * The awards an account can hold. `auto` ones are given by the server when
 * the condition is met (lib/community.ts, syncAwards); `manual` ones only by
 * an admin, from the user's profile. Shared with the client for the copy.
 */
export type AwardKind = 'auto' | 'manual'
export type AwardTier = 'bronze' | 'silver' | 'gold' | 'special'

export type Award = {
  id: string
  title: string
  description: string
  icon: string
  tier: AwardTier
  kind: AwardKind
}

export const AWARDS: Award[] = [
  // Practice
  { id: 'solver-1', title: 'First solution', description: 'Solved a first problem.', icon: '✦', tier: 'bronze', kind: 'auto' },
  { id: 'solver-10', title: 'Ten solved', description: 'Solved 10 different problems.', icon: '✶', tier: 'bronze', kind: 'auto' },
  { id: 'solver-50', title: 'Fifty solved', description: 'Solved 50 different problems.', icon: '✷', tier: 'silver', kind: 'auto' },
  { id: 'solver-150', title: 'Olympiad workhorse', description: 'Solved 150 different problems.', icon: '✹', tier: 'gold', kind: 'auto' },
  { id: 'three-subjects', title: 'All-rounder', description: 'Solved problems in mathematics, physics and informatics.', icon: '◆', tier: 'silver', kind: 'auto' },
  // Forum
  { id: 'first-thread', title: 'Opened a discussion', description: 'Started a first forum thread.', icon: '❝', tier: 'bronze', kind: 'auto' },
  { id: 'first-reply', title: 'First reply', description: 'Answered someone on the forum.', icon: '↩', tier: 'bronze', kind: 'auto' },
  { id: 'helper', title: 'Helper', description: 'A reply was marked as the solution.', icon: '✔', tier: 'silver', kind: 'auto' },
  { id: 'liked-10', title: 'Worth reading', description: 'Posts collected 10 likes.', icon: '♥', tier: 'silver', kind: 'auto' },
  { id: 'mentor', title: 'Mentor', description: 'Five replies marked as the solution.', icon: '★', tier: 'gold', kind: 'auto' },
  // Given by the team
  { id: 'olympiad-winner', title: 'Olympiad winner', description: 'A prize at a real olympiad, confirmed by the team.', icon: '🏆', tier: 'special', kind: 'manual' },
  { id: 'week-best', title: 'Student of the week', description: 'Chosen by the team for the week’s work.', icon: '☀', tier: 'special', kind: 'manual' },
  { id: 'bug-hunter', title: 'Bug hunter', description: 'Found and reported a real problem on the site.', icon: '⚑', tier: 'special', kind: 'manual' },
  { id: 'early-tester', title: 'Early tester', description: 'Tried OlympAI before the launch.', icon: '◎', tier: 'special', kind: 'manual' },
]

export function awardById(id: string): Award | null {
  return AWARDS.find((award) => award.id === id) ?? null
}
