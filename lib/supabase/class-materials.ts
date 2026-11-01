import 'server-only'

import { cache } from 'react'
import { getReference } from '@/lib/supabase/reference'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/server'

/**
 * A class's own material: the problems its teacher wrote and the files they
 * handed out (migration 55).
 *
 * Read as the signed-in user throughout, so the row policies are the whole
 * check: a teacher sees their class's, a student sees the classes they are in,
 * and anyone else sees nothing — not an empty list from a filter that could be
 * forgotten.
 */
export type ClassTask = {
  id: string
  title: string
  topic: string | null
  difficulty: number
  createdAt: string
}

export type ClassFile = {
  id: string
  name: string
  size: number
  mime: string
  createdAt: string
}

export type ClassMaterials = { tasks: ClassTask[]; files: ClassFile[] }

export const getClassMaterials = cache(async (classId: string): Promise<ClassMaterials> => {
  if (!hasSupabaseEnv()) return { tasks: [], files: [] }
  const [supabase, reference] = await Promise.all([createClient(), getReference()])
  const [{ data: tasks }, { data: files }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, topic_id, difficulty, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false }),
    supabase
      .from('class_files')
      .select('id, name, size, mime, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false }),
  ])
  return {
    tasks: (tasks ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      topic: reference.topicById[task.topic_id] ?? null,
      difficulty: task.difficulty,
      createdAt: task.created_at,
    })),
    files: (files ?? []).map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      mime: file.mime,
      createdAt: file.created_at,
    })),
  }
})

/** The topics a class's problem may be filed under: its subject's, or all. */
export const getClassTopics = cache(async (subjectId: string | null) => {
  const reference = await getReference()
  return reference.topics
    .filter((topic) => !subjectId || topic.subject_id === subjectId)
    .sort((a, b) => a.position - b.position)
    .map((topic) => ({ id: topic.id, name: topic.name }))
})
