import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = new URL('../', import.meta.url)
const STUB = new URL('./empty.mjs', import.meta.url).href

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: STUB, shortCircuit: true }
  if (specifier.startsWith('@/')) {
    const base = fileURLToPath(new URL(specifier.slice(2), ROOT))
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true }
    }
  }
  return nextResolve(specifier, context)
}
