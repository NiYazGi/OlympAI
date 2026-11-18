/**
 * Concrete methods, kept separate from broad importer topics.
 * Editorial links are audited against the statement; keyword candidates are
 * visible suggestions and must never be used as confirmed mastery evidence.
 */
import { TASK_METHODS, methodsForTask } from '@/lib/task-methods'

export type ConcreteSkill = {
  id: string
  name: string
  subject: 'Mathematics' | 'Physics' | 'Informatics'
  topic: string
  prerequisite: string
  lessonHref?: string
}

export const SKILLS: readonly ConcreteSkill[] = [
  { id: 'quadratic-roots', name: 'Корни квадратного уравнения и проверка', subject: 'Mathematics', topic: 'Algebra', prerequisite: 'Разложение на множители и подстановка найденного корня.' },
  { id: 'integer-roots', name: 'Целые корни и формулы Виета', subject: 'Mathematics', topic: 'Algebra', prerequisite: 'Сумма и произведение корней; делимость целых чисел.' },
  { id: 'modular-remainders', name: 'Остатки и сравнения по модулю', subject: 'Mathematics', topic: 'Number Theory', prerequisite: 'Остатки суммы и произведения; допустимые остатки квадратов.' },
  { id: 'parity-invariant', name: 'Чётность как инвариант', subject: 'Mathematics', topic: 'Combinatorics', prerequisite: 'Что сохраняется при одной разрешённой операции.' },
  { id: 'pigeonhole', name: 'Выбор ящиков в принципе Дирихле', subject: 'Mathematics', topic: 'Combinatorics', prerequisite: 'Разделить объекты на непересекающиеся группы и сравнить их число.' },
  { id: 'double-counting', name: 'Подсчёт одной величины двумя способами', subject: 'Mathematics', topic: 'Combinatorics', prerequisite: 'Явно назвать множество, которое считается в обеих частях равенства.' },
  { id: 'circle-angles', name: 'Вписанные углы и общая дуга', subject: 'Mathematics', topic: 'Geometry', prerequisite: 'Различать центральный и вписанный угол, указать общую дугу.' },
  { id: 'static-friction', name: 'Трение покоя и предел проскальзывания', subject: 'Physics', topic: 'Mechanics', prerequisite: 'Силы и второй закон Ньютона; Fтр ≤ μN, а не всегда μN.' },
  { id: 'momentum-system', name: 'Выбор системы для сохранения импульса', subject: 'Physics', topic: 'Mechanics', prerequisite: 'Включить оба взаимодействующих тела и проверить внешний импульс.' },
  { id: 'heat-balance', name: 'Выбор системы и уравнение теплового баланса', subject: 'Physics', topic: 'Thermodynamics', prerequisite: 'Учитывать теплоёмкость всех тел в изолированной системе.' },
  ...TASK_METHODS.map((method): ConcreteSkill => ({ id: method.id, name: method.name, subject: 'Physics', topic: method.topicSlug === 'mechanics' ? 'Mechanics' : 'Electrodynamics', prerequisite: method.prerequisites.map((item) => item.title).join('; '), lessonHref: `/methods/${method.id}` })),
  { id: 'measurement-uncertainty', name: 'Погрешности прямых и косвенных измерений', subject: 'Physics', topic: 'Experimental physics', prerequisite: 'Случайная и систематическая погрешность; сложение относительных погрешностей для произведения.' },
  { id: 'graph-linearisation', name: 'Линеаризация графика и метод наименьших квадратов', subject: 'Physics', topic: 'Experimental physics', prerequisite: 'Выбрать оси, в которых закон — прямая; смысл наклона и отрезка.' },
  { id: 'experiment-report', name: 'Оформление экспериментального отчёта', subject: 'Physics', topic: 'Experimental physics', prerequisite: 'Метод, таблица данных, график, результат с погрешностью, источники ошибок.' },
  { id: 'loop-invariant', name: 'Инвариант цикла', subject: 'Informatics', topic: 'Implementation', prerequisite: 'Состояние до итерации, переход и условие завершения.' },
  { id: 'algorithm-complexity', name: 'Оценка времени алгоритма', subject: 'Informatics', topic: 'Implementation', prerequisite: 'Число повторений операций как функция размера входа.' },
  { id: 'algorithm-correctness', name: 'Доказательство корректности алгоритма', subject: 'Informatics', topic: 'Implementation', prerequisite: 'Отделить доказательство от проверки на нескольких примерах.' },
]

