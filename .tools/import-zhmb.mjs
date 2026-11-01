/**
 * The 2025–2026 oblast physics papers, with the solutions published beside them.
 *
 * Different from the 2021–2023 archive in one way that decides the whole shape
 * of this file: there is no manifest. The papers arrived as folders — the
 * statements in one, the marking schemes in another — with no record of the
 * page they were downloaded from. Everything else about reading them is shared
 * with `import-daryn.mjs` and lives in `daryn-parse.mjs`.
 *
 *   node .tools/import-zhmb.mjs            # writes a review file
 *   node .tools/import-zhmb.mjs --confirm  # writes to the database
 *   node .tools/import-zhmb.mjs --remove
 *
 * The source is daryn.kz/respa — the centre's own page for the 2025–2026
 * olympiad, which is where these folders are published from. It took finding:
 * the files arrived as folders with no manifest and no URL, and for this year
 * the centre no longer serves PDFs at daryn.kz/ro/<year>/ but links Google
 * Drive folders from that page instead.
 *
 * The second round is the experimental one — assemble a rig from a ruler, a
 * tube and a syringe and measure the density of cooking oil — and is left out
 * for the same reason as always: the grader marks a written derivation.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'
import { layoutOf } from './pdf-figures.mjs'
import {
  FIGURE,
  MARKER,
  difficultyFor,
  preferRussian,
  splitLettered,
  splitProblems,
  stack,
  stageFrom,
  textOf,
  topicFor,
} from './daryn-parse.mjs'

const args = process.argv.slice(2)
const OUT = '.tools/out'
const ID = 'zhmb-phys'
const FIGURE_DIR = 'public/figures/zhmb'
/**
 * The page РНПЦ «Дарын» publishes this year's papers from.
 *
 * Not a link to the PDF: for 2025–2026 the centre stopped serving files at
 * daryn.kz/ro/<year>/ and publishes Google Drive folders from this page
 * instead, and a Drive folder id is not a citation that will still resolve in
 * two years. The page is.
 */
const SOURCE_URL = 'https://daryn.kz/respa/'

const DOWNLOADS = '/Users/niya/Downloads'
const YEAR = '2025-2026'

/** One paper per grade: the statements, and the Russian marking scheme. */
const PAPERS = [9, 10, 11].map((grade) => ({
  stage: 'oblast',
  grade,
  round: 1,
  statements: `${DOWNLOADS}/ЖМБ І тур/Phys ${grade} I.pdf`,
  solutions: `${DOWNLOADS}/ЖМБ-2/Физика/Решение обл._1 тур по физика_${grade} кл._рус_25-26.pdf`,
  figures: `Phys ${grade} I`,
}))

/**
 * The republican final, 20–25 March 2026, Astana.
 *
 * Set in LaTeX rather than Word, which changes two things. The problems are
 * labelled "Задача 1A. Второй шанс (4.0 балла)" and need `splitLettered`; and
 * the figures sit where they are written instead of floating, so which picture
 * belongs to which problem can be read off the page geometry rather than by
 * hand. The first page is the cover and the instructions, so its pictures are
 * the centre's own banners and are skipped.
 */
const FINALS = [9, 10, 11].map((grade) => ({
  stage: 'republican',
  grade,
  round: 1,
  lettered: true,
  statements: `${DOWNLOADS}/ЖМБ/Физика/І тур/Respa2026_${grade}_rus.pdf`,
  solutions: `${DOWNLOADS}/ЖМБ/Физика/І тур/Respa2026_${grade}_rus_sol.pdf`,
}))

