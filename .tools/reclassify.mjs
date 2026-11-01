/**
 * Files the imported problems into the finer sections.
 *
 * The syllabus used to be four headings for mathematics and five for physics,
 * so the importers had nowhere to put a functional equation but "Algebra". Now
 * that the sections exist, the problems have to be moved into them — the topic
 * is what the ladder, the recommender and the skills radar all read, so a
 * problem in the wrong section is a problem nobody is sent to.
 *
 *   node .tools/reclassify.mjs             # dry run, prints the shuffle
 *   node .tools/reclassify.mjs --confirm
 *
 * Keyword rules, which is a guess. It is ordered most-specific first, so a
 * problem about a graph goes to Graphs rather than to Combinatorics, and the
 * fallback is the broad section it came from. Hand-written problems are left
 * alone: somebody chose their topic on purpose.
 */
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const confirm = process.argv.includes('--confirm')

/** Most specific first. The last entry of each list is the fallback. */
const RULES = {
  mathematics: [
    [/функциональн\w* уравнени|найдите все функции|f\(x\s*\+\s*y\)|f\(xy\)/i, 'functional-equations'],
    [/\bграф\b|графа|графе|вершин\w* и рёбер|рёбр|ребёр|дерев[оа]|связн\w* компонент/i, 'graphs'],
    [/инвариант|раскрас|покрас|чётност|нечётност|чередован|не изменяется при/i, 'invariants'],
    [/\bигр\w+\b.*\bход\w*\b|выигрышн|проигрышн|стратеги|двое играют|первый игрок/i, 'games'],
    [/неравенств|докажите,? что .{0,80}[≥≤]|\\ge\b|\\le\b|средне[ег]о? арифметическ|коши|ам-гм/i, 'inequalities'],
    [/многочлен|полином|виет|корни уравнени|степени многочлен/i, 'polynomials'],
    [/последовательност|прогресси|рекуррент|\bряд\b|сумма ряда|a_\{?n/i, 'sequences'],
    [/треугольн|окружн|биссектрис|медиан|четырёхугольн|четырехугольн|параллелограм|трапеци|вписан|описан|хорд|касател|площад|периметр|ромб|сфер|\bкуб\b|пирамид|призм/i, 'geometry'],
    [/делит|делен|простое число|простых чисел|остаток|взаимно прост|\bнод\b|\bнок\b|цифр|натуральн\w* числ|целых числ|кратн/i, 'number-theory'],
    [/сколькими способ|количество способ|перестанов|комбинац|турнир|карточ|размещен|сочетан/i, 'combinatorics'],
    [/./, 'algebra'],
  ],
  physics: [
    [/магнитн|индукц|соленоид|лоренц|\bампер|магнит\w* пол/i, 'magnetism'],
    [/конденсатор|электростатическ|потенциал|кулон|напряжённост\w* пол|заряженн\w* шар|диполь/i, 'electrostatics'],
    [/резистор|сопротивлен|сила тока|\bэдс\b|электрическ\w* цеп|амперметр|вольтметр|проводник/i, 'electrodynamics'],
    [/линз|зеркал|преломлен|отражен|оптическ|луч[ае]?\b|фокусн|изображен\w* предмет|дифракц|интерферен/i, 'optics'],
    [/фотон|квант|ядр[оае]|радиоактив|фотоэффект|релятив|изотоп|распад|дефект массы|де бройл/i, 'modern-physics'],
    [/колебан|маятник|период колеб|\bволн|частот\w* колеб|резонанс|звук/i, 'waves'],
    [/кпд|тепловая машина|цикл карно|адиабат|изотерм|энтроп|теплоёмкост|теплот[аы]|нагрева|охлажда/i, 'thermodynamics'],
    [/идеальн\w* газ|молекул|концентрац|средн\w* квадратичн|\bмоль\b|число авогадро|парциальн/i, 'molecular'],
    [/архимед|плотност\w* жидкост|всплыва|тонет|давлен\w* на глубине|сообщающ|вязк|трубк\w* с жидкость/i, 'fluids'],
    [/равновеси|момент сил|рычаг|центр масс|опрокид|подпор|стержень.{0,40}опира/i, 'statics'],
    [/импульс|закон сохранен|столкновен|\bудар\b|кинетическ\w* энерг|потенциальн\w* энерг|работа сил/i, 'conservation'],
    [/скорост|ускорен|траектор|перемещен|брош|свободно пада|равноускорен|разгон/i, 'kinematics'],
    [/./, 'mechanics'],
  ],
}

async function main() {
  const raw = await readFile('.env.local', 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq !== -1 && !process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
  }
  const db = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  })
  await db.connect()

  const { rows: topics } = await db.query(
    `select t.id, t.slug, s.slug subject from topics t join subjects s on s.id = t.subject_id
      where s.slug in ('mathematics', 'physics')`,
  )
  const idOf = new Map(topics.map((r) => [`${r.subject}|${r.slug}`, r.id]))

  const { rows: tasks } = await db.query(
    `select k.id, k.problem, k.title, k.topic_id, s.slug subject, tp.slug topic
       from tasks k join subjects s on s.id = k.subject_id join topics tp on tp.id = k.topic_id
      where s.slug in ('mathematics', 'physics')
        and (k.id like 'bcpf-%' or k.id like 'openstax-%')`,
  )

  const moves = []
  const counts = {}
  for (const task of tasks) {
    const rules = RULES[task.subject]
    const text = `${task.title} ${task.problem}`
    const slug = rules.find(([re]) => re.test(text))?.[1] ?? task.topic
    counts[`${task.subject}/${slug}`] = (counts[`${task.subject}/${slug}`] ?? 0) + 1
    if (slug !== task.topic) moves.push({ id: task.id, to: idOf.get(`${task.subject}|${slug}`) })
  }

  console.log(`${tasks.length} imported problem(s); ${moves.length} would move`)
  console.log('\nresulting sections:')
  for (const [key, n] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${key.padEnd(34)} ${n}`)
  }

  if (!confirm) {
    console.log('\nDry run. Pass --confirm to write.')
    await db.end()
    return
  }

  let done = 0
  for (const move of moves) {
    if (!move.to) continue
    await db.query(`update public.tasks set topic_id = $1 where id = $2`, [move.to, move.id])
    done += 1
  }
  console.log(`\nmoved ${done} problem(s)`)
  await db.end()
}

main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
