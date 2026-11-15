/** The preparation calendar follows the student's Kazakhstan calendar day. */
export const TRAINING_TIME_ZONE = 'Asia/Almaty'
export function trainingToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TRAINING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function trainingMinutes(minutes: number) {
  const value = Math.max(0, Math.round(minutes))
  return value >= 60 ? `${Math.floor(value / 60)} ч${value % 60 ? ` ${value % 60} мин` : ''}` : `${value} мин`
}
