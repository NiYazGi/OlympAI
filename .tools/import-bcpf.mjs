/**
 * Reads the Kazakh olympiad archive on disk and shapes it like `tasks`.
 *
 * The source is the download in `Олимпиады_по_математике_BeyondOlympiads/`,
 * which keeps one HTML file per problem: a title, the page it came from, and
 * the statement with its mathematics in LaTeX. That is the whole reason this
 * importer can exist and the physics half cannot yet — physics arrived as 132
 * PDFs and there is no PDF reader on this machine.
 *
 *   node .tools/import-bcpf.mjs            # writes a review file
 *   node .tools/import-bcpf.mjs --confirm  # writes to the database
 *   node .tools/import-bcpf.mjs --remove   # takes the same rows back out
 *
 * Two things it deliberately does not do:
 *
 *   It does not drop a problem's pictures. Twenty-five statements carry one —
 *   the geometry they are about — and they were once skipped for want of
 *   somewhere to host them. They are copied into public/figures/bcpf-math/
 *   and the statement keeps a `![](…)` line where each one stood.
 *
 *   It does not invent a licence. The site carries "© ОФ Beyond Curriculum"
 *   and states no terms, so every row goes in as `unknown` with the exact page
 *   it came from. That is the honest label and it is visible in the product.
 */
import { copyFile, readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const args = process.argv.slice(2)
const ROOT = 'Олимпиады_по_математике_BeyondOlympiads'
const OUT = '.tools/out'
const FIGURE_DIR = 'public/figures/bcpf-math'

/** Folder → the rung it belongs to. */
const LEVEL = {
  Областная: 'oblast',
  Республиканская: 'republican',
  ГЖО: 'republican',
  Юниорская: 'republican',
  Балканская: 'international',
}

/**
 * Which topic a statement belongs to, from the words it uses.
 *
 * A guess, and it is meant to be corrected: the topic decides what the ladder
 * and the recommender do with a problem, so a wrong one is visible rather than
 * silent. Geometry and number theory announce themselves reliably;
 * combinatorics less so; algebra is the fallback, which is also where a
 * misfiled problem does least harm.
 */
const TOPICS = [
  [/треугольн|окружн|биссектрис|медиан|высот[ау]|четырёхугольн|четырехугольн|параллелограм|трапеци|вписан|описан|радиус|хорд|касател|угол|углы|прямая|точк[аи]|отрезок|площад|периметр|сторон[аы]|ромб|квадрат ABCD|сфер|куб|пирамид|призм/i, 'geometry'],
  [/делит|делен|простое число|простых чисел|остаток|взаимно прост|НОД|НОК|цифр|натуральн(ое|ых) числ|целых числ|кратн|десятичн/i, 'number-theory'],
  [/сколькими способ|количество способ|раскрас|граф|вершин|рёбер|ребер|перестанов|комбинац|турнир|шахматн|доск[еи]|клетк|карточ|стратеги|выигрыш|команд|участник/i, 'combinatorics'],
  [/./, 'algebra'],
]

const strip = (html) =>
  html
    // Pictures are swapped for a placeholder before the tags go, and the
    // placeholder for the figure's line afterwards — see `figuresOf`.
    .replace(/<img[^>]*src="([^"]+)"[^>]*>/g, (_, src) => `\n\nIMG{${src}}\n\n`)
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.name.endsWith('.html') && entry.name !== 'index.html') yield full
  }
}

/**
 * Difficulty, from the rung and the school year.
 *
 * A republican paper for year 9 and one for year 11 are not the same problem
 * set, and neither is an oblast paper. Five is kept for the international
 * rung, where it means what it says.
 */
function difficultyFor(level, klass) {
  const base = level === 'international' ? 4 : level === 'republican' ? 3 : 2
  const senior = Number(klass) >= 10 ? 1 : 0
  return Math.min(5, base + senior)
}

