/**
 * Reads the Kazakh physics olympiad archive and shapes it like `tasks`.
 *
 * Unlike the mathematics half, this arrives as PDFs — one paper per file, with
 * the problems numbered inside it — so the work here is splitting a paper into
 * problems rather than reading one problem per file. Text comes out of the PDF
 * with `unpdf`, which is pdf.js in a wrapper and needs no system package.
 *
 *   node .tools/import-bcpf-physics.mjs            # writes a review file
 *   node .tools/import-bcpf-physics.mjs --confirm  # writes to the database
 *   node .tools/import-bcpf-physics.mjs --remove
 *
 * Only the Kazakh papers. The same download carries the Russian all-Russia
 * rounds, and those PDFs come out of pdf.js as mojibake with letters missing
 * outright — "изике" where "физике" was — because the old LaTeX fonts carry no
 * usable encoding. Broken text is worse than absent text, so they are left
 * where they are.
 *
 * No licence is invented: the source states none, so every row goes in as
 * `unknown` with the page it came from.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import pg from 'pg'
import { execFileSync } from 'node:child_process'
import { getDocumentProxy } from 'unpdf'
import { joinPages, pagesOf } from './pdf-regions.mjs'

const require = createRequire(import.meta.url)
const args = process.argv.slice(2)
const ROOT = 'Олимпиады_по_физике_BeyondOlympiads'
const OUT = '.tools/out'
const FIGURE_DIR = 'public/figures/bcpf'
const FIGURE = /!\[[^\]]*\]\(([^)\s]+)\)/g

const LEVEL = { Республиканские: 'republican', Областные: 'oblast' }

/**
 * The last three path segments: year / class / file.
 *
 * Normalised to NFC, because macOS stores these Cyrillic folder names
 * decomposed and the manifest was written composed — the two look identical
 * and compare unequal, which is how every single link came out null.
 */
const tail = (p) => p.normalize('NFC').split(/[\\/]/).slice(-3).join('/')

/**
 * A comma-separated file where fields may be quoted and contain commas.
 *
 * The titles do — "9 класс, 1 тур, Задания" — and splitting on every comma
 * tore them into pieces, which then shifted every later column along and put
 * fragments of a title where a URL was supposed to be.
 */
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

/** Which branch of physics a statement is about, from the words it uses. */
const TOPICS = [
  [/тепл|температур|газ|адиабат|изотерм|энтроп|калор|пар[аы]?\b|кипен|плавлен|термодинам|идеальн\w+ газ/i, 'thermodynamics'],
  [/заряд|конденсатор|ток|напряжен|резистор|сопротивлен|магнитн|индукц|электрическ|цеп[ьи]|эдс|катушк/i, 'electrodynamics'],
  [/лин[зь]|зеркал|преломлен|отражен|光|оптическ|свет[а]?\b|фокусн|изображен|дифракц|интерферен/i, 'optics'],
  [/фотон|квант|ядр|радиоактив|электрон\w* на орбит|дефект массы|фотоэффект|релятив|изотоп|распад/i, 'modern-physics'],
  [/./, 'mechanics'],
]

/** Paper header lines that are not part of any problem. */
const HEADER = /^(РЕСПУБЛИКАНСКИЙ|ОБЛАСТНАЯ|РЕСПУБЛИКАНСКАЯ|Министерство|НАУЧНО|\d+\s*класс|.*тур\b.*баллов|ЖАЛПЫ|ФИЗИКА|PHYSICS)/i

/**
 * Splits a paper into its numbered problems.
 *
 * The papers number their problems "1." at the start of a line and score them
 * "(7 баллов)" at the end. Anything before the first number is the header, and
 * a fragment shorter than a sentence is a page number or a stray caption
 * rather than a problem.
 */
