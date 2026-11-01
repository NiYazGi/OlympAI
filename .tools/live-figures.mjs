/**
 * Does the grader see a problem's figures? Against the real model.
 *
 * Two calls. The first asks the model only to describe the attached figure,
 * which shows whether the image arrived and was read — a model that got no
 * picture describes the statement instead. The second runs the real grader on
 * a problem whose answer depends on the picture, to show the request shape is
 * one the provider accepts.
 *
 *   node --import ./.tools/register.mjs .tools/live-figures.mjs [task-id]
 *
 * Writes nothing.
 */
import { readFile } from 'node:fs/promises'

const ROOT = '/Users/niya/Desktop/OlympAI'
const raw = await readFile(`${ROOT}/.env.local`, 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}

const { createAdminClient } = await import('@/lib/supabase/admin')
const { gradeAttempt } = await import('@/lib/sulu/grade')
const { requestSuluJson } = await import('@/lib/sulu/provider')
const { imagesFor } = await import('@/lib/sulu/images')
const { figuresIn } = await import('@/lib/statement-figures')

const id = process.argv[2] ?? 'bcpf-phys-oblast-2011-9-1-3'
const { data: task } = await createAdminClient()
  .from('tasks')
  .select('id, title, problem, difficulty, given, find_prompt, official_solution, hints, diagram_url')
  .eq('id', id)
  .single()
if (!task) throw new Error(`no task ${id}`)

const sources = [...figuresIn(task.problem), task.diagram_url]
const images = await imagesFor(sources)
console.log(`${id}: ${sources.filter(Boolean).length} figure(s), ${images.length} sent`)
if (!images.length) process.exit(1)

const described = await requestSuluJson(
  'Describe only what the attached image shows, in two sentences. If no image is attached, say "NO IMAGE".',
  'What is in the image?',
  {
    name: 'description',
    schema: {
      type: 'object',
      properties: { description: { type: 'string' } },
      required: ['description'],
      additionalProperties: false,
    },
  },
  images,
)
console.log(`\nmodel sees: ${described.description}`)

const grade = await gradeAttempt(
  {
    title: task.title,
    problem: task.problem,
    given: task.given ?? [],
    findPrompt: task.find_prompt,
    officialSolution: task.official_solution,
    difficulty: task.difficulty,
    hints: task.hints ?? [],
    diagramUrl: task.diagram_url,
  },
  'Не знаю.',
)
console.log(`\ngrader: ${grade.verdict} ${grade.score} — ${grade.feedback}`)
