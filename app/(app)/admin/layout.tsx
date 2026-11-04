import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AdminNav } from '@/components/admin/admin-nav'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { getT } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const t = await getT()

  await requireAdminPage()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="eyebrow flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-coral" /> {t('Admin')}
        </span>
        <AdminNav />
      </div>
      {children}
    </div>
  )
}
