type TopicReference = { id: string; name: string; slug: string; subject_id: string }
type TaskReference = { id: string; topic_id: string; subject_id: string }
type Attempt = { task_id: string; is_correct: boolean }

/** Topic names are labels, not identities: Geometry can belong to two subjects. */
export function topicAccuracy(
  attempts: readonly Attempt[], tasks: readonly TaskReference[], topics: readonly TopicReference[],
  subjectById: Readonly<Record<string, string>>, translate: (text: string) => string = (text) => text,
) {
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const topicById = new Map(topics.map((topic) => [topic.id, topic]))
  const subjectsByName = new Map<string, Set<string>>()
  for (const topic of topics) {
    const subjects = subjectsByName.get(topic.name) ?? new Set<string>()
    subjects.add(topic.subject_id)
    subjectsByName.set(topic.name, subjects)
  }
  const counts = new Map<string, { topic?: TopicReference; attempts: number; correct: number }>()
  for (const attempt of attempts) {
    const task = taskById.get(attempt.task_id)
    const linked = task ? topicById.get(task.topic_id) : undefined
    // A stale or malformed reference cannot contribute evidence to a real topic.
    const topic = linked?.subject_id === task?.subject_id ? linked : undefined
    const key = topic?.id ?? '__unknown__'
    const current = counts.get(key) ?? { topic, attempts: 0, correct: 0 }
    current.attempts += 1
    current.correct += attempt.is_correct ? 1 : 0
    counts.set(key, current)
  }
  return [...counts.values()].map(({ topic, attempts, correct }) => ({
    topic: topic ? (subjectsByName.get(topic.name)!.size > 1
      ? `${translate(topic.name)} · ${translate(subjectById[topic.subject_id] ?? 'Practice')}` : topic.name) : 'General practice',
    slug: topic?.slug,
    attempts,
    correct,
    mastery: Math.round(correct / attempts * 100),
  })).sort((a, b) => a.mastery - b.mastery)
}
