/**
 * Reading a daryn.kz physics paper: the parts both importers need.
 *
 * `import-daryn.mjs` reads the 2021–2023 archive, which comes with a manifest
 * of source URLs. `import-zhmb.mjs` reads the 2025–2026 oblast papers, which
 * come as two folders and no manifest at all — the statements in one, the
 * solutions in another.
 *
 * The papers themselves are the same shape either way: the centre's letterhead,
 * then the problems numbered "Есеп_1 [8 ұпай]" in Kazakh and again as
 * "Задача_1 [8 баллов]" in Russian. Everything that reads one lives here and is
 * written once.
 */
import { readFile } from 'node:fs/promises'
import { extractText, getDocumentProxy } from 'unpdf'
import { encodePng } from './pdf-figures.mjs'

/**
 * Which stage of the olympiad, from the paper's own header.
 *
 * The folder says "Тур_неизвестен" for every one of these, so the path is no
 * help. The header is unambiguous: the Kazakh ladder names its stages, and the
 * third is the oblast round while the fourth is the republican final.
 */
export function stageFrom(text, url) {
  const head = text.slice(0, 700)
  if (/ОБЛЫСТЫҚ|ОБЛАСТНОЙ|областн/i.test(head)) return 'oblast'
  if (/ҚОРЫТЫНДЫ|ИТОГОВ|Республикалық олимпиада|республиканск/i.test(head)) return 'republican'
  if (url?.includes('/oblast/')) return 'oblast'
  return null
}

/** Stacks a problem's figures into one picture, because a task has one slot. */
export function stack(figures) {
  if (figures.length === 1) return figures[0].png
  const gap = 16
  const width = Math.max(...figures.map((f) => f.width))
  const height = figures.reduce((sum, f) => sum + f.height, 0) + gap * (figures.length - 1)
  const canvas = Buffer.alloc(width * height * 3, 0xff)
  let y = 0
  for (const figure of figures) {
    const left = Math.floor((width - figure.width) / 2)
    for (let row = 0; row < figure.height; row += 1) {
      figure.rgb.copy(
        canvas,
        ((y + row) * width + left) * 3,
        row * figure.width * 3,
        (row + 1) * figure.width * 3,
      )
    }
    y += figure.height + gap
  }
  return encodePng(width, height, canvas)
}

/**
 * Which branch of physics, from the words the statement uses.
 *
 * Order is the whole algorithm: the first pattern that matches anywhere in the
 * statement wins, so the specific sections have to come before the ones whose
 * vocabulary turns up everywhere. "Плотность" was in the fluids pattern and
 * took a problem about the density of a planet; thermodynamics sat above
 * magnetism and took "законы сохранения в магнитном поле".
 *
 * It is a guess either way, and a visible one: the section shows on every task
 * and can be corrected by hand.
 */
const TOPICS = [
  // "Сопротивление воздуха" is in half the mechanics problems and the word
  // alone was pulling them into electrodynamics — a thrown boomerang came out
  // as a circuit. Named here rather than removed from the pattern below,
  // because "сопротивления R1, R2, R3" really is one.
  [/сопротивлени\w* воздуха|бумеранг/i, 'mechanics'],
  [/фотон|квант|ядр[оае]|радиоактив|дефект массы|фотоэффект|релятив|изотоп|распад|жұлдыз|звезд/i, 'modern-physics'],
  // `лин[зы]` was here and matched "длины".
  [/линз|зеркал|преломлен|оптическ|фокусн|призм|дифракц|интерферен|луч света|сәуле|оптик/i, 'optics'],
  [/магнитн|индукционн|соленоид|катушк|био-савар|магнит/i, 'magnetism'],
  [/вязкост|архимед|стокс|сұйықтық|несжимаем|трубк|поршен|давление воздуха/i, 'fluids'],
  [/конденсатор|резистор|сопротивлен|гальванометр|эдс|электрическ\w* цеп|контур|заряд|напряжен|кедерг|кернеу|тізбек/i, 'electrodynamics'],
  [/колебан|маятник|волн[аые]|резонанс|частот|тербел|толқын/i, 'waves'],
  [/тепл|температур|газ|адиабат|изотерм|энтроп|калор|кипен|плавлен|термодинам|жылу|мұз/i, 'thermodynamics'],
  [/тяготен|гравитац|орбит|спутник|планет|астероид|ғаламшар|серіг/i, 'mechanics'],
  [/энергии|импульс|сохранен/i, 'conservation'],
  [/./, 'mechanics'],
]

/**
 * Text as a database column will take it.
 *
 * pdf.js hands back a NUL byte here and there — a glyph with no mapping, in
 * these LaTeX papers — and Postgres rejects the whole insert with "invalid
 * byte sequence for encoding UTF8: 0x00". Control characters carry nothing a
 * reader needs, so they go; tabs and newlines are collapsed into spaces by the
 * callers anyway.
 */
function clean(text) {
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
}

