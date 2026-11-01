/**
 * Turns the downloaded physics olympiad JSON into rows shaped like `tasks`.
 *
 * It writes a file and touches nothing else. Every problem in this repository
 * is supposed to be read by a person before a student ever sees it — a wrong
 * reference solution produces wrong grades, which is worse than a missing
 * problem — so the output of this script is a review queue, not an insert.
 *
 *   node .tools/import-physics.mjs [--dir ~/Downloads] [--out .tools/out]
 *
 * What it does NOT do, on purpose:
 *   - write to the database (see import-physics-apply.mjs, once the licence of
 *     the source is settled; the licence column has no honest default)
 *   - import a problem whose figure is missing (see the report it prints)
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const SRC = (flag('dir', path.join(process.env.HOME, 'Downloads'))).replace('~', process.env.HOME)
const OUT = flag('out', '.tools/out')

/**
 * Which stage each paper belongs to.
 *
 * By what the contest is, not by how hard it felt: a national paper is
 * republican even when it is brutal, and a multi-country paper is
 * international even when it is gentle. F=ma is a screening exam and lands in
 * the lower tier for that reason rather than by reputation.
 */
const LEVEL = {
  IPhO: 'international',
  APhO: 'international',
  EuPhO: 'international',
  NBPhO: 'international',
  PanPhO: 'international',
  PanMechanics: 'international',
  CPhO: 'republican',
  'F=MA': 'republican',
}

/** The dataset's own subject split, onto the topics in this database. */
const TOPIC = {
  Mechanics: 'mechanics',
  Thermodynamics: 'thermodynamics',
  Electromagnetism: 'electrodynamics',
  Optics: 'optics',
  'Modern Physics': 'modern-physics',
}

/**
 * Points to a 1–5 difficulty.
 *
 * Marks are not comparable across papers — CPhO marks a problem out of 40 and
 * EuPhO out of 10 — so a sub-question is scored against the share of its own
 * paper's total that it carries, not against its raw points.
 *
 * The share alone is not difficulty, though. An IPhO paper splits into forty
 * sub-parts, so every one of them is a small share of it, and scoring by share
 * alone filed a sub-question of an Asian Physics Olympiad problem as "1 star,
 * five minutes". The level sets a floor: the easiest thing on an international
 * paper is still not the easiest thing a student will meet.
 */
const FLOOR = { international: 3, republican: 2, oblast: 1 }

function difficultyFrom(share, level) {
  const bySize = share >= 0.09 ? 5 : share >= 0.06 ? 4 : share >= 0.035 ? 3 : share >= 0.02 ? 2 : 1
  return Math.min(5, Math.max(bySize, FLOOR[level] ?? 1))
}

/** A stable, readable id: ipho-2025-1-a-1. */
const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

/**
 * The marking scheme and the boxed answer, as one reference solution.
 *
 * The rubric is the valuable half: it is what the jury actually rewards, step
 * by step, and it is what lets the grader give credit for a sound method that
 * ends in an arithmetic slip. The answer goes underneath it rather than at the
 * top, so a reviewer reads the reasoning first.
 */
function officialSolution(item) {
  const marking = (item.marking ?? []).flat().filter(Boolean)
  const answers = (item.answer ?? []).filter(Boolean)
  const units = item.unit ?? []
  const lines = []

  if (marking.length) {
    lines.push('Marking scheme (official):', ...marking.map((m) => `- ${m}`))
  }
  if (answers.length) {
    if (lines.length) lines.push('')
    lines.push('Answer:')
    answers.forEach((a, i) => {
      const unit = units[i] ? ` [${units[i]}]` : ''
      lines.push(`- ${String(a).replace(/^\\boxed\{|\}$/g, '')}${unit}`)
    })
  }
  return lines.join('\n')
}

/**
 * Minutes, from the share of a paper that normally runs five hours, with a
 * floor for the same reason the difficulty has one: nothing on an
 * international paper is a five-minute job.
 */
const MIN_MINUTES = { international: 15, republican: 10, oblast: 5 }

const minutesFrom = (share, level) =>
  Math.max(MIN_MINUTES[level] ?? 5, Math.round(share * 300))

