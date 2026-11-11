import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import { TASK_METHODS, TASK_METHOD_LINKS, methodsForTask } from '@/lib/task-methods'
import { MathText } from '@/components/math-text'
import { MethodPractice } from '@/components/learn/method-practice'
import { buttonVariants } from '@/components/ui/button'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getT } from '@/lib/i18n/server'
import { redirect } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ method: string }> }) {
  const { method } = await params
  return { title: TASK_METHODS.find((item) => item.id === method)?.name ?? (await getT())('Method') }
}

export default async function MethodPage({ params, searchParams }: {
  params: Promise<{ method: string }>; searchParams: Promise<{ from?: string }>
}) {
  if (!await getSessionUserId()) redirect('/login')
  const [{ method: id }, { from }, t] = await Promise.all([params, searchParams, getT()])
  const method = TASK_METHODS.find((item) => item.id === id)
  if (!method) notFound()
  const taskId = from && methodsForTask(from).some((item) => item.id === id) ? from : Object.keys(TASK_METHOD_LINKS).find((taskId) => TASK_METHOD_LINKS[taskId].includes(id))
  return <article className="mx-auto w-full max-w-3xl space-y-7 p-4 sm:space-y-9 sm:p-8">
    <Link href={taskId ? `/tasks/${taskId}` : '/learn'} transitionTypes={['nav-back']} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{taskId ? t('Back to the problem') : t('Back to topics')}</Link>
    <header><p className="eyebrow">{t('Short lesson · one specific method')}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{method.name}</h1><p className="mt-4 text-base leading-relaxed text-muted-foreground">{method.idea}</p></header>
    <section className="rounded-2xl bg-muted/60 p-5"><h2 className="text-sm font-semibold">{t('What to know before the lesson')}</h2><ul className="mt-3 space-y-4">{method.prerequisites.map((item) => <li key={item.title}><h3 className="text-sm font-medium">{item.title}</h3><div className="mt-1 text-sm text-muted-foreground"><MathText text={item.explanation} /></div></li>)}</ul></section>
    {method.steps.map((step, index) => <section key={step.title} className="method-step space-y-3"><h2 className="text-xl font-semibold"><span className="mr-2 text-sm text-primary">0{index + 1}</span>{step.title}</h2><div className="text-base leading-8"><MathText text={step.body} /></div></section>)}
    <aside className="border-l-2 border-primary pl-4"><h2 className="text-sm font-semibold">{t('Common mistake')}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{method.pitfall}</p></aside>
    <MethodPractice practice={method.practice} />
    <section className="border-t border-border pt-5"><h2 className="text-sm font-semibold">{t('Where to read more')}</h2><a href={method.source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">{method.source.title}<ExternalLink className="size-3.5" /></a><p className="mt-2 text-sm text-muted-foreground">{method.source.read}</p></section>
    {taskId ? <Link href={`/tasks/${taskId}`} className={buttonVariants()}>{t('Apply the method to the original problem')}<ArrowRight className="size-4" /></Link> : null}
  </article>
}
