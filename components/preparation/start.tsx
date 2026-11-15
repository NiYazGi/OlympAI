import Link from 'next/link'
import { Route,ArrowRight } from 'lucide-react'
import {buttonVariants} from '@/components/ui/button'

export function PreparationStart() {
  return <section id="preparation-setup" aria-labelledby="preparation-setup-title" className="mx-auto max-w-4xl py-4 sm:py-7">
    <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Route aria-hidden className="size-5"/></div>
    <h2 id="preparation-setup-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Настроим твою подготовку</h2>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Олимпиада, этап, класс, срок и доступное время — в одном месте. Добавь желаемый результат и свою причину идти к нему.</p>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">После короткой диагностики программа подберёт посильные занятия. Время разбора уже входит в нагрузку; обязательных пяти задач каждый день больше нет.</p>
    <Link href="/plan/settings" className={buttonVariants({size:'lg',className:'mt-6'})}>Настроить подготовку<ArrowRight/></Link>
  </section>
}
