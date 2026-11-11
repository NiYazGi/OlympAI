/** Editorial links only. A shared broad topic is never a method match. */
export type TaskMethod = {
  id: string
  name: string
  topicSlug: string
  prerequisites: { title: string; explanation: string }[]
  idea: string
  steps: { title: string; body: string }[]
  pitfall: string
  practice: { question: string; answer: number; unit: string; tolerance?: number; explanation: string }
  source: { title: string; url: string; read: string }
}

const rotorSource = {
  title: 'Momentum Theory · Fundamentals of Helicopter Aerodynamics',
  url: 'https://kumar-sumeet.github.io/HeliAeroNotes/Lectures/1_MT/MT.html',
  read: 'Раздел Hover: вывод связи тяги, скорости потока и мощности. Дополнительный источник на английском; основная идея разобрана ниже по-русски.',
}
const circuitSource = {
  title: 'OpenStax · University Physics 2, §10.3',
  url: 'https://openstax.org/books/university-physics-volume-2/pages/10-3-kirchhoffs-rules',
  read: 'Kirchhoff’s Rules: правила узла и контура, затем стратегия составления уравнений. Дополнительное чтение на английском.',
}

export const TASK_METHODS: TaskMethod[] = [
  {
    id: 'geometric-similarity', name: 'Подобие и масштабирование', topicSlug: 'mechanics',
    prerequisites: [{ title: 'Площадь и объём', explanation: 'Площадь измеряется в квадратных единицах, объём — в кубических. При одинаковой плотности масса пропорциональна объёму.' }],
    idea: 'Сначала выбери линейный масштаб: во сколько раз увеличилась длина. Каждая физическая величина масштабируется по своему закону.',
    steps: [
      { title: 'Зафиксируй масштаб', body: String.raw`Пусть \(k=L_2/L_1\). Для геометрически подобных тел \(S_2/S_1=k^2\), \(V_2/V_1=k^3\). При одинаковом материале \(m_2/m_1=k^3\).` },
      { title: 'Отдели геометрию от физики', body: 'Для мощности нельзя сразу выбрать квадрат или куб масштаба: сначала нужно выразить её через силу и скорость потока. Одинаковый материал не означает одинаковую мощность на единицу массы.' },
    ],
    pitfall: 'Увеличивать массу в k раз, хотя увеличены все три линейных размера.',
    practice: { question: 'У двух подобных моделей из одного материала все длины отличаются в 3 раза. Во сколько раз отличается масса?', answer: 27, unit: 'раз', explanation: String.raw`\(m_2/m_1=3^3=27\).` }, source: rotorSource,
  },
  {
    id: 'momentum-flux', name: 'Поток импульса', topicSlug: 'mechanics',
    prerequisites: [{ title: 'Импульс и второй закон Ньютона', explanation: String.raw`\(p=mv\), а сила равна изменению импульса за время: \(F=\Delta p/\Delta t\).` }],
    idea: 'Винт удерживает аппарат, ускоряя воздух вниз. Удобно следить не за одной порцией воздуха, а за массой, проходящей через винт за секунду.',
    steps: [
      { title: 'Масса в секунду', body: String.raw`Через площадь \(A\) со скоростью \(v_i\) проходит расход \(\dot m=\rho A v_i\). Точка над \(m\) означает «за единицу времени».` },
      { title: 'Тяга в идеальном висении', body: String.raw`Воздух далеко перед винтом покоится, а далеко за ним имеет скорость \(2v_i\). Поэтому \(T=\dot m\,2v_i=2\rho A v_i^2\). В висении \(T=mg\). Скорость у диска и скорость далёкой струи различаются.` },
    ],
    pitfall: 'Подменять скорость воздуха у диска скоростью далёкой струи или писать силу как импульс без деления на время.',
    practice: { question: 'За секунду устройство ускоряет 4 кг воздуха от покоя до 6 м/с. Чему равна сила тяги? Введите значение в ньютонах.', answer: 24, unit: 'Н', explanation: String.raw`\(T=\dot m\,\Delta v=4\cdot6=24\ \text{Н}\).` }, source: rotorSource,
  },
  {
    id: 'energy-flux', name: 'Поток энергии и мощность', topicSlug: 'mechanics',
    prerequisites: [{ title: 'Кинетическая энергия', explanation: String.raw`\(E_k=mv^2/2\). Мощность — энергия, переданная за секунду: \(P=\Delta E/\Delta t\).` }, { title: 'Поток импульса', explanation: String.raw`Для идеального винта в висении \(T=2\rho A v_i^2\), где \(v_i\) — скорость воздуха у диска.` }],
    idea: 'Даже если сам аппарат неподвижен, двигатель сообщает кинетическую энергию воздуху. Поэтому мощность не равна нулю.',
    steps: [
      { title: 'Посчитай энергию струи в секунду', body: String.raw`В идеальной модели \(P=\tfrac12\dot m(2v_i)^2=T v_i\). Исключая \(v_i\), получаем \[P=\frac{T^{3/2}}{\sqrt{2\rho A}}.\] Это идеальная индуктивная мощность: потери в двигателе и профильное сопротивление не учтены.` },
      { title: 'Соедини с подобием', body: String.raw`Для подобных аппаратов из одинакового материала \(T\propto L^3\), \(A\propto L^2\). Тогда \(P\propto L^{7/2}\), если плотность воздуха одинакова и коэффициенты потерь при сравнении сохраняются.` },
    ],
    pitfall: 'Подставлять в P=Fv скорость аппарата вместо скорости ускоряемого потока. Для реального двигателя нужно дополнительно учитывать КПД.',
    practice: { question: 'Тяга идеального винта 100 Н, скорость воздуха у диска 3 м/с. Найдите индуктивную мощность в ваттах.', answer: 300, unit: 'Вт', explanation: String.raw`\(P=T v_i=100\cdot3=300\ \text{Вт}\).` }, source: rotorSource,
  },
  {
    id: 'dimensional-check', name: 'Проверка размерности', topicSlug: 'mechanics',
    prerequisites: [{ title: 'Единицы СИ', explanation: String.raw`\([F]=\text{кг}\cdot\text{м}/\text{с}^2\), \([\rho]=\text{кг}/\text{м}^3\), \([A]=\text{м}^2\).` }],
    idea: 'Размерность помогает отсеять неверную степень или потерянную скорость. Она проверяет форму зависимости, но не находит безразмерный множитель.',
    steps: [
      { title: 'Разложи формулу на единицы', body: String.raw`\[\left[\frac{T^{3/2}}{\sqrt{\rho A}}\right]=\frac{(\text{кг}\,\text{м}\,\text{с}^{-2})^{3/2}}{(\text{кг}\,\text{м}^{-1})^{1/2}}=\text{кг}\,\text{м}^2\,\text{с}^{-3}=\text{Вт}.\]` },
      { title: 'Сравни два случая', body: String.raw`Отношение мощностей безразмерно. Подставляй отношения длин, масс и площадей, а не смешивай сантиметры с метрами.` },
    ],
    pitfall: 'Считать правильную размерность доказательством формулы: численный коэффициент и физические допущения всё равно нужно проверить.',
    practice: { question: 'Мощность имеет размерность кг·м²·сⁿ. Чему равен показатель n?', answer: -3, unit: '', explanation: String.raw`\(P=E/t\), поэтому \([P]=\text{кг}\cdot\text{м}^2\cdot\text{с}^{-3}\).` }, source: rotorSource,
  },
  {
    id: 'kirchhoff-rules', name: 'Законы Кирхгофа', topicSlug: 'electrodynamics',
    prerequisites: [{ title: 'Ток и потенциал', explanation: 'Ток — заряд за секунду. Напряжение между узлами — разность их потенциалов.' }, { title: 'Закон Ома для резистора', explanation: String.raw`\(U=IR\). Знак падения напряжения зависит от выбранного направления обхода.` }],
    idea: 'Когда цепь не сводится к последовательным и параллельным резисторам, составь уравнения для токов в узлах и напряжений в контурах.',
    steps: [
      { title: 'Обозначь направления', body: String.raw`Выбери стрелки токов произвольно. В каждом узле \(\sum I_{\text{вход}}=\sum I_{\text{выход}}\). Отрицательный ответ означает, что ток течёт против стрелки.` },
      { title: 'Запиши независимые контуры', body: String.raw`При обходе замкнутого контура \(\sum\Delta\varphi=0\). По направлению тока на резисторе изменение потенциала \(-IR\); на источнике при переходе от минуса к плюсу — \(+\mathcal E\). Идеальный амперметр замыкает узлы, идеальный вольтметр ток не проводит.` },
    ],
    pitfall: 'Считать напряжение между двумя узлами нулевым только потому, что ток в одной из ветвей мал.',
    practice: { question: 'В узел входят токи 2 мА и 5 мА. Из узла выходят 3 мА и неизвестный ток. Найдите неизвестный ток в мА.', answer: 4, unit: 'мА', explanation: String.raw`\(2+5=3+I\), поэтому \(I=4\ \text{мА}\).` }, source: circuitSource,
  },
  {
    id: 'balanced-bridge', name: 'Баланс моста Уитстона', topicSlug: 'electrodynamics',
    prerequisites: [{ title: 'Делитель напряжения', explanation: String.raw`Для двух последовательных резисторов напряжение на нижнем равно \(U R_{\text{низ}}/(R_{\text{верх}}+R_{\text{низ}})\), если средняя точка не нагружена.` }, { title: 'Идеальный вольтметр', explanation: 'Он не проводит ток. При нулевом показании потенциалы его клемм равны.' }],
    idea: 'Равновесие моста — это равенство потенциалов средних точек двух делителей. Условие баланса лучше вывести, чем запоминать без схемы.',
    steps: [
      { title: 'Явно назови плечи', body: String.raw`Пусть слева сверху \(R_1\), снизу \(R_2\), справа сверху \(R_3\), снизу \(R_4\). Верхняя шина имеет потенциал \(U\), нижняя — ноль. Тогда \(\varphi_A=U R_2/(R_1+R_2)\), \(\varphi_B=U R_4/(R_3+R_4)\).` },
      { title: 'Приравняй средние потенциалы', body: String.raw`Из \(\varphi_A=\varphi_B\) следует \(R_1R_4=R_2R_3\), или \(R_1/R_2=R_3/R_4\). После замены вольтметра амперметром в неравновесном мосте прежнее условие применять нельзя: нужны уравнения Кирхгофа.` },
    ],
    pitfall: 'Переставлять номера плеч в заученной пропорции. Сначала подпиши верхние и нижние резисторы на своей схеме.',
    practice: { question: 'В описанной выше схеме R₁=10 Ом, R₂=20 Ом, R₃=30 Ом. При каком R₄ мост сбалансирован? Ответ в омах.', answer: 60, unit: 'Ом', explanation: String.raw`\(R_4=R_2 R_3/R_1=20\cdot30/10=60\ \text{Ом}\).` }, source: circuitSource,
  },
  {
    id: 'iv-characteristic', name: 'Чтение вольт-амперной характеристики', topicSlug: 'electrodynamics',
    prerequisites: [{ title: 'Оси и рабочая точка', explanation: 'Сначала посмотри, где U, где I и в каких единицах подписаны оси. Каждая точка графика описывает возможный режим элемента.' }],
    idea: 'У нелинейного элемента отношение U/I зависит от выбранной точки. Одна постоянная R не заменяет всю ВАХ.',
    steps: [
      { title: 'Найди сопротивление в точке', body: String.raw`Статическое сопротивление \(R=U/I\). Оно отличается от дифференциального \(r=dU/dI\), которое описывает наклон касательной на графике \(U(I)\).` },
      { title: 'Согласуй элемент с остальной цепью', body: String.raw`При источнике \(\mathcal E\) и последовательном резисторе \(R_s\) цепь требует \(U=\mathcal E-I R_s\). Пересечение этой прямой с ВАХ задаёт рабочую точку. Мощность нагрева в ней \(P=UI\).` },
    ],
    pitfall: 'Принимать наклон графика I(U) за сопротивление или забывать перевести миллиамперы в амперы.',
    practice: { question: 'На ВАХ выбрана точка U=3 В и I=6 мА. Найдите статическое сопротивление в омах.', answer: 500, unit: 'Ом', explanation: String.raw`\(R=3/(6\cdot10^{-3})=500\ \text{Ом}\).` },
    source: { title: 'OpenStax · University Physics 2, §9.4', url: 'https://openstax.org/books/university-physics-volume-2/pages/9-4-ohms-law', read: 'Ohm’s Law: различие омических и неомических элементов; как меняется график I(U).' },
  },
]

// Checked against the complete statements, not inferred from the broad topic tag.
export const TASK_METHOD_LINKS: Record<string, readonly string[]> = {
  'phys-oblast-2011-10-t1-2': ['geometric-similarity', 'momentum-flux', 'energy-flux', 'dimensional-check'],
  'phys-national-2025-9-t1-3': ['kirchhoff-rules', 'balanced-bridge', 'iv-characteristic'],
}
export function methodsForTask(taskId: string) {
  const ids = Object.hasOwn(TASK_METHOD_LINKS, taskId) ? TASK_METHOD_LINKS[taskId] : []
  return ids.map((id) => TASK_METHODS.find((method) => method.id === id)!)
}
