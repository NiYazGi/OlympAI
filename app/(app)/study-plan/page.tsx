import { redirect } from 'next/navigation'

/**
 * Merged into /path.
 *
 * Two pages were answering "what should I do next" — a weekly schedule and an
 * ordered route through the subject — and they could disagree. The path decides
 * what to work on; the weekly rhythm now lives inside it as one section.
 */
export default function StudyPlanPage() {
  redirect('/learn')
}
