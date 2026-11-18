/**
 * The problems a visitor can try before signing up: one per subject, short,
 * with step-by-step hints. Written for OlympAI. The reference solutions stay
 * on the server (lib/demo.ts reads them for the grader); the page receives the
 * statement and hints only.
 */
export type DemoTask = {
  id: string
  subject: 'Mathematics' | 'Physics' | 'Informatics'
  title: string
  problem: string
  hints: string[]
  difficulty: number
}

export const DEMO_TASKS: DemoTask[] = [
  {
    id: 'demo-divisibility',
    subject: 'Mathematics',
    title: 'Делимость: n² + 2 на n + 2',
    difficulty: 2,
    problem: String.raw`Найдите все натуральные \(n\), при которых \(n^2 + 2\) делится на \(n + 2\).`,
    hints: [
      'Попробуйте разделить многочлен \\(n^2 + 2\\) на \\(n + 2\\) с остатком.',
      'Если \\(n + 2\\) делит \\(n^2 + 2\\) и делит \\((n+2)(n-2)\\), то оно делит и их разность.',
      'Разность — это константа. На что может делиться натуральное число \\(n + 2 \\ge 3\\)?',
    ],
  },
  {
    id: 'demo-incline',
    subject: 'Physics',
    title: 'Брусок на наклонной плоскости',
    difficulty: 2,
    problem: String.raw`Брусок соскальзывает вниз по наклонной плоскости с углом наклона \(\alpha\). Коэффициент трения скольжения \(\mu\), причём \(\operatorname{tg}\alpha > \mu\). Найдите ускорение бруска. Укажите выбранные оси.`,
    hints: [
      'Нарисуйте силы: тяжести, реакции опоры и трения. Куда направлено трение, если брусок едет вниз?',
      'Направьте ось \\(Ox\\) вдоль плоскости вниз, \\(Oy\\) — перпендикулярно ей, и запишите второй закон Ньютона в проекциях.',
      'Брусок скользит, поэтому \\(F_{\\text{тр}} = \\mu N\\); \\(N\\) найдите из проекции на \\(Oy\\).',
    ],
  },
  {
    id: 'demo-increasing-run',
    subject: 'Informatics',
    title: 'Самый длинный возрастающий отрезок',
    difficulty: 2,
    problem: String.raw`Дан массив из \(n\) целых чисел, \(1 \le n \le 2\cdot 10^5\). Найдите длину самого длинного отрезка подряд идущих элементов, в котором каждый следующий элемент строго больше предыдущего.

Опишите алгоритм (можно кодом), обоснуйте его правильность и оцените время работы.`,
    hints: [
      'Перебирать все отрезки за \\(O(n^2)\\) при \\(n = 2\\cdot 10^5\\) слишком долго. Можно ли обойтись одним проходом?',
      'Храните длину текущего возрастающего отрезка, который заканчивается в элементе \\(i\\).',
      'Если \\(a_i > a_{i-1}\\), отрезок продолжается, иначе начинается заново с длины 1. Ответ — максимум за проход.',
    ],
  },
]

export function demoTask(id: string) {
  return DEMO_TASKS.find((task) => task.id === id) ?? null
}
