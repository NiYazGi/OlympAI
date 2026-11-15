import Link from 'next/link'
import { ArrowRight, Check, CircleHelp } from 'lucide-react'
import { getLocale } from '@/lib/i18n/server'
import { TASK_METHODS } from '@/lib/task-methods'
import type { TaskSkillLink } from '@/lib/skill-catalogue'

const COPY = {
  ru: {
    label: 'Конкретные навыки задачи', verified: 'Связь проверена', candidate: 'Предположительно',
    prerequisite: 'Нужно знать', lesson: 'Короткий урок и тренировка', possibleLesson: 'Возможный материал по методу',
    missingLesson: 'Короткий урок ещё не подготовлен',
    candidateNote: 'Предположительные связи требуют проверки по условию. Они не подтверждают освоение навыка.',
    verifiedNote: 'Разметка связывает условие с методом. Освоение навыка проверяется отдельно по решениям.',
  },
  kk: {
    label: 'Есептің нақты дағдылары', verified: 'Байланыс тексерілген', candidate: 'Болжамды',
    prerequisite: 'Алдымен білу керек', lesson: 'Қысқа сабақ және жаттығу', possibleLesson: 'Әдіс бойынша ықтимал материал',
    missingLesson: 'Қысқа сабақ әлі дайындалмаған',
    candidateNote: 'Болжамды байланыстарды есеп шартымен тексеру керек. Олар дағдының меңгерілгенін растамайды.',
    verifiedNote: 'Белгілеу есеп шартын әдіспен байланыстырады. Дағдыны меңгеру шешімдер бойынша бөлек тексеріледі.',
  },
  en: {
    label: 'Specific problem skills', verified: 'Verified link', candidate: 'Suggested link',
    prerequisite: 'Prerequisite', lesson: 'Short lesson and practice', possibleLesson: 'Possible material on this method',
    missingLesson: 'A short lesson is not prepared yet',
    candidateNote: 'Suggested links need to be checked against the statement. They do not establish mastery.',
    verifiedNote: 'These tags connect the statement to a method. Skill mastery is assessed separately from solutions.',
  },
}

/** One list combines skill, provenance, prerequisite and an existing lesson. */
export async function TaskSkillTags({ skills, taskId }: { skills: TaskSkillLink[]; taskId: string }) {
  const copy = COPY[await getLocale()]
  const lessonIds = new Set(TASK_METHODS.map((method) => method.id))
  return <>
    <ol aria-label={copy.label} className="mt-4 space-y-3">
      {skills.map((skill, index) => {
        const verified = skill.provenance === 'editorial'
        // Never manufacture /methods/<id> for a tag that has no authored lesson.
        const href = skill.lessonHref && lessonIds.has(skill.id)
          ? `${skill.lessonHref}?from=${encodeURIComponent(taskId)}` : null
        return <li key={skill.id} className="relative border-l border-border pl-4">
          <span aria-hidden className={`absolute -left-1 top-1.5 size-2 rounded-full ${verified ? 'bg-primary' : 'border border-border bg-card'}`} />
          <div className="rounded-lg px-2 py-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <h3 className="text-sm font-medium">{index + 1}. {skill.name}</h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {verified ? <Check aria-hidden className="size-3" /> : <CircleHelp aria-hidden className="size-3" />}
                {verified ? copy.verified : copy.candidate}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{copy.prerequisite}: {skill.prerequisite}</p>
            {href ? <Link href={href} transitionTypes={['nav-forward']} className="method-link mt-2 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-primary outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary">
              {verified ? copy.lesson : copy.possibleLesson}<ArrowRight aria-hidden className="size-3.5" />
            </Link> : <p className="mt-2 text-xs text-muted-foreground">{copy.missingLesson}</p>}
          </div>
        </li>
      })}
    </ol>
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{skills.some((skill) => skill.provenance === 'candidate') ? copy.candidateNote : copy.verifiedNote}</p>
  </>
}