function problemsFrom(text) {
  const body = text.replace(/\r/g, '')
  // Find where each problem begins and cut between those points, rather than
  // matching a problem as a pair of delimiters. The pair version ended every
  // statement at the first line break: with the `m` flag `$` is the end of a
  // line, so the lazy body stopped there and handed back a thirty-character
  // fragment that then failed the length check — a parser that reported
  // "would not split" for papers it had in fact split, badly.
  const marker = /^[ \t]*(?:Задача|Есеп|Тапсырма)?[ \t]*(\d{1,2})[ \t]*(?:-[ \t]*есеп)?[.)][ \t]+/gm

  const starts = []
  let match
  while ((match = marker.exec(body)) !== null) {
    starts.push({ number: Number(match[1]), from: match.index + match[0].length })
  }

  const found = []
  for (const [index, point] of starts.entries()) {
    const until = starts[index + 1]?.from ?? body.length
    // Back off the next marker's own text, which the slice would otherwise
    // carry: the marker began before `from`.
    const raw = body.slice(point.from, until).replace(/[ \t]*(?:Задача|Есеп|Тапсырма)?[ \t]*\d{1,2}[ \t]*[.)][ \t]*$/, '')
    const statement = raw.replace(/\s+/g, ' ').trim()
    // A problem is at least a couple of sentences. Below this the split has
    // caught a sub-question whose setup was in the paragraph above it —
    // "построй график зависимости" with nothing to build it from — and a
    // fragment is worse in a catalogue than a gap.
    if (statement.length < 150) continue
    if (HEADER.test(statement)) continue
    const points = Number(statement.match(/\((\d+)\s*балл/i)?.[1] ?? 0)
    found.push({ number: point.number, statement, points })
  }

  // Numbering has to run 1, 2, 3…: a list that jumps is a split that went
  // wrong, and half a problem is worse than none.
  return found.filter((p, index) => p.number === index + 1)
}

/**
 * Some papers print every figure together after the last problem, captioned
 * "Рисунок 1", "Рисунок 2", and refer to them by number from the text. Read
 * by position, all of them belong to the last problem. Read by caption, each
 * goes to the one problem that cites it — and stays where it was when no
 * problem does, or when two do, because numbering restarts in some papers and
 * then the number alone does not say which.
 */