async function main() {
  const rows = []
  const skipped = { empty: 0 }
  /** Picture files to copy: where they are on disk → where the app serves them. */
  const pictures = new Map()

  for await (const file of walk(ROOT)) {
    const html = await readFile(file, 'utf8')
    const parts = file.split(path.sep)
    const section = parts[1]
    const level = LEVEL[section]
    if (!level) continue

    const year = parts[2] ?? ''
    // The Balkan papers sit under "общие" rather than a year group: they are
    // not sat by school year. Anything that is not a number is not a class.
    const folder = (parts[3] ?? '').replace('_класс', '')
    const klass = /^\d+$/.test(folder) ? folder : ''
    const sourceUrl = html.match(/class="source">[\s\S]*?href="([^"]+)"/)?.[1] ?? null
    const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/)?.[1] ?? ''

    // The files sit in an `_assets` folder beside the page and are named by
    // hash, so the name is already unique across the archive.
    const problem = strip(article).replace(/IMG\{([^}]+)\}/g, (_, src) => {
      const name = path.basename(src)
      pictures.set(path.join(path.dirname(file), src), path.join(FIGURE_DIR, name))
      return `![](/figures/bcpf-math/${name})`
    })
    if (problem.length < 25) {
      skipped.empty += 1
      continue
    }

    const number = path.basename(file, '.html').replace('problem', '')
    const topic = TOPICS.find(([re]) => re.test(problem))?.[1] ?? 'algebra'

    rows.push({
      // Built from parts that are already ascii, rather than folded from
      // Cyrillic — the first version turned "общие" into six hyphens.
      id: ['bcpf-math', section === 'ГЖО' ? 'gzho' : level, year, klass || 'all', number]
        .filter(Boolean)
        .join('-')
        .toLowerCase(),
      subject_slug: 'mathematics',
      topic_slug: topic,
      level,
      title: `${section} ${year}${klass ? `, ${klass} класс` : ''} — задача ${number}`,
      problem,
      difficulty: difficultyFor(level, klass),
      source: `${section} олимпиада по математике, ${year}`,
      source_url: sourceUrl,
      // No terms are stated at the source. See the note at the top.
      licence: 'unknown',
      attribution: 'ОФ Beyond Curriculum · olympiads.bc-pf.org',
      _section: section,
      _year: year,
      _klass: klass,
    })
  }

  const byLevel = {}
  const byTopic = {}
  for (const r of rows) {
    byLevel[r.level] = (byLevel[r.level] ?? 0) + 1
    byTopic[r.topic_slug] = (byTopic[r.topic_slug] ?? 0) + 1
  }
  console.log(`${rows.length} problems read`)
  console.log('  by level:', byLevel)
  console.log('  by topic:', byTopic)
  console.log(`  with a figure: ${rows.filter((r) => r.problem.includes('![](')).length}`)
  console.log(`  skipped: ${skipped.empty} had no statement`)

  await mkdir(FIGURE_DIR, { recursive: true })
  for (const [from, to] of pictures) await copyFile(from, to)
  console.log(`  copied ${pictures.size} picture(s) → ${FIGURE_DIR}`)

  await mkdir(OUT, { recursive: true })
  await writeFile(path.join(OUT, 'bcpf-math.json'), JSON.stringify(rows, null, 2))

  if (!args.includes('--confirm') && !args.includes('--remove')) {
    console.log(`\nDry run → ${OUT}/bcpf-math.json. Pass --confirm to write.`)
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
    const { rowCount } = await client.query(`delete from public.tasks where id like 'bcpf-%'`)
    console.log(`removed ${rowCount} row(s)`)
    await client.end()
    return
  }

  const { rows: refs } = await client.query(
    `select t.id topic_id, t.slug topic_slug, s.id subject_id
       from topics t join subjects s on s.id = t.subject_id where s.slug = 'mathematics'`,
  )
  const ref = new Map(refs.map((r) => [r.topic_slug, r]))

  let written = 0
  for (const row of rows) {
    const target = ref.get(row.topic_slug)
    if (!target) continue
    await client.query(
      `insert into public.tasks
         (id, subject_id, topic_id, title, problem, difficulty, source, source_url,
          licence, attribution, level)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::public.content_licence,$10,$11)
       on conflict (id) do update set
         -- Not topic_id: reclassify.mjs has filed these by hand since, and a
         -- re-import would put every problem back under the importer's guess.
         title = excluded.title, problem = excluded.problem,
         difficulty = excluded.difficulty,
         source_url = excluded.source_url, licence = excluded.licence,
         attribution = excluded.attribution, level = excluded.level`,
      [
        row.id,
        target.subject_id,
        target.topic_id,
        row.title.slice(0, 200),
        row.problem,
        row.difficulty,
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
