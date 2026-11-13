/**
 * The document generator's templates. Shared by the server (numbering,
 * validation) and the client (the form and the A4 preview).
 *
 * A template is a list of fields plus a renderer in
 * components/documents/document-sheet.tsx keyed by the same id.
 */

export type FieldKind = 'text' | 'textarea' | 'date'

export type TemplateField = {
  name: string
  label: string
  kind: FieldKind
  placeholder?: string
  /** Kept between documents on this device (letterhead, signer). */
  remember?: boolean
  max: number
}

export type DocumentTemplate = {
  id: string
  /** Outgoing-number prefix: OF-2026/007. */
  prefix: string
  title: string
  description: string
  fields: TemplateField[]
}

export const OFFICIAL_FEEDBACK: DocumentTemplate = {
  id: 'official-feedback',
  prefix: 'OF',
  title: 'Official Feedback',
  description: 'An official letter with a reply or feedback, on the letterhead, with the full name and signature at the bottom.',
  fields: [
    { name: 'orgKk', label: 'Organisation (Kazakh)', kind: 'text', placeholder: '«OlympAI» жобасы', remember: true, max: 160 },
    { name: 'orgRu', label: 'Organisation (Russian)', kind: 'text', placeholder: 'Проект «OlympAI»', remember: true, max: 160 },
    { name: 'requisites', label: 'Address and contacts', kind: 'textarea', placeholder: 'г. Астана, …\nolympai.kz · info@olympai.kz', remember: true, max: 400 },
    { name: 'city', label: 'City', kind: 'text', placeholder: 'Астана', remember: true, max: 60 },
    { name: 'date', label: 'Date', kind: 'date', max: 10 },
    { name: 'recipient', label: 'To whom', kind: 'textarea', placeholder: 'Директору …\nФамилия И.О.', max: 400 },
    { name: 'subject', label: 'Subject line', kind: 'text', placeholder: 'Об участии в …', max: 200 },
    { name: 'body', label: 'Text', kind: 'textarea', placeholder: 'Leave empty to print ruled lines to fill in by hand.', max: 8000 },
    { name: 'position', label: 'Position of the signer', kind: 'text', placeholder: 'Руководитель проекта', remember: true, max: 120 },
    { name: 'signer', label: 'Full name of the signer', kind: 'text', placeholder: 'Фамилия Имя Отчество', remember: true, max: 120 },
  ],
}

export const TEMPLATES: DocumentTemplate[] = [OFFICIAL_FEEDBACK]

export function templateById(id: string): DocumentTemplate | null {
  return TEMPLATES.find((template) => template.id === id) ?? null
}

export type DocumentData = Record<string, string>

/** Only the template's fields, each trimmed to its limit. */
export function cleanData(template: DocumentTemplate, input: Record<string, unknown>): DocumentData {
  const data: DocumentData = {}
  for (const field of template.fields) {
    const value = typeof input[field.name] === 'string' ? (input[field.name] as string) : ''
    data[field.name] = value.replace(/\r\n/g, '\n').slice(0, field.max)
  }
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) data.date = ''
  return data
}