const CAPTIONS = [
  // A figure: «Рисунок 1», «Рис. 1», «1-сурет» — printed under it.
  {
    caption: /^\(?(?:Рис(?:унок|\.)?|Сурет)\s*(\d+)|^(\d+)\s*-\s*сурет/i,
    sides: ['below', 'above'],
    cites: (n) => new RegExp(`(?:рис(?:унк\\S*|\\.)?|сурет\\S*)\\s*${n}(?!\\d)|${n}\\s*-\\s*сурет`, 'i'),
  },
  // A table: «Таблица 1», «1-кесте» — printed over it.
  {
    caption: /^Таблица\s*(\d+)|^(\d+)\s*-\s*кесте/i,
    sides: ['above', 'below'],
    cites: (n) => new RegExp(`таблиц\\S*\\s*${n}(?!\\d)|${n}\\s*-\\s*кесте`, 'i'),
  },
]

/** The caption a figure carries, its number, and which kind of number it is. */
function captionOf(caption) {
  if (!caption) return null
  for (const kind of CAPTIONS) {
    for (const [text, printed] of [
      ...caption.inside.map((text) => [text, false]),
      ...kind.sides.map((side) => [caption[side], true]),
    ]) {
      const match = text.match(kind.caption)
      if (match) return { kind, number: match[1] ?? match[2], text: printed ? text : null }
    }
  }
  return null
}

/** A run of text as a pattern that ignores how pdf.js spaced it. */
const loosely = (text) =>
  new RegExp(
    text
      .replace(/\s+/g, '')
      .split('')
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s*'),
  )

function moveCaptioned(problems, regions) {
  for (const holder of problems) {
    for (const [token, url] of [...holder.statement.matchAll(FIGURE)]) {
      const found = captionOf(regions.get(url)?.caption)
      if (!found) continue
      const cites = found.kind.cites(found.number)
      // The holder is left out: its own text now carries the caption, and a
      // caption cites itself.
      const citing = problems.filter(
        (p) => p !== holder && cites.test(p.statement.replace(FIGURE, '')),
      )
      if (citing.length !== 1) continue
      // The caption travels with the picture, so the table still reads
      // «Таблица 1» where it lands and is not left as a stray line behind.
      let moved = token
      if (found.text && loosely(found.text).test(holder.statement)) {
        holder.statement = holder.statement.replace(loosely(found.text), ' ')
        moved = found.kind.sides[0] === 'above' ? `${found.text} ${token}` : `${token} ${found.text}`
      }
      holder.statement = holder.statement.replace(token, ' ').replace(/\s+/g, ' ').trim()
      citing[0].statement = `${citing[0].statement} ${moved}`
    }
  }
}

function difficultyFor(level, klass) {
  const base = level === 'republican' ? 3 : 2
  return Math.min(5, base + (Number(klass) >= 10 ? 1 : 0))
}

async function main() {
  const { execSync } = require('node:child_process')
  const files = execSync(
    `find "${ROOT}/Республиканские" "${ROOT}/Областные" -name '*.pdf'`,
    { encoding: 'utf8', maxBuffer: 8 << 20 },
  )
    .trim()
    .split('\n')
    .filter(Boolean)

  // The manifest carries the page each PDF was taken from, which is what a
  // reader needs and what the file path does not have.
  const manifest = new Map()
  const csv = await readFile(path.join(ROOT, 'manifest.csv'), 'utf8')
  const [head, ...lines] = parseCsv(csv)
  const columns = head.map((c) => c.replace(/^﻿/, ''))
  for (const cells of lines) {
    if (cells.length < columns.length) continue
    const row = Object.fromEntries(columns.map((c, i) => [c, cells[i]]))
    // Keyed on the last three path segments, not the bare filename: every year
    // has a phys11-1-tasks.pdf, so a filename key pointed a 2011 republican
    // problem at the 2024 oblast page and said nothing about it.
    if (row.local) manifest.set(tail(row.local), row)
  }

  const rows = []
  /** Every figure a paper offered, by the URL its statement would use. */
  const regions = new Map()
  let unreadable = 0
  let noSplit = 0
  let experimental = 0

  for (const file of files.sort()) {
    // From 2024 a paper comes in Kazakh and Russian as two files with the same
    // problems, and both would take the same ids. The Russian one is kept, as
    // the earlier years already are wherever both languages share a file.
    if (file.endsWith('-kaz.pdf') && files.includes(file.replace(/-kaz\.pdf$/, '-rus.pdf'))) continue
    let text = ''
    // Figures and tables are found on the page and rendered from it, and the
    // statement carries a `![](…)` line where each one stood. Without this a
    // circuit problem arrived with no circuit and a table as a row of numbers.
    const base = path
      .relative(ROOT, file)
      .normalize('NFC')
      .replace(/Республиканские/, 'republican')
      .replace(/Областные/, 'oblast')
      .replace(/_класс/, '')
      .replace(/\.pdf$/, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
    try {
      const pdf = await getDocumentProxy(new Uint8Array(await readFile(file)))
      const pages = await pagesOf(pdf)
      text = joinPages(pages, (page, index) => {
        const url = `/figures/bcpf/${base}-p${page.number}-${index + 1}.png`
        regions.set(url, { file, page: page.number, rect: page.regions[index], caption: page.captions[index] })
        return `![](${url})`
      })
    } catch {
      unreadable += 1
      continue
    }
    const cyrillic = (text.match(/[а-яА-ЯёЁәіңғүұқөһ]/g) ?? []).length
    if (cyrillic < text.length * 0.2) {
      unreadable += 1
      continue
    }

    const parts = file.split(path.sep)
    const level = LEVEL[parts[1]]
    if (!level) continue
    const year = parts[2] ?? ''
    const klass = (parts[3] ?? '').replace('_класс', '')
    const entry = manifest.get(tail(file))
    const round = /-2-/.test(path.basename(file)) ? 2 : 1

    // The second round is often the experimental one: a single lab task with
    // apparatus, not a list of problems. It does not split because there is
    // nothing to split, and it does not belong here anyway — the grader marks
    // a written derivation, and "determine the density of this stone with a
    // dynamometer" is not one.
    if (
      /экспериментальн|тәжірибел/i.test(text.slice(0, 600)) ||
      /Приборы и материалы|Құралдар мен материалдар|өлшеңіз|измерьте зависимость/i.test(text)
    ) {
      experimental += 1
      continue
    }

    const problems = problemsFrom(text)
    if (problems.length === 0) {
      noSplit += 1
      continue
    }

    moveCaptioned(problems, regions)

    for (const problem of problems) {
      rows.push({
        id: `bcpf-phys-${level}-${year}-${klass || 'x'}-${round}-${problem.number}`,
        subject_slug: 'physics',
        topic_slug: TOPICS.find(([re]) => re.test(problem.statement))?.[1] ?? 'mechanics',
        level,
        title: `${parts[1]} ${year}, ${klass} класс, ${round} тур — задача ${problem.number}`,
        problem: problem.statement,
        difficulty: difficultyFor(level, klass),
        estimated_minutes: problem.points ? Math.max(15, problem.points * 6) : null,
        source: `${parts[1]} олимпиада по физике, ${year}`,
        source_url: entry?.source_page ?? null,
        licence: 'unknown',
        attribution: 'РНПЦ «Дарын» · olympiads.bc-pf.org',
        _points: problem.points,
        _file: file,
      })
    }
  }

  const byLevel = {}
  const byTopic = {}
  for (const r of rows) {
    byLevel[r.level] = (byLevel[r.level] ?? 0) + 1
    byTopic[r.topic_slug] = (byTopic[r.topic_slug] ?? 0) + 1
  }
  console.log(`${files.length} paper(s) read → ${rows.length} problems`)
  console.log('  by level:', byLevel)
  console.log('  by topic:', byTopic)
  console.log(
    `  ${unreadable} paper(s) had no usable text (scans), ` +
      `${experimental} were experimental rounds, ${noSplit} would not split`,
  )

  // Only the figures some kept problem points at. The rest stood in a header,
  // an experimental round or a problem the splitter dropped.
  const wanted = [...new Set(rows.flatMap((r) => [...r.problem.matchAll(FIGURE)].map((m) => m[1])))]
  await mkdir(FIGURE_DIR, { recursive: true })
  const crops = wanted.map((url) => {
    const { file, page, rect } = regions.get(url)
    return { file: path.resolve(file), page, rect, out: path.resolve('public' + url) }
  })
  if (crops.length) {
    const report = execFileSync('swift', ['.tools/render-crops.swift'], {
      input: JSON.stringify(crops),
      encoding: 'utf8',
      maxBuffer: 8 << 20,
    })
    console.log(`  figures: ${report.trim()} → ${FIGURE_DIR}`)
  }
  console.log(`  problems with a figure or table: ${rows.filter((r) => r.problem.includes('![](')).length}`)

  await mkdir(OUT, { recursive: true })
  await writeFile(path.join(OUT, 'bcpf-physics.json'), JSON.stringify(rows, null, 2))

  if (!args.includes('--confirm') && !args.includes('--remove')) {
    console.log(`\nDry run → ${OUT}/bcpf-physics.json. Pass --confirm to write.`)
    return
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
    const { rowCount } = await client.query(`delete from public.tasks where id like 'bcpf-phys-%'`)
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
    if (!target) continue
    await client.query(
      `insert into public.tasks
         (id, subject_id, topic_id, title, problem, difficulty, estimated_minutes,
          source, source_url, licence, attribution, level)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::public.content_licence,$11,$12)
       on conflict (id) do update set
         -- Not topic_id: reclassify.mjs has filed these by hand since, and a
         -- re-import would put every problem back under the importer's guess.
         title = excluded.title, problem = excluded.problem,
         difficulty = excluded.difficulty,
         estimated_minutes = excluded.estimated_minutes,
         source_url = excluded.source_url, licence = excluded.licence,
         attribution = excluded.attribution, level = excluded.level`,
      [
        row.id,
        target.subject_id,
        target.topic_id,
        row.title.slice(0, 200),
        row.problem,
        row.difficulty,
        row.estimated_minutes,
        row.source,
        row.source_url,
        row.licence,
        row.attribution,
        row.level,
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