async function main() {
  const files = (await readdir(SRC)).filter((f) => f.endsWith('.json'))
  if (files.length === 0) {
    console.error(`No .json files in ${SRC}`)
    process.exit(1)
  }

  const rows = []
  const skipped = []
  const unknownField = new Set()
  const unknownSource = new Set()

  for (const file of files.sort()) {
    let parsed
    try {
      parsed = JSON.parse(await readFile(path.join(SRC, file), 'utf8'))
    } catch {
      skipped.push({ file, why: 'not valid JSON' })
      continue
    }
    if (!Array.isArray(parsed)) {
      skipped.push({ file, why: 'not a list' })
      continue
    }

    const items = parsed.filter((x) => x && typeof x.question === 'string')
    if (items.length === 0) {
      skipped.push({ file, why: 'no items with a question field' })
      continue
    }

    // The paper's own total, so a share means the same thing across papers.
    const total = items.reduce(
      (sum, x) => sum + (x.points ?? []).reduce((a, b) => a + (Number(b) || 0), 0),
      0,
    )

    for (const item of items) {
      const source = String(item.source ?? file.replace(/\.json$/, ''))
      const family = source.split('_')[0]
      const level = LEVEL[family]
      const topic = TOPIC[item.field]
      if (!level) unknownSource.add(family)
      if (!topic) unknownField.add(item.field)

      const points = (item.points ?? []).reduce((a, b) => a + (Number(b) || 0), 0)
      const share = total > 0 ? points / total : 0
      const figures = item.image_question ?? []

      // The preamble is shared by every sub-question of a problem; the
      // sub-question itself is what the student is asked to produce.
      const context = Array.isArray(item.context) ? item.context.join('\n\n') : (item.context ?? '')
      const title = (context.match(/\[([^\]]{3,80})\]/)?.[1] ?? source).trim()

      // The dataset marks its structure with brackets: the problem's name
      // first, then [Introduction], [Part A - …]. The name is the title, so it
      // is dropped from the body rather than printed twice, and the rest
      // become plain headings — a student reading the statement should not be
      // reading someone's file format.
      const statement = context
        .replace(`[${title}]`, '')
        .replace(/^\s*\[([^\]]{3,80})\]\s*$/gm, (_, heading) => heading.trim())
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      rows.push({
        id: slugify(item.id ?? `${source}-${rows.length}`),
        level,
        topic_slug: topic ?? null,
        subject_slug: 'physics',
        title,
        problem: statement,
        find_prompt: item.question.trim(),
        official_solution: officialSolution(item),
        difficulty: difficultyFrom(share, level),
        estimated_minutes: minutesFrom(share, level),
        source,
        // Left empty on purpose. See the note at the top: there is no honest
        // default for a licence, and the trigger rejects the dishonest one.
        source_url: null,
        licence: null,
        attribution: null,
        // Review flags, dropped before anything is inserted.
        _points: points,
        _share: Number(share.toFixed(4)),
        _field: item.field,
        _modality: item.modality,
        _figures: figures,
        _needs_figure: figures.length > 0,
        _answer_types: item.answer_type ?? [],
      })
    }
  }

  await mkdir(OUT, { recursive: true })
  const ready = rows.filter((r) => !r._needs_figure && r.topic_slug && r.level)
  const blocked = rows.filter((r) => r._needs_figure)
  const unclassified = rows.filter((r) => !r._needs_figure && (!r.topic_slug || !r.level))

  await writeFile(path.join(OUT, 'physics-ready.json'), JSON.stringify(ready, null, 2))
  await writeFile(path.join(OUT, 'physics-needs-figures.json'), JSON.stringify(blocked, null, 2))
  if (unclassified.length) {
    await writeFile(path.join(OUT, 'physics-unclassified.json'), JSON.stringify(unclassified, null, 2))
  }

  const byLevel = {}
  const byTopic = {}
  for (const r of ready) {
    byLevel[r.level] = (byLevel[r.level] ?? 0) + 1
    byTopic[r.topic_slug] = (byTopic[r.topic_slug] ?? 0) + 1
  }

  console.log(`read ${files.length} file(s) from ${SRC}`)
  console.log(`  ${rows.length} sub-problems total`)
  console.log(`  ${ready.length} ready to review  → ${OUT}/physics-ready.json`)
  console.log(`  ${blocked.length} held back, figure not downloaded → ${OUT}/physics-needs-figures.json`)
  if (unclassified.length) console.log(`  ${unclassified.length} unclassified → ${OUT}/physics-unclassified.json`)
  console.log('\nready, by level :', byLevel)
  console.log('ready, by topic :', byTopic)
  console.log('difficulty spread:', ready.reduce((acc, r) => ((acc[r.difficulty] = (acc[r.difficulty] ?? 0) + 1), acc), {}))
  if (unknownField.size) console.log('\nfields with no topic :', [...unknownField].join(', '))
  if (unknownSource.size) console.log('sources with no level:', [...unknownSource].join(', '))
  for (const s of skipped) console.log(`skipped ${s.file}: ${s.why}`)
  console.log('\nNothing was written to the database. licence/source_url/attribution are empty by design.')
}

main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
