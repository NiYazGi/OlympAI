import 'server-only'

import { getDb } from '@/lib/db'
import type { DocumentData } from '@/lib/documents/templates'

export type IssuedDocument = {
  id: string
  kind: string
  number: string
  title: string
  data: DocumentData
  createdAt: string
  createdBy: string | null
}

type Row = { id: string; kind: string; number: string; title: string; data: DocumentData; created_at: string; created_by: string | null }

function toDocument(row: Row): IssuedDocument {
  return { id: row.id, kind: row.kind, number: row.number, title: row.title, data: row.data, createdAt: row.created_at, createdBy: row.created_by }
}

/**
 * Saves a document and gives it the next outgoing number for its kind and
 * year, in one transaction so two admins issuing at once get different
 * numbers.
 */
export async function issueDocument(kind: string, prefix: string, title: string, data: DocumentData, userId: string): Promise<IssuedDocument> {
  const db = await getDb()
  const year = Number((data.date || new Date().toISOString()).slice(0, 4))
  return db.transaction(async (tx) => {
    await tx.query('lock table public.issued_documents in share row exclusive mode')
    const { rows: last } = await tx.query<{ seq: number }>(
      'select coalesce(max(seq), 0)::int as seq from public.issued_documents where kind = $1 and year = $2',
      [kind, year],
    )
    const seq = (last[0]?.seq ?? 0) + 1
    const number = `${prefix}-${year}/${String(seq).padStart(3, '0')}`
    const { rows } = await tx.query<Row>(
      `insert into public.issued_documents (kind, year, seq, number, title, data, created_by)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7)
       returning id, kind, number, title, data, created_at, created_by`,
      [kind, year, seq, number, title, JSON.stringify(data), userId],
    )
    return toDocument(rows[0])
  })
}

export async function listDocuments(limit = 50): Promise<IssuedDocument[]> {
  const db = await getDb()
  const { rows } = await db.query<Row>(
    'select id, kind, number, title, data, created_at, created_by from public.issued_documents order by created_at desc limit $1',
    [limit],
  )
  return rows.map(toDocument)
}

export async function getDocument(id: string): Promise<IssuedDocument | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const db = await getDb()
  const { rows } = await db.query<Row>(
    'select id, kind, number, title, data, created_at, created_by from public.issued_documents where id = $1',
    [id],
  )
  return rows[0] ? toDocument(rows[0]) : null
}