/** Audited links refer to the stated part, not to a speculative solution. */
export const EDITORIAL_TASK_SKILLS: Readonly<Record<string, readonly string[]>> = {
  'exp-pendulum-g': ['graph-linearisation', 'measurement-uncertainty', 'experiment-report'],
  'exp-resistor-iv': ['graph-linearisation', 'measurement-uncertainty'],
  'exp-cooling-law': ['graph-linearisation', 'experiment-report'],
  'exp-spring-mass': ['graph-linearisation', 'measurement-uncertainty'],
  'exp-density-uncertainty': ['measurement-uncertainty', 'experiment-report'],
  'exp-friction-design': ['experiment-report', 'measurement-uncertainty'],
  'phys-oblast-2011-10-t1-2': ['geometric-similarity', 'momentum-flux', 'energy-flux', 'dimensional-check'],
  'phys-oblast-2011-9-t1-1': ['geometric-similarity', 'momentum-flux', 'energy-flux', 'dimensional-check'],
  'phys-national-2025-9-t1-3': ['kirchhoff-rules', 'balanced-bridge', 'iv-characteristic'],
  'phys-national-2013-9-t1-1': ['static-friction', 'heat-balance'],
  'phys-national-2016-10-t1-1': ['momentum-system', 'momentum-flux'],
  'phys-oblast-2013-10-t1-1': ['momentum-system'],
  'gzho-2005-9-2': ['quadratic-roots', 'integer-roots', 'parity-invariant'],
  'gzho-2005-8-3': ['quadratic-roots', 'integer-roots'],
  'gzho-2004-8-4': ['quadratic-roots'],
  'gzho-2006-7-8': ['modular-remainders'],
  'gzho-2019-8-1': ['modular-remainders'],
  'national-1999-11-6': ['modular-remainders'],
  'national-2016-10-5': ['modular-remainders'],
  'phys-national-2012-11-t1-1': ['momentum-system'],
  'phys-national-2012-10-t1-2': ['momentum-system'],
  'gzho-2003-11-3': ['modular-remainders'],
  'gzho-2002-8-3': ['modular-remainders'],
  'apmo-2008-5': ['modular-remainders'],
  'national-2002-9-7': ['parity-invariant'],
  'gzho-2017-8-3': ['double-counting', 'modular-remainders'],
  'gzho-2013-9-4': ['pigeonhole'],
}

export type SkillTask = { id: string; subject: string; topic?: string; problem?: string }
export type TaskSkillLink = ConcreteSkill & { provenance: 'editorial' | 'candidate'; confidence: 'verified' | 'suggested' }
const CANDIDATES: readonly { id: string; pattern: RegExp }[] = [
  { id: 'static-friction', pattern: /трени[яею][\s\S]{0,32}поко|поко[яе][\s\S]{0,40}трени|static friction/i },
  { id: 'momentum-system', pattern: /неупруг|сохранени[ея] импульса|conservation of momentum/i },
  { id: 'balanced-bridge', pattern: /мост[а-я]* У[иі]тстон|Wheatstone/i },
  { id: 'iv-characteristic', pattern: /вольт.?амперн|(?:^|[^\p{L}\p{N}_])ВАХ(?=$|[^\p{L}\p{N}_])|current.voltage characteristic/iu },
  { id: 'geometric-similarity', pattern: /модель вертоле|геометрически подобн|geometrically similar/i },
  { id: 'integer-roots', pattern: /целые корни|корни[^.]{0,30}целые|integer roots/i },
  { id: 'modular-remainders', pattern: /остат[ко][аиок]* от деления|\\pmod|remainder.*divis/i },
  { id: 'parity-invariant', pattern: /ч[её]тность|инвариант|parity|invariant/i },
  { id: 'pigeonhole', pattern: /Дирихле|pigeonhole/i },
  { id: 'circle-angles', pattern: /вписанн[а-я]* угол|inscribed angle/i },
  { id: 'loop-invariant', pattern: /инвариант цикла|loop invariant/i },
  { id: 'algorithm-correctness', pattern: /корректност[ьи] алгоритма|algorithm correctness/i },
  { id: 'algorithm-complexity', pattern: /сложност[ьи] алгоритма|O\(n|time complexity/i },
]

export function skillById(id: string) { return SKILLS.find((skill) => skill.id === id) ?? null }

export function taskSkills(task: SkillTask): TaskSkillLink[] {
  const editorial = Object.hasOwn(EDITORIAL_TASK_SKILLS, task.id) ? EDITORIAL_TASK_SKILLS[task.id] : methodsForTask(task.id).map((method) => method.id)
  const verified = new Set(editorial)
  const inferred = CANDIDATES.filter(({ pattern }) => task.problem && pattern.test(task.problem)).map(({ id }) => id)
  return [...new Set([...editorial, ...inferred])].flatMap((id) => {
    const skill = skillById(id)
    if (!skill || skill.subject !== task.subject) return []
    return [{ ...skill, provenance: verified.has(id) ? 'editorial' as const : 'candidate' as const, confidence: verified.has(id) ? 'verified' as const : 'suggested' as const }]
  })
}

export function skillIdsForTask(task: SkillTask, options: { verifiedOnly?: boolean } = {}) {
  return taskSkills(task).filter((skill) => !options.verifiedOnly || skill.provenance === 'editorial').map((skill) => skill.id)
}
