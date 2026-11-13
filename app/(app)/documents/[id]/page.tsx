import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Copy } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { DocumentSheet } from '@/components/documents/document-sheet'
import { PrintDocument } from '@/components/documents/print-document'
import { buttonVariants } from '@/components/ui/button'
import { getDocument } from '@/lib/documents/store'
import { templateById } from '@/lib/documents/templates'
import { shortDate } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const document = await getDocument((await params).id)
  return { title: document?.number ?? 'Document' }
}

/** An issued document, exactly as it was numbered; ?print=1 opens the print dialog. */
export default async function IssuedDocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string }> }) {
  const [{ id }, { print }, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()])
  const document = await getDocument(id)
  if (!document) notFound()
  const template = templateById(document.kind)
  return (
    <>
      <BackLink href="/documents">{t('Documents')}</BackLink>
      <div className="print-hide flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title={`${document.number} · ${document.title}`}
          description={t('{kind}, issued {date}', { kind: t(template?.title ?? document.kind), date: shortDate(document.createdAt, locale) })}
        />
        <div className="flex flex-wrap gap-2">
          <PrintDocument auto={print === '1'} label={t('Print or save as PDF')} />
          {template ? (
            <Link href={`/documents/new/${template.id}?from=${document.id}`} className={buttonVariants({ variant: 'outline' })}>
              <Copy className="size-4" /> {t('New from this one')}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="doc-print overflow-x-auto rounded-xl bg-foreground/[0.04] p-4 sm:p-6">
        <div className="mx-auto w-fit">
          <DocumentSheet data={document.data} number={document.number} />
        </div>
      </div>
    </>
  )
}
