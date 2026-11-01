/**
 * Loads a reviewed slice of the OpenStax import into `tasks`.
 *
 * Separate from the importer on purpose: fetching is harmless and writing is
 * not, so the two are different commands and the second one refuses to run
 * without --confirm.
 *
 *   node .tools/apply-openstax.mjs                 # dry run, prints what it would do
 *   node .tools/apply-openstax.mjs --confirm       # writes
 *   node .tools/apply-openstax.mjs --remove        # takes the same rows back out
 *
 * Only problems that arrive with a worked solution are considered. The grader
 * scores a method against `official_solution`; a row whose reference is the
 * bare string "−5" would make it score a method against nothing.
 */
import { readFile, readdir } from 'node:fs/promises'
import pg from 'pg'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

const OUT = '.tools/out'
/** Long enough to be a derivation rather than an answer. */
const MIN_SOLUTION = 120
/** Per topic. A first load is meant to make the catalogue usable, not to bury
 *  it: three thousand textbook exercises would hide the olympiad problems this
 *  app exists for, and nobody can review three thousand of anything. */
const CAP = Number(flag('cap', 120))

async function env() {
  const raw = await readFile('.env.local', 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq !== -1 && !process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
  }
}

/** Evenly across the source pages, so a cap of 120 is not 120 from chapter 1. */
function spread(rows, cap) {
  if (rows.length <= cap) return rows
  const byPage = new Map()
  for (const row of rows) {
    const key = row.source_url
    if (!byPage.has(key)) byPage.set(key, [])
    byPage.get(key).push(row)
  }
  const queues = [...byPage.values()]
  const picked = []
  let index = 0
  while (picked.length < cap && queues.some((q) => q.length)) {
    const queue = queues[index % queues.length]
    if (queue.length) picked.push(queue.shift())
    index += 1
  }
  return picked
}

const cleanId = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

async function main() {
  await env()
  const files = (await readdir(OUT)).filter((f) => f.startsWith('openstax-') && f.endsWith('.json'))

  let rows = []
  for (const file of files) {
    const parsed = JSON.parse(await readFile(`${OUT}/${file}`, 'utf8'))
    rows.push(...parsed)
  }

  rows = rows.filter(
    (r) =>
      r.subject_slug === 'mathematics' &&
      r.topic_slug &&
      r.licence === 'cc-by' &&
      r.official_solution &&
      r.official_solution.length >= MIN_SOLUTION &&
      r.problem.length >= 25,
  )

  // One problem per statement: the two maths books overlap heavily, and the
  // same exercise appears in both.
  const seen = new Set()
  rows = rows.filter((r) => {
    const key = r.problem.slice(0, 160)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const byTopic = new Map()
  for (const row of rows) {
    if (!byTopic.has(row.topic_slug)) byTopic.set(row.topic_slug, [])
    byTopic.get(row.topic_slug).push(row)
  }
  const chosen = [...byTopic.entries()].flatMap(([, list]) => spread(list, CAP))

  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  const { rows: refs } = await client.query(
    `select t.id as topic_id, t.slug as topic_slug, s.id as subject_id
     from topics t join subjects s on s.id = t.subject_id where s.slug = 'mathematics'`,
  )
  const ref = new Map(refs.map((r) => [r.topic_slug, r]))

  if (args.includes('--remove')) {
    const { rowCount } = await client.query(
      `delete from public.tasks where id like 'openstax-%'`,
    )
    console.log(`removed ${rowCount} row(s)`)
    await client.end()
    return
  }

  console.log(`candidates: ${rows.length}, taking up to ${CAP} per topic → ${chosen.length}`)
  for (const [topic, list] of byTopic) console.log(`  ${topic}: ${list.length} available`)

  if (!args.includes('--confirm')) {
    console.log('\nDry run. Nothing written. Pass --confirm to write.')
    await client.end()
    return
  }

  let written = 0
  for (const row of chosen) {
    const target = ref.get(row.topic_slug)
    if (!target) continue
    await client.query(
      `insert into public.tasks
         (id, subject_id, topic_id, title, problem, difficulty, official_solution,
          source, estimated_minutes, source_url, licence, attribution, level)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::public.content_licence,$12,$13)
       on conflict (id) do update set
         title = excluded.title, problem = excluded.problem,
         official_solution = excluded.official_solution,
         source_url = excluded.source_url, licence = excluded.licence,
         attribution = excluded.attribution, level = excluded.level`,
      [
        cleanId(row.id),
        target.subject_id,
        target.topic_id,
        row.title.slice(0, 200),
        row.problem,
        // Every one of these is a textbook exercise of much the same calibre,
        // so they share a difficulty rather than carrying a number invented
        // per row. A reviewer raises the ones that deserve it.
        2,
        row.official_solution,
        row.source,
        null,
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
