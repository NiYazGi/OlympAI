import 'server-only'

export const DIAGNOSTIC_VERSION = 'baseline-v1'
export const DIAGNOSTIC_MINUTES = 12
export type DiagnosticDimensionKey = 'knowledge' | 'methods' | 'presentation' | 'independence'
export type ObjectiveDimension = Exclude<DiagnosticDimensionKey, 'independence'>
export type DiagnosticAnswer = { choice: number; hintUsed: boolean }
export type DiagnosticAnswers = Record<string, DiagnosticAnswer>
export type Assistance = 'alone' | 'small-help' | 'guided'
export type DiagnosticReport = { assistance: Assistance; note: string }
export type PublicDiagnosticQuestion = { id: string; dimension: ObjectiveDimension; skillIds: string[]; prompt: string; options: string[] }
export type DiagnosticQuestion = PublicDiagnosticQuestion & { correct: number; explanation: string; hint: string }
export type DimensionResult = { score: number | null; answered: number; total: number; basis: 'objective' | 'self-report' | 'none'; label: string }
export type DiagnosticEvidence = { questionId: string; prompt: string; dimension: ObjectiveDimension; skillIds: string[]; selected: string; correctAnswer: string; correct: boolean; hintUsed: boolean; explanation: string }
export type DiagnosticResult = {
  dimensions: Record<DiagnosticDimensionKey, DimensionResult>
  weakSkillIds: string[]
  strongSkillIds: string[]
  skillScores: Record<string, number>
  skillChecks: Record<string, { correct: number; total: number; hinted: number }>
  evidence: DiagnosticEvidence[]
  observedHints: number
  selfReport: DiagnosticReport
  coverage: string
}

const question = (id: string, dimension: ObjectiveDimension, skillIds: string[], prompt: string, options: string[], correct: number, explanation: string, hint: string): DiagnosticQuestion => ({ id, dimension, skillIds, prompt, options, correct, explanation, hint })

