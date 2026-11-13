import type { ReactNode } from 'react'
import { requireAdminPage } from '@/lib/supabase/admin-guard'

export const dynamic = 'force-dynamic'

/** The document generator is for administrators only; everyone else gets the 404. */
export default async function DocumentsLayout({ children }: { children: ReactNode }) {
  await requireAdminPage()
  return <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-8">{children}</div>
}
