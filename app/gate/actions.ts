'use server'

import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { GATE_COOKIE, gatePassword, gateToken, safeNext } from '@/lib/site-gate'

export type GateState = { error: boolean }

function same(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function enterGate(_state: GateState, formData: FormData): Promise<GateState> {
  const password = gatePassword()
  if (!password) redirect('/')
  const typed = String(formData.get('password') ?? '')
  if (!same(typed, password)) {
    // A little friction against guessing a short password.
    await new Promise((resolve) => setTimeout(resolve, 600))
    return { error: true }
  }
  const store = await cookies()
  store.set(GATE_COOKIE, await gateToken(password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  redirect(safeNext(formData.get('next')))
}
