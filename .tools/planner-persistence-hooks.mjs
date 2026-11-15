// Loaded only by planner-persistence-regression.mjs. Both DB and account are
// isolated fixtures; the application's actual database module is never opened.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/db') return { shortCircuit: true, url: 'data:text/javascript,export async function getDb(){if(!globalThis.__plannerFixtureDb)throw new Error("No isolated fixture");return globalThis.__plannerFixtureDb}' }
  if (specifier === '@/lib/supabase/auth') return { shortCircuit: true, url: 'data:text/javascript,export async function getSessionUserId(){return "00000000-0000-0000-0000-000000000001"}' }
  return nextResolve(specifier, context)
}
