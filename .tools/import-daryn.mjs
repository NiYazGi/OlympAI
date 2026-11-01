/**
 * Reads the daryn.kz physics papers and shapes them like `tasks`.
 *
 * Different from .tools/import-bcpf-physics.mjs in the one way that matters:
 * **these papers come with official solutions**, published as their own PDFs
 * next to the problems. Of 1739 problems in the catalogue, 168 have a
 * reference solution; the grader works without one and says so, but it marks
 * better with one. So the pairing of a paper to its solutions is the point of
 * this importer, not a bonus.
 *
 *   node .tools/import-daryn.mjs            # writes a review file
 *   node .tools/import-daryn.mjs --confirm  # writes to the database
 *   node .tools/import-daryn.mjs --remove
 *
 * Each paper carries the same problems twice, Kazakh first and Russian after.
 * The Russian half is taken where it exists: the interface is Russian, the
 * grader reasons better in it, and keeping both would be the same problem
 * entered twice.
 *
 * No licence is invented. daryn.kz states none, so every row goes in as
 * `unknown` — but unlike the bc-pf import, the source URL here is the rights
 * holder's own site rather than a mirror.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import pg from 'pg'
import { layoutOf } from './pdf-figures.mjs'
import {
  FIGURE,
  MARKER,
  difficultyFor,
  preferRussian,
  splitProblems,
  stack,
  stageFrom,
  textOf,
  topicFor,
  withoutLetterhead,
} from './daryn-parse.mjs'

const require = createRequire(import.meta.url)
const args = process.argv.slice(2)
const ROOT =
  args.find((a) => !a.startsWith('--')) ??
  '/Users/niya/Downloads/Олимпиады_Daryn_Физика_Математика'
const OUT = '.tools/out'
const ID = 'daryn-phys'
// Not under public/tasks/: that is also a route prefix, and a static file one
// segment below a dynamic route is a question nobody should have to answer.
const FIGURE_DIR = 'public/figures/daryn'

/** macOS stores these folder names decomposed; the manifest wrote them composed. */
const nfc = (s) => s.normalize('NFC')

/** A comma-separated file whose fields may be quoted and contain commas. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') field += char
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.length > 1)
}

/**
 * Which paper a file is, from its name.
 *
 * Two naming schemes, one per year, and neither is documented anywhere but in
 * the files themselves:
 *
 *   2021-2022   phis_9_1-2.pdf   theory round        phis9_1_sol.pdf
 *               phis_9_2.pdf     experimental round  phis9_2_sol.pdf
 *   2022-2023   ph9.pdf          round 1             solph9.pdf
 *               2ph9.pdf         round 2             2solph9.pdf
 */
function identify(base) {
  let m
  if ((m = base.match(/^phis_(\d{1,2})_1-2$/))) return { grade: +m[1], round: 1 }
  if ((m = base.match(/^phis_(\d{1,2})_2$/))) return { grade: +m[1], round: 2 }
  if ((m = base.match(/^phis(\d{1,2})_(\d)_sol$/)))
    return { grade: +m[1], round: +m[2], solution: true }
  if ((m = base.match(/^(2?)solph(\d{1,2})$/)))
    return { grade: +m[2], round: m[1] ? 2 : 1, solution: true }
  if ((m = base.match(/^(2?)ph(\d{1,2})$/))) return { grade: +m[2], round: m[1] ? 2 : 1 }
  return null
}

/**
 * Which figure belongs to which problem — read off the pictures by eye.
 *
 * Nothing here could be derived. The figures float in the page, so position
 * puts the prism above problem 1 when it belongs to problem 4; and each paper
 * prints its problems twice, Kazakh then Russian, so the same drawing appears
 * two or three times at slightly different scales and no hash catches it.
 *
 * Twenty-four pictures is small enough to look at. The numbers are indices
 * into that file's figures in reading order, and the order inside each list is
 * the order they are stacked in when a problem has more than one. Anything not
 * listed is a duplicate of something that is.
 */
const FIGURES = {
  'phis_9_1-2': { 1: [0], 2: [1], 4: [2], 5: [3] },
  'phis_10_1-2': { 1: [1, 0], 2: [5], 3: [3, 4] },
  'phis_11_1-2': { 1: [1, 0], 2: [2], 3: [3, 4] },
  ph9: { 2: [2], 4: [0, 1] },
  ph10: { 1: [0], 4: [1, 2] },
  ph11: { 1: [0] },
  '2ph10': { 1: [0] },
}

