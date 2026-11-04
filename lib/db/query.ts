import 'server-only'

import type { PGlite, Transaction } from '@electric-sql/pglite'
import { getDb } from '@/lib/db'

/**
 * The part of the Supabase query builder this app uses, compiled to SQL and
 * run against the embedded database.
 *
 * Kept call-compatible on purpose: every page, action and query helper was
 * written against `supabase.from(...).select(...).eq(...)`, and it still is.
 * What changed is underneath — no HTTP, no PostgREST, no JWT round trip.
 *
 * Each statement runs in its own transaction as the role Supabase would have
 * used (`anon`, `authenticated` or `service_role`) with the caller's id in
 * `request.jwt.claim.sub`, so the RLS policies and column grants in the
 * migrations are enforced exactly as before.
 */

export type DbRole = 'anon' | 'authenticated' | 'service_role'
export type DbContext = { role: DbRole; userId: string | null }
export type DbError = { message: string; code: string; details: string | null; hint: string | null }
export type DbResult = { data: unknown; error: DbError | null; count: number | null; status: number }

const IDENT = /^[a-z_][a-z0-9_]*$/

function ident(name: string) {
  if (!IDENT.test(name)) throw new Error(`Unsupported identifier: ${name}`)
  return `"${name}"`
}

/** `id, title` or `alias:column` or `*`. */
function selectList(columns: string) {
  return columns
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part === '*') return '*'
      const [alias, column] = part.includes(':') ? part.split(':').map((s) => s.trim()) : [null, part]
      return alias ? `${ident(column!)} as ${ident(alias)}` : ident(column!)
    })
    .join(', ')
}

function toError(cause: unknown): DbError {
  const error = cause as { message?: string; code?: string; detail?: string; hint?: string }
  return {
    message: error?.message ?? String(cause),
    code: error?.code ?? 'LOCAL',
    details: error?.detail ?? null,
    hint: error?.hint ?? null,
  }
}

const primaryKeys = new Map<string, string[]>()

async function primaryKeyOf(db: PGlite, table: string) {
  const known = primaryKeys.get(table)
  if (known) return known
  const { rows } = await db.query<{ attname: string }>(
    `select a.attname from pg_index i
       join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = $1::regclass and i.indisprimary`,
    [`public.${table}`],
  )
  const keys = rows.map((row) => row.attname)
  primaryKeys.set(table, keys)
  return keys
}