const MATHEMATICS: readonly DiagnosticQuestion[] = [
  question('math-roots-knowledge', 'knowledge', ['quadratic-roots'], String.raw`Найди все корни \(x^2-5x+6=0\).`, ['2 и 3', '−2 и −3', '1 и 6', '3 и 5'], 0, String.raw`\(x^2-5x+6=(x-2)(x-3)\). Оба найденных значения обращают исходную левую часть в нуль.`, 'Найди два числа, сумма которых равна 5, а произведение — 6.'),
  question('math-roots-method', 'methods', ['quadratic-roots'], String.raw`После возведения \(\sqrt{x+1}=x-1\) в квадрат получились кандидаты 0 и 3. Что нужно сделать до записи ответа?`, ['Принять оба кандидата: квадрат равенства равносилен исходному', 'Отбросить дробные корни и закончить', 'Проверить ограничение x ≥ 1 и подставить кандидаты в исходное равенство', 'Выбрать меньший корень'], 2, 'Правая часть корня должна быть неотрицательной, поэтому x ≥ 1. Подстановка оставляет x=3; x=0 — посторонний корень.', 'Возведение в квадрат может потерять информацию о знаках.'),
  question('math-mod-knowledge', 'knowledge', ['modular-remainders'], 'Какие остатки может иметь квадрат целого числа при делении на 4?', ['0, 1, 2 и 3', 'Только 0 и 1', 'Только 0 и 2', 'Только 1 и 3'], 1, String.raw`Чётное число имеет вид \(2k\), его квадрат делится на 4. Квадрат нечётного \((2k+1)^2=4k(k+1)+1\) даёт остаток 1.`, 'Рассмотри отдельно чётное и нечётное число.'),
  question('math-mod-method', 'methods', ['modular-remainders'], String.raw`Какой остаток даёт \(7^5\) при делении на 6? Выбери ответ вместе с обоснованием.`, ['1: число 7 сравнимо с 1 по модулю 6, значит и его пятая степень сравнима с 1', '5: достаточно взять показатель степени', '0: степень всегда делится на число на единицу меньше основания', '7: остаток совпадает с основанием'], 0, String.raw`\(7\equiv1\pmod6\), поэтому \(7^5\equiv1^5\equiv1\pmod6\). Остаток должен быть меньше делителя.`, 'Замени основание его остатком по модулю 6.'),
  question('math-boxes-knowledge', 'knowledge', ['pigeonhole'], '13 шариков раскладывают по 5 ящикам. Какое наибольшее число шариков в одном ящике гарантировано независимо от раскладки?', ['Не менее 2', 'Не менее 3', 'Не менее 4', 'Не менее 5'], 1, 'Если в каждом ящике не больше двух шариков, всего их не больше 10. Раскладка 3,3,3,2,2 показывает, что четыре не гарантируются.', 'Сначала предположи, что во всех ящиках шариков меньше искомой границы.'),
  question('math-boxes-method', 'methods', ['pigeonhole'], 'Нужно доказать, что среди шести целых чисел найдутся два с чётной разностью. Какие «ящики» подходят?', ['Два ящика: чётные и нечётные числа', 'Шесть ящиков: по одному на каждое число', 'Ящики по количеству цифр', 'Ящики по величине самих чисел, без заданных границ'], 0, 'Два числа одной чётности имеют чётную разность. Ящиков два, а чисел шесть, поэтому в одном ящике будут хотя бы два числа.', 'Подумай, какой признак определяет чётность разности двух чисел.'),
  question('math-presentation-sign', 'presentation', [], String.raw`В решении написано: «Из \(a^2=b^2\) следует \(a=b\)». Какое замечание жюри будет точным?`, ['Шаг всегда верен', 'Нужно учесть a=−b или обосновать одинаковые знаки', 'Достаточно заменить знак = на ≈', 'Ошибка только в оформлении индексов'], 1, 'Например, 1²=(−1)², но 1≠−1. Это логический пробел, а не косметическая ошибка записи.', 'Проверь утверждение на двух числах с разными знаками.'),
  question('math-presentation-proof', 'presentation', [], 'Ученик проверил утверждение для n=1,…,100 и написал «доказано для всех натуральных n». Что нужно добавить?', ['Общий аргумент, например базу и корректный переход математической индукции', 'Ещё сто проверок', 'Только более аккуратный почерк', 'Ничего: сто примеров достаточно'], 0, 'Конечный набор примеров не доказывает утверждение о всех натуральных числах. Нужен аргумент, охватывающий произвольное n.', 'Отличается ли проверка примеров от общего доказательства?'),
]
const PHYSICS: readonly DiagnosticQuestion[] = [
  question('physics-friction-knowledge', 'knowledge', ['static-friction'], 'Брусок покоится на столе. Его тянут горизонтальной силой 6 Н. Нормальная реакция 20 Н, коэффициент трения покоя 0,5. Чему равна сила трения?', ['3 Н', '6 Н', '10 Н', '0 Н'], 1, 'Для покоя горизонтальные силы уравновешены: трение равно 6 Н. Величина μN=10 Н — максимальное возможное трение покоя, а не обязательное значение.', 'Запиши условие равновесия и отдельно проверь предел μN.'),
  question('physics-friction-method', 'methods', ['static-friction'], 'Как правильно проверить, может ли тело оставаться без проскальзывания?', ['Всегда положить Fтр=μN', 'Сразу заменить трение покоя трением скольжения', 'Найти необходимое трение из уравнений движения и проверить |Fтр| ≤ μN', 'Не учитывать трение, пока тело не движется'], 2, 'Сначала находят силу, которая нужна для заданного движения без проскальзывания. Затем проверяют, может ли трение покоя обеспечить эту силу.', 'Условие отсутствия проскальзывания — не равенство во всех случаях.'),
  question('physics-momentum-knowledge', 'knowledge', ['momentum-system'], 'Два тела слипаются при столкновении. Внешний импульс пренебрежимо мал. Что сохраняется для системы из двух тел?', ['Только кинетическая энергия', 'Суммарный импульс, но не обязательно кинетическая энергия', 'И скорость каждого тела, и кинетическая энергия', 'Импульс только более тяжёлого тела'], 1, 'Для выбранной системы внешний импульс мал, поэтому её суммарный импульс сохраняется. При неупругом ударе часть кинетической энергии переходит во внутреннюю.', 'Отдели закон сохранения импульса от закона сохранения механической энергии.'),
  question('physics-momentum-method', 'methods', ['momentum-system'], 'Какой первый шаг нужен перед применением закона сохранения импульса к столкновению?', ['Включить оба взаимодействующих тела в систему, выбрать промежуток времени и оценить внешний импульс', 'Выбрать только одно тело и забыть про силу второго', 'Приравнять начальные скорости тел', 'Сразу приравнять кинетические энергии до и после'], 0, 'Нужно назвать систему и объяснить, почему внешний импульс за выбранное время мал. Внутренние силы взаимодействия тел не меняют её суммарный импульс.', 'Сохранение импульса относится к системе, а не к любому выбранному телу.'),
  question('physics-scaling-knowledge', 'knowledge', ['geometric-similarity'], 'Все линейные размеры геометрически подобной модели увеличили в 2 раза. Материал тот же. Во сколько раз выросла масса?', ['В 2', 'В 4', 'В 8', 'В 16'], 2, String.raw`Объём и масса при одинаковой плотности пропорциональны кубу длины: \(m_2/m_1=2^3=8\).`, 'Увеличены длина, ширина и высота.'),
  question('physics-scaling-method', 'methods', ['geometric-similarity'], 'Сравнивают мощность двигателей подобных вертолётов в висении. Как выбрать зависимость мощности от размера?', ['Мощность всегда пропорциональна массе, других условий не нужно', 'Сначала выразить тягу и мощность через поток воздуха, затем применить подобие и проверить размерность', 'Взять квадрат масштаба только потому, что есть площадь винта', 'Приравнять мощность нулю: вертолёт не движется'], 1, 'Геометрическое подобие даёт отношения массы и площади. Закон для мощности дополнительно требует физической модели движения воздуха и одинаковых условий сравнения.', 'Неподвижный аппарат всё равно передаёт энергию воздуху.'),
  question('physics-bridge-knowledge', 'knowledge', ['balanced-bridge'], 'В мосте слева сверху R₁=10 Ом, снизу R₂=20 Ом; справа сверху R₃=30 Ом. При каком нижнем правом сопротивлении R₄ средние точки имеют одинаковый потенциал?', ['60 Ом', '15 Ом', '30 Ом', '20 Ом'], 0, String.raw`Для указанных плеч \(R_1/R_2=R_3/R_4\), значит \(R_4=R_2R_3/R_1=60\ \text{Ом}\).`, 'Сравни напряжения на нижних резисторах двух ненагруженных делителей.'),
  question('physics-bridge-method', 'methods', ['balanced-bridge'], 'Мост разбалансирован, через диагональную ветвь идёт ток. Какой подход корректен?', ['Выбросить диагональную ветвь: её ток обычно невелик', 'Применять условие баланса при любом токе в диагонали', 'Назвать потенциалы узлов и составить уравнения Кирхгофа с учётом диагональной ветви', 'Сложить все сопротивления как последовательные'], 2, 'Условие равновесия моста применимо только при равных потенциалах средних точек. В разбалансированной схеме ток в диагонали включают в уравнения.', 'Нулевая диагональная разность потенциалов — особое условие, а не свойство любого моста.'),
  question('physics-presentation-units', 'presentation', [], 'Какая строка корректно переводит 24 мА в амперы?', ['I=24 мА=24 А', 'I=24 мА=24·10³ А', 'I=24 мА=24·10⁻³ А=0,024 А', 'I=24 мА=0,24 А'], 2, 'Приставка милли- означает 10⁻³. Единицы нужно согласовать до подстановки в формулу.', 'Миллиампер меньше ампера в тысячу раз.'),
  question('physics-presentation-argument', 'presentation', [], 'Какой фрагмент решения лучше обосновывает закон сохранения импульса?', ['«Пользуемся известной формулой»', '«Рассматриваем оба тела за короткое время удара; внешний импульс мал, поэтому суммарный импульс сохраняется»', '«В ответе получились ньютоны, значит всё верно»', '«Так было в похожей задаче»'], 1, 'Полное обоснование называет систему, промежуток времени и условие применимости закона. Правильная размерность одна не доказывает решение.', 'Укажи, к чему именно и при каких условиях применяется закон.'),
]
const INFORMATICS: readonly DiagnosticQuestion[] = [
  question('informatics-loop-knowledge', 'knowledge', ['algorithm-complexity'], 'Цикл выполняется n раз, и каждая итерация занимает постоянное время. Как растёт время работы?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 2, 'Число одинаковых по стоимости итераций пропорционально n.', 'Посчитай число повторений основной операции.'),
  question('informatics-nested-method', 'methods', ['algorithm-complexity'], 'Внешний цикл выполняется n раз. Внутренний каждый раз тоже выполняется n раз. Как оценить общее число итераций?', ['Сложить n+n', 'Умножить n·n', 'Всегда взять O(log n)', 'Оно не зависит от n'], 1, 'Для каждого из n проходов внешнего цикла есть n внутренних шагов: всего n².', 'Посчитай внутренние шаги отдельно для каждого прохода внешнего цикла.'),
  question('informatics-invariant-knowledge', 'knowledge', ['loop-invariant'], 'Массив суммируют слева направо. Какой инвариант подходит после обработки первых k элементов?', ['Сумма равна сумме всего массива', 'Текущая сумма равна сумме первых k элементов', 'Все элементы массива уже отсортированы', 'Сумма всегда равна нулю'], 1, 'Инвариант описывает именно обработанный префикс. После последнего шага он даёт искомую сумму всего массива.', 'Отдели уже обработанную часть массива от оставшейся.'),
  question('informatics-invariant-method', 'methods', ['loop-invariant'], 'Что необходимо проверить для доказательства цикла с помощью инварианта?', ['Только один пример', 'Инициализацию, сохранение на шаге и связь с ответом после завершения', 'Только имя переменной', 'Только скорость программы'], 1, 'Нужны три части: инвариант истинен до цикла, сохраняется переходом и после завершения влечёт правильность ответа.', 'Утверждение должно работать до, во время и после цикла.'),
  question('informatics-correctness-knowledge', 'knowledge', ['algorithm-correctness'], 'Для монет 1, 3, 4 жадно берут наибольшую подходящую. Что показывает сумма 6?', ['Жадность всегда оптимальна', 'Жадность берёт 4+1+1, а оптимально 3+3: это контрпример', 'Шесть нельзя набрать', 'Число монет не зависит от выбора'], 1, 'Один контрпример опровергает утверждение о корректности жадного алгоритма для всех сумм.', 'Сравни жадный выбор с двумя монетами по 3.'),
  question('informatics-correctness-method', 'methods', ['algorithm-correctness'], 'Как обосновать завершение цикла?', ['Сказать, что он быстро работает на компьютере автора', 'Указать неотрицательную целую величину, строго убывающую на каждом шаге', 'Показать один запуск', 'Добавить комментарий «цикл конечный»'], 1, 'Строго убывающая неотрицательная целая величина не может уменьшаться бесконечно.', 'Нужна величина, которая не может убывать бесконечно.'),
  question('informatics-presentation-tests', 'presentation', [], 'Программа прошла десять примеров. Доказана ли её корректность для всех допустимых входов?', ['Да, десяти достаточно', 'Нет: тесты полезны, но нужен общий аргумент или доказательство', 'Да, если примеры длинные', 'Да, если код короткий'], 1, 'Тесты находят ошибки, но конечный набор успешных примеров сам по себе не доказывает универсальное утверждение.', 'Пример и доказательство решают разные задачи.'),
  question('informatics-presentation-bounds', 'presentation', [], 'Массив имеет n элементов с индексами 0,…,n−1. Какое пояснение границ цикла корректно?', ['Идём до n включительно: так проверяется последний элемент', 'Условие i<n включает ровно индексы 0,…,n−1 и не выходит за границы', 'Начинаем с 1 и забываем элемент 0', 'Границы не нужно объяснять'], 1, 'Полуинтервал [0,n) содержит n индексов; индекс n уже за пределами массива.', 'Запиши допустимые индексы как полуинтервал.'),
]

export function diagnosticQuestions(subject: string): readonly DiagnosticQuestion[] {
  return subject === 'Mathematics' ? MATHEMATICS : subject === 'Physics' ? PHYSICS : subject === 'Informatics' ? INFORMATICS : []
}
export function publicDiagnosticQuestions(subject: string): PublicDiagnosticQuestion[] {
  return diagnosticQuestions(subject).map(({ id, dimension, skillIds, prompt, options }) => ({ id, dimension, skillIds, prompt, options }))
}

export function scoreDiagnostic(subject: string, answers: DiagnosticAnswers, report: DiagnosticReport): DiagnosticResult {
  const questions = diagnosticQuestions(subject)
  const evidence = questions.map((item): DiagnosticEvidence => ({ questionId: item.id, prompt: item.prompt, dimension: item.dimension, skillIds: item.skillIds,
    selected: answers[item.id]?.choice === -1 ? 'Пока не знаю' : item.options[answers[item.id]?.choice] ?? 'Нет ответа',
    correctAnswer: item.options[item.correct], correct: answers[item.id]?.choice === item.correct,
    hintUsed: Boolean(answers[item.id]?.hintUsed), explanation: item.explanation }))
  const dimension = (key: ObjectiveDimension, label: string): DimensionResult => {
    const checks = evidence.filter((item) => item.dimension === key)
    const answered = checks.filter((item) => answers[item.questionId] && answers[item.questionId].choice !== -1).length
    return { score: checks.length ? Math.round(100 * checks.filter((item) => item.correct).length / checks.length) : null, answered, total: checks.length, basis: checks.length ? 'objective' : 'none', label }
  }
  const skillChecks: Record<string, { correct: number; total: number; hinted: number }> = {}
  for (const item of evidence) {
    for (const id of item.skillIds) {
      const current = skillChecks[id] ?? { correct: 0, total: 0, hinted: 0 }
      current.total++
      if (item.correct) current.correct++
      if (item.hintUsed) current.hinted++
      skillChecks[id] = current
    }
  }
  const skillScores = Object.fromEntries(Object.entries(skillChecks).map(([id, value]) => [id, Math.round(100 * value.correct / value.total)]))
  return {
    dimensions: { knowledge: dimension('knowledge', 'Базовые знания'), methods: dimension('methods', 'Выбор метода'), presentation: dimension('presentation', 'Логика и оформление'),
      independence: { score: null, answered: questions.length, total: questions.length, basis: 'self-report', label: 'Самостоятельность: подсказки и самоотчёт' } },
    weakSkillIds: Object.keys(skillChecks).filter((id) => skillChecks[id].total >= 2 && skillScores[id] < 70),
    strongSkillIds: Object.keys(skillChecks).filter((id) => report.assistance === 'alone' && skillChecks[id].total >= 2 && skillScores[id] >= 75 && skillChecks[id].hinted === 0),
    skillScores, skillChecks, evidence, observedHints: evidence.filter((item) => item.hintUsed).length, selfReport: report,
    coverage: subject === 'Informatics' ? 'Базовые алгоритмические навыки: сложность, инвариант и доказательство. Это не полная диагностика олимпиадной информатики.' : 'Короткая базовая диагностика выбранных навыков. Результат не означает освоение всех тем и не заменяет проверку полноценного олимпиадного решения.',
  }
}