async function main() {
  const { execSync } = require('node:child_process')
  const files = execSync(`find "${ROOT}" -path '*/Физика/*' -name '*.pdf'`, {
    encoding: 'utf8',
    maxBuffer: 8 << 20,
  })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(nfc)
    .sort()

  // The manifest carries the page each PDF came from — but several downloads
  // wrote to the same filename, so a path can have more than one candidate
  // URL. Every candidate is kept and the paper's own header picks between
  // them: ph9.pdf was fetched from both /oblast/ and /rayon/, and the file on
  // disk says which stage it is.
  const manifest = new Map()
  const csv = await readFile(path.join(ROOT, 'manifest.csv'), 'utf8')
  const [head, ...lines] = parseCsv(csv)
  const columns = head.map((c) => c.replace(/^﻿/, ''))
  for (const cells of lines) {
    if (cells.length < columns.length) continue
    const row = Object.fromEntries(columns.map((c, i) => [c, cells[i]]))
    const key = nfc(row.local ?? '')
    if (!key) continue
    manifest.set(key, [...new Set([...(manifest.get(key) ?? []), row.url])])
  }

  /** The one URL that agrees with the stage the paper names, or none. */
  const urlFor = (file, stage) => {
    const candidates = manifest.get(file) ?? []
    if (candidates.length === 1) return candidates[0]
    const fitting = candidates.filter((url) =>
      stage === 'oblast'
        ? url.includes('/oblast/')
        : !url.includes('/oblast/') && !url.includes('/rayon/'),
    )
    return fitting.length === 1 ? fitting[0] : null
  }

  const papers = new Map()
  const skipped = []

  for (const file of files) {
    const base = path.basename(file, '.pdf')
    const id = identify(base)
    if (!id) {
      skipped.push([file, 'name does not say which paper it is'])
      continue
    }
    let text
    try {
      text = await textOf(file)
    } catch (cause) {
      skipped.push([file, `unreadable: ${cause.message}`])
      continue
    }

    const year = file.split(path.sep).find((p) => /^\d{4}-\d{4}$/.test(p)) ?? ''
    const stage = stageFrom(text, null)
    if (!stage) {
      skipped.push([file, 'the header does not name a stage'])
      continue
    }
    const url = urlFor(file, stage)
    if (!url) {
      // Twelve downloads wrote to uc.pdf and nothing says which one won. The
      // source page is the whole licence story here, so a row that cannot name
      // the page it came from does not go in.
      skipped.push([file, 'several downloads wrote to this filename — its page cannot be named'])
      continue
    }

    // The experimental round is apparatus work — "measure this with a
    // dynamometer" — and the grader marks written derivations.
    if (/экспериментальн|тәжірибел/i.test(text.slice(0, 700))) {
      skipped.push([file, 'experimental round'])
      continue
    }

    const key = `${year}/${id.grade}/${id.round}`
    const entry = papers.get(key) ?? { year, stage, grade: id.grade, round: id.round }
    if (id.solution) Object.assign(entry, { solutionText: text, solutionUrl: url })
    else Object.assign(entry, { text, url, stage, file, base })
    papers.set(key, entry)
  }

  const rows = []
  const unpaired = []
  const missingFigure = []
  const images = new Map()

  for (const [key, paper] of [...papers].sort()) {
    if (!paper.text) {
      skipped.push([key, 'solutions with no paper'])
      continue
    }

    // The pictures, if this paper has any that were worth keeping.
    const wanted = FIGURES[paper.base] ?? {}
    const figures = Object.keys(wanted).length
      ? (await layoutOf(new Uint8Array(await readFile(paper.file)), MARKER)).figures
      : []
    const { text, language } = preferRussian(paper.text)
    const problems = splitProblems(text)
    const solutions = new Map(
      paper.solutionText
        ? splitProblems(preferRussian(paper.solutionText).text).map((s) => [s.number, s.statement])
        : [],
    )

    // A single-task round numbers nothing: the whole paper is one problem,
    // and its solution file is one solution.
    const single = problems.length === 0
    const list = single
      ? [{ number: 1, statement: withoutLetterhead(text).replace(/\s+/g, ' ').trim(), points: 15 }]
      : problems
    if (single && paper.solutionText && solutions.size === 0) {
      solutions.set(
        1,
        withoutLetterhead(preferRussian(paper.solutionText).text).replace(/\s+/g, ' ').trim(),
      )
    }

    for (const problem of list) {
      const solution = solutions.get(problem.number) ?? null
      const picked = (wanted[problem.number] ?? []).map((i) => figures[i]).filter(Boolean)
      const id = `${ID}-${paper.stage}-${paper.year}-${paper.grade}-${paper.round}-${problem.number}`
      if (picked.length) images.set(id, stack(picked))
      const row = {
        id,
        subject_slug: 'physics',
        topic_slug: topicFor(problem.statement),
        level: paper.stage,
        title: `${paper.stage === 'oblast' ? 'Областной' : 'Республиканский'} этап ${paper.year}, ${paper.grade} класс, ${paper.round} тур — задача ${problem.number}`,
        problem: problem.statement,
        official_solution: solution,
        difficulty: difficultyFor(paper.stage, paper.grade),
        estimated_minutes: problem.points ? Math.min(90, Math.round(problem.points * 8)) : null,
        source: `Республиканская олимпиада по физике, ${paper.stage === 'oblast' ? 'областной' : 'заключительный'} этап, ${paper.year}`,
        source_url: paper.url,
        licence: 'unknown',
        attribution: 'РНПЦ «Дарын» · daryn.kz',
        diagram_url: picked.length ? `/figures/daryn/${id}.png` : null,
        _language: language,
        _points: problem.points,
      }
      rows.push(row)
      if (!solution) unpaired.push(row.id)
      // A statement that points at a picture nobody has is not a problem
      // anyone can solve. Worth saying out loud rather than discovering on the
      // task page.
      if (!picked.length && FIGURE.test(problem.statement)) missingFigure.push(row.id)
    }
  }

  const tally = (list, field) =>
    list.reduce((acc, r) => ({ ...acc, [r[field]]: (acc[r[field]] ?? 0) + 1 }), {})

  console.log(`${files.length} file(s) → ${papers.size} paper(s) → ${rows.length} problem(s)`)
  console.log('  by stage:   ', tally(rows, 'level'))
  console.log('  by topic:   ', tally(rows, 'topic_slug'))
  console.log('  by language:', tally(rows, '_language'))
  console.log(`  with an official solution: ${rows.filter((r) => r.official_solution).length}`)
  console.log(`  with a figure:             ${images.size}`)
  // Some solution PDFs set their equations as pictures, so what comes out is
  // the prose around them: "write the equation of rotational motion" with no
  // equation. Still the official method, and still worth having — but worth
  // knowing which ones they are.
  const thin = rows.filter((r) => r.official_solution && r.official_solution.length < 400)
  if (thin.length) {
    console.log(`  solutions that lost their formulas to the PDF: ${thin.map((r) => r.id.replace(`${ID}-`, '')).join(', ')}`)
  }
  if (missingFigure.length) {
    console.log(`  ask for a figure and have none: ${missingFigure.join(', ')}`)
  }
  if (skipped.length) {
    console.log('\nleft out:')
    for (const [what, why] of skipped) console.log(`  ${path.basename(what)} — ${why}`)
  }

  await mkdir(OUT, { recursive: true })
  await writeFile(path.join(OUT, 'daryn-physics.json'), JSON.stringify(rows, null, 2))
  await writeFile(
    path.join(OUT, 'daryn-physics.txt'),
    rows
      .map(
        (r) =>
          `### ${r.id}\n[${r.level} · ${r.topic_slug} · ${r.difficulty}★ · ${r._language}]\n${r.problem}\n\n--- решение ---\n${r.official_solution ?? '(нет)'}\n`,
      )
      .join('\n'),
  )

  if (!args.includes('--confirm') && !args.includes('--remove')) {
    console.log(`\nDry run → ${OUT}/daryn-physics.{json,txt}. Pass --confirm to write.`)
    return
  }

  // The figures are static files the app serves, so they belong in public/
  // next to the one diagram this project already had. Written before the rows
  // that point at them.
  if (!args.includes('--remove')) {
    await mkdir(FIGURE_DIR, { recursive: true })
    for (const [id, png] of images) await writeFile(path.join(FIGURE_DIR, `${id}.png`), png)
    console.log(`wrote ${images.size} figure(s) to ${FIGURE_DIR}`)
  }

  const raw = await readFile('.env.local', 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq !== -1 && !process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
  }
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  if (args.includes('--remove')) {
    const { rowCount } = await client.query(`delete from public.tasks where id like '${ID}-%'`)
    console.log(`removed ${rowCount} row(s)`)
    await client.end()
    return
  }

  const { rows: refs } = await client.query(
    `select t.id topic_id, t.slug topic_slug, s.id subject_id
       from topics t join subjects s on s.id = t.subject_id where s.slug = 'physics'`,
  )
  const ref = new Map(refs.map((r) => [r.topic_slug, r]))

  let written = 0
  for (const row of rows) {
    const target = ref.get(row.topic_slug)
    if (!target) {
      console.log(`  no topic ${row.topic_slug} — skipped ${row.id}`)
      continue
    }
    await client.query(
      `insert into public.tasks
         (id, subject_id, topic_id, title, problem, official_solution, difficulty,
          estimated_minutes, source, source_url, licence, attribution, level, diagram_url)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::public.content_licence,$12,$13,$14)
       on conflict (id) do update set
         title = excluded.title, problem = excluded.problem,
         official_solution = excluded.official_solution,
         difficulty = excluded.difficulty, topic_id = excluded.topic_id,
         estimated_minutes = excluded.estimated_minutes,
         source_url = excluded.source_url, licence = excluded.licence,
         attribution = excluded.attribution, level = excluded.level,
         diagram_url = excluded.diagram_url`,
      [
        row.id,
        target.subject_id,
        target.topic_id,
        row.title.slice(0, 200),
        row.problem,
        row.official_solution,
        row.difficulty,
        row.estimated_minutes,
        row.source,
        row.source_url,
        row.licence,
        row.attribution,
        row.level,
        row.diagram_url,
      ],
    )
    written += 1
  }
  console.log(`wrote ${written} task(s)`)
  await client.end()
}

main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
