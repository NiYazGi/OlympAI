/**
 * Pulls end-of-chapter problems out of OpenStax and shapes them like `tasks`.
 *
 * Like the physics importer beside it, this writes a review file and touches
 * neither the database nor anything a student can see. Every problem in this
 * repository is read by a person before it reaches one.
 *
 *   node .tools/import-openstax.mjs [--book college-physics] [--out .tools/out]
 *
 * Why OpenStax at all: it is the only source on the list whose licence permits
 * adaptation, and the first editions are plain CC BY — no non-commercial
 * clause and no share-alike, so nothing here travels into the terms of the
 * rest of the product. The licence is read from the archive per book rather
 * than assumed; a book that does not come back CC BY is refused, because the
 * whole point of choosing this source was the terms.
 *
 * What it is not: olympiad material. These are textbook exercises, and they go
 * in at `oblast` level, which is the rung nothing else fills.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const REX = 'https://openstax.org/rex/release.json'
const CMS = 'https://openstax.org/apps/cms/api/v2/pages/?type=books.Book&fields=title,cnx_id&limit=200'
const UA = 'OlympAI content import (non-profit, one-off; contact via the repository)'
/** Polite gap between requests. A textbook is a few hundred pages. */
const PAUSE_MS = 300

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

/**
 * The books worth taking, and where their chapters land.
 *
 * Only first editions: the 2e of every one of these is CC BY-NC-SA, and the
 * share-alike clause would attach to our own reference solutions.
 */
const BOOKS = {
  'university-physics-volume-1': {
    subject: 'physics',
    level: 'oblast',
    topics: [
      [/temperature|kinetic theory|heat|thermodynamic|entropy/i, 'thermodynamics'],
      [/electric|magnet|circuit|current|induction|inductance|maxwell/i, 'electrodynamics'],
      [/optic|light|image|interference|diffraction|lens|mirror/i, 'optics'],
      [/relativity|quantum|atomic|nuclear|particle|photon|condensed/i, 'modern-physics'],
      [/./, 'mechanics'],
    ],
  },
  'college-physics': {
    subject: 'physics',
    level: 'oblast',
    topics: [
      [/kinematics|motion|dynamics|newton|force|friction|work|energy|momentum|statics|torque|rotational|gravitation|fluid|oscillat|wave|sound/i, 'mechanics'],
      [/temperature|kinetic theory|heat|thermodynamic/i, 'thermodynamics'],
      [/electric|magnet|circuit|current|induction|ac |electromagnetic wave/i, 'electrodynamics'],
      [/optic|light|image|vision|interference|diffraction/i, 'optics'],
      [/relativity|quantum|atomic|nuclear|particle|radioactiv|photon/i, 'modern-physics'],
    ],
  },
  'algebra-and-trigonometry': {
    subject: 'mathematics',
    level: 'oblast',
    topics: [
      [/sequence|series|counting|probability|binomial/i, 'combinatorics'],
      [/./, 'algebra'],
    ],
  },
  precalculus: {
    subject: 'mathematics',
    level: 'oblast',
    topics: [
      [/sequence|series|counting|probability|binomial/i, 'combinatorics'],
      [/./, 'algebra'],
    ],
  },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': UA } })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`)
  return response.json()
}