/** Runs one statement as the caller's role, inside a transaction. */
export async function runAs<T>(context: DbContext, work: (tx: Transaction) => Promise<T>): Promise<T> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${context.role}`)
    await tx.query(
      `select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)`,
      [context.userId ?? '', context.role],
    )
    return work(tx)
  })
}

type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

export class QueryBuilder implements PromiseLike<DbResult> {
  private operation: Operation = 'select'
  private columns = '*'
  private returning: string | null = null
  private countExact = false
  private headOnly = false
  private conditions: string[] = []
  private params: unknown[] = []
  private orderBy: string[] = []
  private limitTo: number | null = null
  private offsetBy: number | null = null
  private cardinality: 'many' | 'single' | 'maybe' = 'many'
  private rows: Record<string, unknown>[] = []
  private patch: Record<string, unknown> = {}
  private conflictColumns: string[] | null = null
  private ignoreDuplicates = false

  constructor(
    private readonly context: DbContext,
    private readonly table: string,
  ) {
    ident(table)
  }

  private param(value: unknown) {
    this.params.push(value)
    return `$${this.params.length}`
  }

  private where(sql: string) {
    this.conditions.push(sql)
    return this
  }

  select(columns = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    if (this.operation === 'select') {
      this.columns = columns
      this.countExact = Boolean(options?.count)
      this.headOnly = Boolean(options?.head)
    } else {
      this.returning = columns
    }
    return this
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = 'insert'
    this.rows = Array.isArray(values) ? values : [values]
    return this
  }

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) {
    this.operation = 'upsert'
    this.rows = Array.isArray(values) ? values : [values]
    this.conflictColumns = options?.onConflict ? options.onConflict.split(',').map((s) => s.trim()) : null
    this.ignoreDuplicates = Boolean(options?.ignoreDuplicates)
    return this
  }

  update(values: Record<string, unknown>) {
    this.operation = 'update'
    this.patch = values
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    return this.where(`${ident(column)} = ${this.param(value)}`)
  }
  neq(column: string, value: unknown) {
    return this.where(`${ident(column)} <> ${this.param(value)}`)
  }
  gt(column: string, value: unknown) {
    return this.where(`${ident(column)} > ${this.param(value)}`)
  }
  gte(column: string, value: unknown) {
    return this.where(`${ident(column)} >= ${this.param(value)}`)
  }
  lt(column: string, value: unknown) {
    return this.where(`${ident(column)} < ${this.param(value)}`)
  }
  lte(column: string, value: unknown) {
    return this.where(`${ident(column)} <= ${this.param(value)}`)
  }
  in(column: string, values: readonly unknown[]) {
    if (values.length === 0) return this.where('false')
    return this.where(`${ident(column)} in (${values.map((value) => this.param(value)).join(', ')})`)
  }
  is(column: string, value: null | boolean) {
    return this.where(`${ident(column)} is ${value === null ? 'null' : value ? 'true' : 'false'}`)
  }
  not(column: string, operator: 'is' | 'eq', value: unknown) {
    const inner =
      operator === 'is'
        ? `${ident(column)} is ${value === null ? 'null' : value ? 'true' : 'false'}`
        : `${ident(column)} = ${this.param(value)}`
    return this.where(`not (${inner})`)
  }
  match(values: Record<string, unknown>) {
    for (const [column, value] of Object.entries(values)) this.eq(column, value)
    return this
  }

  /** PostgREST filter syntax, the subset in use: `a.eq.1,b.is.null,c.gte.2026-01-01`. */
  or(filters: string) {
    const parts = filters.split(',').map((part) => {
      const [column, operator, ...rest] = part.trim().split('.')
      const value = rest.join('.')
      const col = ident(column!)
      switch (operator) {
        case 'is':
          return `${col} is ${value === 'null' ? 'null' : value === 'true' ? 'true' : 'false'}`
        case 'eq':
          return `${col} = ${this.param(value)}`
        case 'neq':
          return `${col} <> ${this.param(value)}`
        case 'gt':
          return `${col} > ${this.param(value)}`
        case 'gte':
          return `${col} >= ${this.param(value)}`
        case 'lt':
          return `${col} < ${this.param(value)}`
        case 'lte':
          return `${col} <= ${this.param(value)}`
        default:
          throw new Error(`Unsupported filter in or(): ${part}`)
      }
    })
    return this.where(`(${parts.join(' or ')})`)
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    const direction = options?.ascending === false ? 'desc' : 'asc'
    const nulls = options?.nullsFirst === undefined ? '' : options.nullsFirst ? ' nulls first' : ' nulls last'
    this.orderBy.push(`${ident(column)} ${direction}${nulls}`)
    return this
  }

  limit(count: number) {
    this.limitTo = count
    return this
  }

  range(from: number, to: number) {
    this.offsetBy = from
    this.limitTo = to - from + 1
    return this
  }

  single() {
    this.cardinality = 'single'
    return this
  }

  maybeSingle() {
    this.cardinality = 'maybe'
    return this
  }

  then<A = DbResult, B = never>(
    onfulfilled?: ((value: DbResult) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private whereClause() {
    return this.conditions.length ? ` where ${this.conditions.join(' and ')}` : ''
  }

  private async execute(): Promise<DbResult> {
    try {
      const db = await getDb()
      const conflict =
        this.operation === 'upsert' ? (this.conflictColumns ?? (await primaryKeyOf(db, this.table))) : null

      return await runAs(this.context, async (tx) => {
        const table = `public.${ident(this.table)}`

        if (this.operation === 'select') {
          let count: number | null = null
          if (this.countExact) {
            const counted = await tx.query<{ n: number }>(`select count(*)::int as n from ${table}${this.whereClause()}`, this.params)
            count = counted.rows[0]?.n ?? 0
            if (this.headOnly) return { data: null, error: null, count, status: 200 }
          }
          let sql = `select ${selectList(this.columns)} from ${table}${this.whereClause()}`
          if (this.orderBy.length) sql += ` order by ${this.orderBy.join(', ')}`
          if (this.limitTo !== null) sql += ` limit ${Math.max(0, Math.floor(this.limitTo))}`
          if (this.offsetBy !== null) sql += ` offset ${Math.max(0, Math.floor(this.offsetBy))}`
          const { rows } = await tx.query<Record<string, unknown>>(sql, this.params)
          return this.shape(rows, count)
        }

        const returning = this.returning ? ` returning ${selectList(this.returning)}` : ''

        if (this.operation === 'insert' || this.operation === 'upsert') {
          if (this.rows.length === 0) return { data: [], error: null, count: null, status: 201 }
          const columns = [...new Set(this.rows.flatMap((row) => Object.keys(row)))]
          const tuples = this.rows.map(
            (row) => `(${columns.map((column) => (column in row ? this.param(serialize(row[column])) : 'default')).join(', ')})`,
          )
          let sql = `insert into ${table} (${columns.map(ident).join(', ')}) values ${tuples.join(', ')}`
          if (conflict) {
            const updatable = columns.filter((column) => !conflict.includes(column))
            sql +=
              this.ignoreDuplicates || updatable.length === 0
                ? ` on conflict (${conflict.map(ident).join(', ')}) do nothing`
                : ` on conflict (${conflict.map(ident).join(', ')}) do update set ${updatable
                    .map((column) => `${ident(column)} = excluded.${ident(column)}`)
                    .join(', ')}`
          }
          const { rows } = await tx.query<Record<string, unknown>>(sql + returning, this.params)
          return this.returning ? this.shape(rows, null, 201) : { data: null, error: null, count: null, status: 201 }
        }

        if (this.operation === 'update') {
          const sets = Object.entries(this.patch).map(([column, value]) => `${ident(column)} = ${this.param(serialize(value))}`)
          const { rows } = await tx.query<Record<string, unknown>>(
            `update ${table} set ${sets.join(', ')}${this.whereClause()}${returning}`,
            this.params,
          )
          return this.returning ? this.shape(rows, null) : { data: null, error: null, count: null, status: 204 }
        }

        const { rows } = await tx.query<Record<string, unknown>>(`delete from ${table}${this.whereClause()}${returning}`, this.params)
        return this.returning ? this.shape(rows, null) : { data: null, error: null, count: null, status: 204 }
      })
    } catch (cause) {
      return { data: null, error: toError(cause), count: null, status: 400 }
    }
  }

  private shape(rows: Record<string, unknown>[], count: number | null, status = 200): DbResult {
    if (this.cardinality === 'many') return { data: rows, error: null, count, status }
    if (rows.length === 1) return { data: rows[0], error: null, count, status }
    if (rows.length === 0 && this.cardinality === 'maybe') return { data: null, error: null, count, status }
    return {
      data: null,
      error: {
        message: 'JSON object requested, multiple (or no) rows returned',
        code: 'PGRST116',
        details: `The result contains ${rows.length} rows`,
        hint: null,
      },
      count,
      status: 406,
    }
  }
}

/** Plain objects go to json/jsonb columns as JSON; arrays stay Postgres arrays. */
function serialize(value: unknown) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    return JSON.stringify(value)
  }
  return value
}
