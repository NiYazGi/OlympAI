import type { DiagnosticResult } from '@/lib/diagnostic'

type Baseline = Pick<DiagnosticResult, 'dimensions' | 'observedHints'> & {
  selfReport: DiagnosticResult['selfReport'] | null
}

/** Support changes how the existing review block is used, never its duration. */
export function diagnosticSupport(baseline: Baseline, subject: string) {
  if (!baseline.selfReport) return []
  const support: { id: string; title: string; instruction: string }[] = []
  const presentation = baseline.dimensions.presentation
  if (presentation.basis === 'objective' && presentation.score !== null && presentation.score < 70) {
    support.push({
      id: 'presentation', title: 'Обоснование решения',
      instruction: subject === 'Physics'
        ? 'В отведённое время разбора назови систему тел, условия применимости закона и единицы величин. Проверь, что каждый переход обоснован.'
        : subject === 'Informatics'
          ? 'В отведённое время разбора объясни инвариант или корректность алгоритма, границы индексов и оценку сложности. Проверки на примерах оставь отдельно от доказательства.'
          : 'В отведённое время разбора запиши ограничения, обоснуй ключевые переходы и проверь полноту ответа. Примеры отдельно, общий аргумент отдельно.',
    })
  }
  if (baseline.observedHints > 0 || baseline.selfReport.assistance !== 'alone') {
    support.push({
      id: 'independence', title: 'Самостоятельное воспроизведение',
      instruction: 'После разбора закрой подсказку и воспроизведи ключевой шаг своими словами. Если не получается, отметь место затруднения. Это часть уже выделенного времени, без дополнительных задач.',
    })
  }
  return support
}
