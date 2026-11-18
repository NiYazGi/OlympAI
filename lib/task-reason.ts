import { skillById, taskSkills, type SkillTask } from '@/lib/skill-catalogue'

/**
 * Why the plan put this problem in today's session, in the terms the planner
 * itself uses (lib/daily-preparation.ts): weak skills from the diagnostic,
 * weak topics, the difficulty of the stage and phase, the topics the target
 * olympiad keeps setting, and the mistake log. Each reason is a translation
 * key with its values, so the page can say it in the student's language.
 */

export type Reason = { key: string; vars?: Record<string, string | number> }

const STAGE_DIFFICULTY: Record<string, number> = { School: 2, Regional: 3, National: 4, International: 5 }
const PHASE_LABEL: Record<string, string> = {
  foundation: 'Base', strengthening: 'Strengthening', competition: 'Competition practice', taper: 'Easing off', rest: 'Rest',
}

export function taskReasons(
  task: SkillTask & { difficulty: number; topic: string },
  context: {
    phase: string
    stage: string | null
    skillScores: Readonly<Record<string, number>>
    topicMastery: number | null
    /** Position of the topic among what the target olympiad sets most, 0 = most. */
    topicRank: number | null
    retest: boolean
  },
): Reason[] {
  const reasons: Reason[] = []
  if (context.retest) reasons.push({ key: 'A check after a mistake in your log: solve it without hints.' })

  const weak = taskSkills(task)
    .filter((link) => link.provenance === 'editorial' && (context.skillScores[link.id] ?? 100) < 60)
    .map((link) => skillById(link.id)?.name ?? link.name)
  if (weak.length) reasons.push({ key: 'The diagnostic found a gap in “{skill}”, and this problem trains exactly that.', vars: { skill: weak[0] } })

  if (context.topicMastery !== null && context.topicMastery < 50) {
    reasons.push({ key: '“{topic}” is still a weak topic: {n}% of your solutions in it are correct.', vars: { topic: task.topic, n: context.topicMastery } })
  }
  if (context.topicRank !== null && context.topicRank < 3) {
    reasons.push({ key: 'Your olympiad sets problems on “{topic}” often.', vars: { topic: task.topic } })
  }

  const target = context.stage ? STAGE_DIFFICULTY[context.stage] : null
  if (target) {
    reasons.push({
      key: 'Difficulty {d} of 5: the level of the {stage} stage, adjusted for the “{phase}” phase.',
      vars: { d: task.difficulty, stage: context.stage!, phase: PHASE_LABEL[context.phase] ?? context.phase },
    })
  }
  if (!reasons.length) reasons.push({ key: 'The next problem on your route in “{topic}”.', vars: { topic: task.topic } })
  return reasons.slice(0, 3)
}