const strip = (html) =>
  html
    .replace(/<annotation[\s\S]*?<\/annotation>/g, '')
    .replace(/<annotation-xml[\s\S]*?<\/annotation-xml>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Every node of the table of contents, flattened, with the path that led to it.
 *
 * The distinction that matters is leaf versus container: "Exercises" and
 * "Answer Key" are `sub-book-tree` nodes that hold pages rather than being
 * pages, and asking the archive for one returns a 404. The first run of this
 * script fetched seven of them and reported seven mysterious failures.
 */
function flatten(node, trail = [], out = []) {
  const title = strip(node.title ?? '')
  const children = node.contents ?? null
  out.push({ title, id: node.id ?? '', slug: node.slug ?? '', leaf: !children, trail: [...trail] })
  for (const child of children ?? []) flatten(child, [...trail, title], out)
  return out
}

/**
 * The answer key, keyed by the page each answer belongs to.
 *
 * The answers sit in their own chapter pages at the back rather than beside
 * the problems, so they have to be joined. Every answer links back to the
 * problem it answers and carries that page's uuid on the link — which is an
 * exact key, and much better than the chapter-and-heading key this started
 * with. That one matched answer 7 of the practice test to problem 7 of the
 * review exercises, because the numbering restarts in every group.
 */
function answerKey(html) {
  const out = new Map()
  const re = /<div[^>]*data-type="solution"[^>]*>([\s\S]*?)(?=<div[^>]*data-type="solution"|<\/body>|$)/g
  let match
  while ((match = re.exec(html)) !== null) {
    const block = match[1]
    const page = block.match(/data-page-uuid="([0-9a-f-]+)"/)?.[1]
    const number = strip(block.match(/class="os-number"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '')
    const body = strip(block.match(/class="os-solution-container"[^>]*>([\s\S]*)/)?.[1] ?? '')
    if (!page || !number || !body) continue
    out.set(`${page}|${number}`, body)
  }
  return out
}

/** `<div data-type="exercise">` blocks, as number + statement + solution. */
function exercises(html) {
  const found = []
  const re = /<div[^>]*data-type="exercise"[^>]*>([\s\S]*?)(?=<div[^>]*data-type="exercise"|<\/body>|$)/g
  let match
  while ((match = re.exec(html)) !== null) {
    const block = match[1]
    const number = strip(block.match(/<span class="os-number">([\s\S]*?)<\/span>/)?.[1] ?? '')
    const problem = block.match(/<div class="os-problem-container">([\s\S]*?)<\/div>\s*<\/div>/)
    const solution = block.match(/data-type="solution"[^>]*>([\s\S]*?)$/)
    const statement = strip(problem?.[1] ?? '')
    if (!number || statement.length < 15) continue
    found.push({ number, statement, solution: solution ? strip(solution[1]) : null })
  }
  return found
}

async function main() {
  const slug = flag('book', 'college-physics')
  const out = flag('out', '.tools/out')
  const config = BOOKS[slug]
  if (!config) {
    console.error(`Unknown book "${slug}". Known: ${Object.keys(BOOKS).join(', ')}`)
    process.exit(1)
  }

  const [rex, cms] = await Promise.all([getJson(REX), getJson(CMS)])
  const archive = `https://openstax.org${rex.archiveUrl}`
  const uuid = cms.items.find((b) => b.meta.slug === slug)?.cnx_id
  if (!uuid) throw new Error(`No cnx_id for ${slug}`)
  const version = rex.books[uuid]?.defaultVersion
  if (!version) throw new Error(`${slug} is not in the current release`)

  const book = await getJson(`${archive}/contents/${uuid}@${version}.json`)

  // The licence is the reason this book was chosen, so it is checked rather
  // than assumed. CC BY only: a share-alike book would put its terms on every
  // reference solution written against it.
  const licenceUrl = book.license?.url ?? ''
  const isCcBy = /creativecommons\.org\/licenses\/by\/4\.0/.test(licenceUrl)
  const isCcByNcSa = /creativecommons\.org\/licenses\/by-nc-sa\/4\.0/.test(licenceUrl)
  // --allow-nc-sa is a deliberate act, not a default. A share-alike source
  // puts its own terms on every reference solution written against it, which
  // is a decision about this product's content and not about one import.
  if (!isCcBy && !(isCcByNcSa && args.includes('--allow-nc-sa'))) {
    console.error(
      `Refusing ${slug}: licence is ${licenceUrl || 'not stated'}.` +
        (isCcByNcSa ? ' Pass --allow-nc-sa if the share-alike clause is acceptable.' : ''),
    )
    process.exit(1)
  }
  const code = isCcBy ? 'cc-by' : 'cc-by-nc-sa'
  const attribution = `OpenStax, ${book.title}, ${isCcBy ? 'CC BY 4.0' : 'CC BY-NC-SA 4.0'}`

  const nodes = flatten(book.tree)
  const inAnswerKey = (n) => n.trail.some((t) => /answer key/i.test(t))

  /*
   * Every page, not only the ones called "Exercises".
   *
   * Most of a textbook's problems are at the foot of the section they belong
   * to, under a "Section Exercises" heading, and only the chapter round-ups
   * get a page of their own. Selecting by page title collected 507 problems
   * out of several thousand and then failed to match the answers, because the
   * answers point at section pages that had never been fetched.
   */
  const problemPages = nodes.filter((n) => n.leaf && n.id && !inAnswerKey(n))
  const answerPages = nodes.filter((n) => n.leaf && n.id && inAnswerKey(n))

  console.log(`${slug} @${version} — ${licenceUrl}`)
  console.log(`  ${problemPages.length} content page(s), ${answerPages.length} answer page(s)`)

  // The chapter a page sits under, taken from the trail rather than guessed
  // from the running order.
  const chapterOf = (n) =>
    [...n.trail].reverse().find((t) => /^(chapter\s+)?\d+/i.test(t) || t.length > 3) ?? ''

  /**
   * The answers, keyed by chapter and problem number.
   *
   * OpenStax keeps them in their own section at the back rather than beside
   * the problems, which is why they have to be fetched separately and joined.
   * They are answers, not derivations — see the note this script prints at the
   * end, because that difference decides what the grader can do with them.
   */
  const answers = new Map()
  for (const page of answerPages) {
    let content
    try {
      content = (await getJson(`${archive}/contents/${uuid}@${version}:${page.id.split('@')[0]}.json`)).content
    } catch {
      continue
    }
    await sleep(PAUSE_MS)
    for (const [key, value] of answerKey(content)) answers.set(key, value)
  }
  console.log(`  ${answers.size} answer(s) collected`)

  const rows = []
  for (const page of problemPages) {
    const pageId = page.id.split('@')[0]
    let content
    try {
      content = (await getJson(`${archive}/contents/${uuid}@${version}:${pageId}.json`)).content
    } catch (cause) {
      console.log(`  skipped a page: ${cause.message}`)
      continue
    }
    await sleep(PAUSE_MS)

    const where = chapterOf(page)
    const topic = config.topics.find(([re]) => re.test(where))?.[1] ?? null

    for (const item of exercises(content)) {
      rows.push({
        id: `openstax-${slug}-${pageId.slice(0, 8)}-${item.number}`,
        level: config.level,
        subject_slug: config.subject,
        topic_slug: topic,
        // The section, not the chapter: "1.1 Real Numbers — 7" says where to
        // look, and "Chapter 1 Prerequisites — 7" does not.
        title: `${(page.title || where).replace(/\s+/g, ' ').trim()} — ${item.number}`.replace(/^ — /, ''),
        problem: item.statement,
        find_prompt: null,
        official_solution: item.solution ?? answers.get(`${pageId}|${item.number}`) ?? null,
        difficulty: null,
        estimated_minutes: null,
        source: `OpenStax ${book.title}`,
        // The readable page, which is the one a reader can actually open. The
        // uuid form resolves for the archive API and not for a person.
        source_url: `https://openstax.org/books/${slug}/pages/${page.slug || pageId}`,
        licence: code,
        attribution,
        _chapter: where,
        _number: item.number,
        _has_solution: Boolean(item.solution ?? answers.get(`${pageId}|${item.number}`)),
      })
    }
  }

  await mkdir(out, { recursive: true })
  const file = path.join(out, `openstax-${slug}.json`)
  await writeFile(file, JSON.stringify(rows, null, 2))

  const byTopic = {}
  for (const r of rows) byTopic[r.topic_slug ?? '(none)'] = (byTopic[r.topic_slug ?? '(none)'] ?? 0) + 1
  console.log(`  ${rows.length} problems → ${file}`)
  console.log('  by topic:', byTopic)
  const withSolution = rows.filter((r) => r._has_solution).length
  console.log(`  with an answer attached: ${withSolution} of ${rows.length}`)
  console.log('\nNothing was written to the database.')
  if (withSolution < rows.length) {
    console.log(
      'Note: OpenStax publishes answers to the odd-numbered problems only, and an\n' +
        'answer is not a derivation. The grader scores a method, so a row that\n' +
        'carries only a final result needs a reference solution written by hand\n' +
        'before it is worth anything — which the licence permits, and which is the\n' +
        'work this import saves you the easy half of.',
    )
  }
}

main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
