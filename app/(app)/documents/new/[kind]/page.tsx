import { notFound } from 'next/navigation'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { DocumentEditor } from '@/components/documents/document-editor'
import { getDocument } from '@/lib/documents/store'
import { templateById } from '@/lib/documents/templates'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('New document') }
}

/** ?from=<id> starts from an issued document's fields (a new number on issue). */
export default async function NewDocumentPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ kind }, { from }, t] = await Promise.all([params, searchParams, getT()])
  const template = templateById(kind)
  if (!template) notFound()
  const source = from ? await getDocument(from) : null
  return (
    <>
      <BackLink href="/documents">{t('Documents')}</BackLink>
      <PageHeader title={t(template.title)} description={t(template.description)} />
      <DocumentEditor kind={template.id} initial={source?.kind === template.id ? source.data : undefined} />
    </>
  )
}
