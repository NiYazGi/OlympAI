import Link from 'next/link'
import { FilePlus2, FileText } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { listDocuments } from '@/lib/documents/store'
import { TEMPLATES, templateById } from '@/lib/documents/templates'
import { shortDate } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Documents') }
}

export default async function DocumentsPage() {
  const [t, locale, issued] = await Promise.all([getT(), getLocale(), listDocuments()])
  return (
    <>
      <PageHeader title={t('Documents')} description={t('Official documents on the OlympAI letterhead: fill in, issue with a number, print or save as PDF.')} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((template) => (
          <Link
            key={template.id}
            href={`/documents/new/${template.id}`}
            className={cn(cardClass, 'lift group flex flex-col gap-2 p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring')}
          >
            <span className="flex items-center gap-2 font-semibold">
              <FilePlus2 className="size-4 text-coral" /> {t(template.title)}
            </span>
            <span className="text-sm text-muted-foreground">{t(template.description)}</span>
          </Link>
        ))}
      </section>

      <section className={cn(cardClass, 'p-5')}>
        <h2 className="text-[15px] font-medium">{t('Registry of issued documents')}</h2>
        {issued.length ? (
          <ul className="mt-3 divide-y divide-border text-sm">
            {issued.map((document) => (
              <li key={document.id}>
                <Link href={`/documents/${document.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-primary">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-xs">{document.number}</span>
                    <span className="truncate">{document.title}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {t(templateById(document.kind)?.title ?? document.kind)} · {shortDate(document.createdAt, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t('Nothing has been issued yet.')}</p>
        )}
      </section>
    </>
  )
}
