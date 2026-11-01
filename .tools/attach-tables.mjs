/**
 * Puts back the tables three Daryn problems lost on import.
 *
 * import-daryn.mjs lifts raster figures and nothing else, and a table in these
 * papers is ruling lines with numbers between them: the numbers came through
 * as a run of text — "U, B 1 2 4 6 8 9 I, A 0,5 1 2 3 4 4,5" — and the lines
 * did not. pdf-regions.mjs finds the table on the page and render-crops.swift
 * draws it; this replaces that run of numbers with the picture of the table.
 *
 * Which region is which table was read off the rendered crops by eye, the way
 * the FIGURES table in import-daryn.mjs was: the Russian copy of each, since
 * the statement kept is the Russian one.
 *
 *   node .tools/attach-tables.mjs            # renders, and prints what would change
 *   node .tools/attach-tables.mjs --confirm  # writes the statements
 *
 * Running it twice changes nothing: a statement that already shows its table
 * is left alone.
 */
import { execFileSync } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'
import { getDocumentProxy } from 'unpdf'
import { pagesOf } from './pdf-regions.mjs'

const ROOT = '/Users/niya/Downloads/Олимпиады_Daryn_Физика_Математика'
const FIGURE_DIR = 'public/figures/daryn'

const TABLES = [
  {
    task: 'daryn-phys-republican-2021-2022-9-1-3',
    file: `${ROOT}/2021-2022/Тур_неизвестен/Физика/phis_9_1-2.pdf`,
    page: 3,
    regions: [3],
  },
  {
    task: 'daryn-phys-oblast-2022-2023-9-2-1',
    file: `${ROOT}/2022-2023/Тур_неизвестен/Физика/2ph9.pdf`,
    page: 2,
    regions: [0, 1],
  },
  {
    task: 'daryn-phys-oblast-2022-2023-11-2-1',
    file: `${ROOT}/2022-2023/Тур_неизвестен/Физика/2ph11.pdf`,
    page: 2,
    regions: [0],
  },
]

/** The cells of a table as a pattern that ignores how pdf.js spaced them. */
const loosely = (cells) =>
  new RegExp(
    cells
      .join('')
      .replace(/\s+/g, '')
      .split('')
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s*'),
  )

async function main() {
  const confirm = process.argv.includes('--confirm')
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
  await mkdir(FIGURE_DIR, { recursive: true })

  for (const entry of TABLES) {
    const pdf = await getDocumentProxy(new Uint8Array(await readFile(entry.file)))
    const page = (await pagesOf(pdf))[entry.page - 1]
    const { rows } = await client.query('select problem from public.tasks where id = $1', [entry.task])
    if (!rows.length) {
      console.log(`${entry.task}: no such task`)
      continue
    }
    let problem = rows[0].problem

    const crops = []
    entry.regions.forEach((region, n) => {
      const url = `/figures/daryn/${entry.task}-table-${n + 1}.png`
      crops.push({ file: entry.file, page: entry.page, rect: page.regions[region], out: path.resolve(`public${url}`) })
      if (problem.includes(url)) return
      const token = `\n\n![](${url})\n\n`
      const cells = page.captions[region].inside.filter(Boolean)
      const pattern = cells.length ? loosely(cells) : null
      // Where the numbers ran together is where the table stood. When they
      // cannot be found — spaced past recognition — the table goes at the end.
      problem = pattern?.test(problem) ? problem.replace(pattern, token) : `${problem}${token}`
      console.log(`${entry.task}: table ${n + 1} ${pattern?.test(rows[0].problem) ? 'replaces its text' : 'appended'}`)
    })
    execFileSync('swift', ['.tools/render-crops.swift'], { input: JSON.stringify(crops), stdio: ['pipe', 'inherit', 'inherit'] })

    problem = problem.replace(/\n{3,}/g, '\n\n').trim()
    if (problem === rows[0].problem) continue
    if (confirm) await client.query('update public.tasks set problem = $2 where id = $1', [entry.task, problem])
    else console.log(`--- ${entry.task}\n${problem}\n`)
  }
  await client.end()
  if (!confirm) console.log('Dry run. Pass --confirm to write.')
}

main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