/**
 * Splits a paper into its numbered problems.
 *
 * Markers come in every spacing the two years could manage — "Задача 1 [5
 * баллов].", "Есеп_1 [8 ұпай].", "Есеп _2" — so the underscore and the spaces
 * around it are all optional, and what anchors the match is the number
 * followed by a bracket or a full stop.
 */
export const MARKER = /(?:Задача|Есеп|Тапсырма)\s*_?\s*(\d{1,2})\s*_?\s*[.\[]/g

export function splitProblems(text) {
  const body = text.replace(/\r/g, '')
  const starts = []
  let match
  MARKER.lastIndex = 0
  while ((match = MARKER.exec(body)) !== null) {
    starts.push({ number: Number(match[1]), at: match.index, from: match.index })
  }

  const found = []
  for (const [index, point] of starts.entries()) {
    const until = starts[index + 1]?.at ?? body.length
    const statement = clean(body.slice(point.from, until)).replace(/\s+/g, ' ').trim()
    if (statement.length < 120) continue
    const points = Number(statement.match(/\[\s*([\d,.]+)\s*(?:балл|ұпай)/i)?.[1]?.replace(',', '.') ?? 0)
    found.push({ number: point.number, statement, points })
  }
  return found
}

/**
 * The Russian half of a bilingual paper.
 *
 * Both languages sit in one file, Kazakh first. Cutting at the first Russian
 * marker gives the Russian paper whole; a file with no Russian marker is
 * Kazakh only, and is kept as it is rather than dropped — half the archive is
 * like that, and a Kazakh statement is a real problem.
 */
export function preferRussian(text) {
  const at = text.search(/Задача\s*_?\s*1\s*_?\s*[.\[]/)
  return at === -1 ? { text, language: 'kk' } : { text: text.slice(at), language: 'ru' }
}

/**
 * The letterhead off a paper that is one task from top to bottom.
 *
 * A numbered paper is cut at its numbers, so its header never reaches a
 * statement. The second round is a single problem with nothing to cut at, and
 * it was going into the catalogue opening with "«ДАРЫН» РЕСПУБЛИКАЛЫҚ
 * ҒЫЛЫМИ-ПРАКТИКАЛЫҚ ОРТАЛЫҒЫ".
 */
export function withoutLetterhead(text) {
  const after = text.match(/Жұмыс уақыты:[^\n]*\n|Время работы:[^\n]*\n|\d+\s*ұпай\s*\n/g)
  if (!after) return text
  const last = text.lastIndexOf(after[after.length - 1])
  return text.slice(last + after[after.length - 1].length)
}

/** A statement that points at a picture we do not have is not a problem. */
export const FIGURE = /рисун|рисуно|суретт|сурет\b|на схеме|графике ниже|көрсетілген|суретке/i

export function difficultyFor(stage, grade) {
  const base = stage === 'republican' ? 4 : 3
  return Math.min(5, Math.max(2, base + (grade >= 11 ? 1 : 0) - (grade <= 9 ? 1 : 0)))
}

export async function textOf(file) {
  const pdf = await getDocumentProxy(new Uint8Array(await readFile(file)))
  return (await extractText(pdf, { mergePages: true })).text
}

/** The section a statement belongs to, by the words it uses. */
export function topicFor(statement) {
  return TOPICS.find(([re]) => re.test(statement))?.[1] ?? 'mechanics'
}

/**
 * The republican papers number their problems differently.
 *
 * The oblast papers are Word documents that write "Задача_3 [9 баллов].". The
 * republican finals are set in LaTeX and write "Задача 1A. Второй шанс (4.0
 * балла)" — a letter, a title, and the points in round brackets. So they need
 * their own splitter, and they get a different unit of work besides: "Задача 1"
 * is an umbrella over three independent parts, each with its own points and its
 * own section in the marking scheme, so 1A, 1B and 1C become three problems
 * rather than one.
 *
 * The umbrella itself falls out on length — its whole body is the sentence
 * saying the parts are independent.
 */
// The title may itself contain brackets — "Задача 1B. Переменный (?) ток (3.5
// балла)" — so the title is lazy over everything but a newline and the engine
// backtracks past the first bracket until one is followed by the points.
const LETTERED = /Задача\s+(\d{1,2}[A-ZА-Я]?)\s*\.?\s*([^\n]{0,60}?)\s*\(\s*([\d.,]+)\s*балл/g

export function splitLettered(text) {
  const body = text.replace(/\r/g, '')
  const starts = []
  LETTERED.lastIndex = 0
  let match
  while ((match = LETTERED.exec(body)) !== null) {
    starts.push({
      label: match[1],
      title: match[2].trim().replace(/[.,:]$/, ''),
      points: Number(match[3].replace(',', '.')),
      at: match.index,
    })
  }

  const found = []
  for (const [index, point] of starts.entries()) {
    const until = starts[index + 1]?.at ?? body.length
    const statement = clean(body.slice(point.at, until)).replace(/\s+/g, ' ').trim()
    if (statement.length < 220) continue
    found.push({ ...point, statement })
  }
  return found
}