/** Headings as the republican papers write them, for the figure geometry. */
const LETTERED_HEADING = /Задача\s+(\d{1,2}[A-ZА-Я]?)\s*[.(]/

/**
 * Which figure belongs to which problem, read off the pictures by eye — the
 * same hand-written table as in `import-daryn.mjs`, and for the same reasons.
 *
 * Grade 11 prints the boomerang twice, once labelled in Kazakh and once in
 * Russian; index 3 is the Russian one. Two of grade 10's problems carry a
 * figure without the words "на рисунке" anywhere in them, which is why this
 * cannot be driven off the statement either.
 */
const FIGURES = {
  'Phys 9 I': { 3: [0], 4: [1] },
  'Phys 10 I': { 2: [0], 3: [1] },
  'Phys 11 I': { 1: [3], 2: [1], 4: [2] },
}

/**
 * Figures assigned by where they sit on the page.
 *
 * Only safe because these are LaTeX documents: a figure is written inside the
 * problem that refers to it and stays there. The Word papers float their
 * pictures, which is why those need a table written by hand instead.
 *
 * Reading order is page down, then height down the page; each figure belongs
 * to the last heading before it.
 */
function figuresByPosition(markers, figures) {
  const order = [
    ...markers.map((m) => ({ ...m, kind: 'mark' })),
    ...figures.map((f, index) => ({ ...f, index, kind: 'figure' })),
  ]
    .filter((item) => item.page > 1)
    .sort((a, b) => a.page - b.page || b.top - a.top)

  const byLabel = new Map()
  let current = null
  for (const item of order) {
    if (item.kind === 'mark') current = item.label
    else if (current) byLabel.set(current, [...(byLabel.get(current) ?? []), item])
  }
  return byLabel
}

async function finals(rows, images, notes) {
  for (const paper of FINALS) {
    const statements = await textOf(paper.statements)
    const problems = splitLettered(statements)
    const solutions = new Map(
      splitLettered(await textOf(paper.solutions)).map((s) => [s.label, s.statement]),
    )

    const bytes = new Uint8Array(await readFile(paper.statements))
    const { figures, markers } = await layoutOf(bytes, LETTERED_HEADING)
    const placed = figuresByPosition(markers, figures)

    for (const problem of problems) {
      const id = `${ID}-republican-${YEAR}-${paper.grade}-${paper.round}-${problem.label}`
      const picked = placed.get(problem.label) ?? []
      if (picked.length) images.set(id, stack(picked))

      const solution = solutions.get(problem.label) ?? null
      if (!solution) notes.push([id, 'no solution under that label'])

      rows.push({
        id,
        subject_slug: 'physics',
        topic_slug: topicFor(problem.statement),
        level: 'republican',
        title: `Республиканский финал ${YEAR}, ${paper.grade} класс — задача ${problem.label}${problem.title ? `. ${problem.title}` : ''}`,
        problem: problem.statement,
        official_solution: solution,
        difficulty: Math.min(5, difficultyFor('republican', paper.grade) + 1),
        estimated_minutes: problem.points ? Math.min(120, Math.round(problem.points * 12)) : null,
        source: `Республиканская олимпиада по физике, заключительный этап, ${YEAR}`,
        source_url: SOURCE_URL,
        licence: 'unknown',
        attribution: 'РНПЦ «Дарын»',
        diagram_url: picked.length ? `/figures/zhmb/${id}.png` : null,
        _language: 'ru',
        _points: problem.points,
        _figures: picked.map((f) => `${f.width}x${f.height}@p${f.page}`).join(' '),
      })
    }
  }
}

async function main() {
  const rows = []
  const images = new Map()
  const notes = []

  for (const paper of PAPERS) {
    const text = await textOf(paper.statements)
    const stage = stageFrom(text, null)
    if (stage !== 'oblast') {
      notes.push([paper.statements, `the header says "${stage ?? 'nothing'}", not oblast`])
      continue
    }

    const { text: russian, language } = preferRussian(text)
    const problems = splitProblems(russian)
    if (problems.length === 0) {
      notes.push([paper.statements, 'would not split into numbered problems'])
      continue
    }

    const solutions = new Map(
      splitProblems(preferRussian(await textOf(paper.solutions)).text).map((s) => [
        s.number,
        s.statement,
      ]),
    )

    const wanted = FIGURES[paper.figures] ?? {}
    const figures = Object.keys(wanted).length
      ? (await layoutOf(new Uint8Array(await readFile(paper.statements)), MARKER)).figures
      : []

    for (const problem of problems) {
      const id = `${ID}-oblast-${YEAR}-${paper.grade}-${paper.round}-${problem.number}`
      const picked = (wanted[problem.number] ?? []).map((i) => figures[i]).filter(Boolean)
      if (picked.length) images.set(id, stack(picked))

      const solution = solutions.get(problem.number) ?? null
      if (!solution) notes.push([id, 'no solution in the marking scheme for this number'])
      if (!picked.length && FIGURE.test(problem.statement)) {
        notes.push([id, 'asks for a figure and has none'])
      }

      rows.push({
        id,
        subject_slug: 'physics',
        topic_slug: topicFor(problem.statement),
        level: 'oblast',
        title: `Областной этап ${YEAR}, ${paper.grade} класс, ${paper.round} тур — задача ${problem.number}`,
        problem: problem.statement,
        official_solution: solution,
        difficulty: difficultyFor('oblast', paper.grade),
        estimated_minutes: problem.points ? Math.min(90, Math.round(problem.points * 8)) : null,
        source: `Республиканская олимпиада по физике, областной этап, ${YEAR}`,
        source_url: SOURCE_URL,
        licence: 'unknown',
        attribution: 'РНПЦ «Дарын»',
        diagram_url: picked.length ? `/figures/zhmb/${id}.png` : null,
        _language: language,
        _points: problem.points,
      })
    }
  }

  await finals(rows, images, notes)

  const tally = (field) =>
    rows.reduce((acc, r) => ({ ...acc, [r[field]]: (acc[r[field]] ?? 0) + 1 }), {})
  console.log(`${PAPERS.length} paper(s) → ${rows.length} problem(s)`)
  console.log('  by topic:   ', tally('topic_slug'))
  console.log('  by language:', tally('_language'))
  console.log(`  with an official solution: ${rows.filter((r) => r.official_solution).length}`)
  console.log(`  with a figure:             ${images.size}`)
  for (const [what, why] of notes) console.log(`  ${path.basename(what)} — ${why}`)

  await mkdir(OUT, { recursive: true })
  await writeFile(path.join(OUT, 'zhmb-physics.json'), JSON.stringify(rows, null, 2))
  await writeFile(
    path.join(OUT, 'zhmb-physics.txt'),
    rows
      .map(
        (r) =>
          `### ${r.id}\n[${r.topic_slug} · ${r.difficulty}★ · ${r._points} баллов${r._figures ? ` · рисунки ${r._figures}` : r.diagram_url ? ' · рисунок' : ''}]\n${r.problem}\n\n--- решение ---\n${r.official_solution ?? '(нет)'}\n`,
      )
      .join('\n'),
  )

  if (!args.includes('--confirm') && !args.includes('--remove')) {
    console.log(`\nDry run → ${OUT}/zhmb-physics.{json,txt}. Pass --confirm to write.`)
    return
  }

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
