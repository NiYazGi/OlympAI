import { redirect } from 'next/navigation'

/**
 * Folded into /me.
 *
 * "Who I am" and "how I am doing" were two pages that were each half an
 * answer, and the analytics were the half nobody went looking for.
 */
export default function ProgressPage() {
  redirect('/me')
}
