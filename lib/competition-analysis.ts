import type { CatalogueTask } from '@/lib/types'

export const ARCHIVE_PREFIXES: Record<string, string> = {
  'kz-national-math': 'national-', 'kz-regional-math': 'oblast-',
  'kz-national-physics': 'phys-national-', 'kz-regional-physics': 'phys-oblast-',
  gzho: 'gzho-', apmo: 'apmo-', bmo: 'bmo-', jbmo: 'jbmo-', 'silk-road': 'silk-road-',
}

export function isCompetitionTask(task: { id: string }, slug: string | null) {
  const prefix = slug && ARCHIVE_PREFIXES[slug]
  return Boolean(prefix && task.id.startsWith(prefix))
}

const MATHEMATICAL_METHODS = [
  { topic: 'Geometry', patterns: [/треугольник|triangle/i, /окружност|circumcircle|incircle/i, /биссект|медиан|ортоцентр/i, /касательн|хорд|tangent/i, /\\angle|угол|angle/i] },
  { topic: 'Combinatorics', patterns: [/раскрас|раскраск|colour|coloring/i, /граф|вершин|graph/i, /комбин|перестанов|разбиени/i, /сколькими|количество способов|how many|число способов/i, /групп|карточ|фишк|шахмат/i] },
  { topic: 'Number Theory', patterns: [/простых|простое число|prime/i, /делимост|делится|divisib/i, /остаток|остатк|remainder|\\pmod/i, /взаимно прост|coprime|gcd/i, /целочислен|integer solution/i] },
  { topic: 'Algebra', patterns: [/многочлен|polynomial/i, /неравенств|inequality/i, /функци|functional/i, /корн|roots/i, /последовательност|sequence/i] },
]

/** Conservative correction of clear archive-import errors. Ambiguous and
 * mixed-method statements keep their original topic. */
export function analysedTaskTopic(task: { topic: string; subject: string; problem: string }) {
  if (task.subject !== 'Mathematics') return task.topic
  const scores = MATHEMATICAL_METHODS.map(({ topic, patterns }) => ({
    topic, score: patterns.filter((pattern) => pattern.test(task.problem)).length * 2 + (topic === task.topic ? 2 : 0),
  })).sort((a, b) => b.score - a.score)
  return scores[0].score >= 4 && scores[0].score - scores[1].score >= 2 ? scores[0].topic : task.topic
}

export function analyseCompetition(tasks: CatalogueTask[], subject: string, slug: string | null) {
  const ownArchive = tasks.filter((task) => task.subject === subject && isCompetitionTask(task, slug))
  const pool = ownArchive.length ? ownArchive : tasks.filter((task) => task.subject === subject)
  const counts = new Map<string, number>()
  for (const task of pool) counts.set(task.topic, (counts.get(task.topic) ?? 0) + 1)
  return {
    hasArchive: ownArchive.length > 0,
    taskCount: ownArchive.length,
    topics: [...counts].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count),
  }
}
