import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { communityEnabled } from '@/lib/community'

export const dynamic = 'force-dynamic'

/** Only where the community is switched on (the test site, for now). */
export default function ForumLayout({ children }: { children: ReactNode }) {
  if (!communityEnabled()) notFound()
  return <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">{children}</div>
}
