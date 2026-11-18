import Link from 'next/link'
import { MarketingHeader } from '@/components/marketing-header'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Terms of use') }
}

/**
 * The terms a new account agrees to, readable before signing up (the sign-up
 * checkbox links here). Plain language: what the service is, what it is not,
 * what is stored and why, and the rules for shared spaces.
 */
const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'What OlympAI is',
    items: [
      'OlympAI is a training tool for olympiad preparation: problems, notes, mock papers, an AI check of written solutions and hints.',
      'The AI mark is a training estimate on a 7-point scale. It is not an official jury result and does not replace a teacher or an official olympiad.',
      'The AI can be wrong. If a mark looks wrong, use the appeal or report a problem: disputed marks are reviewed.',
    ],
  },
  {
    title: 'Your account',
    items: [
      'An account needs a name, an email address and a password. Keep the password to yourself; you are responsible for what is done from your account.',
      'Students under 16 should use the site with the knowledge of a parent or teacher.',
      'One person, one account. Accounts created to get around limits may be closed.',
    ],
  },
  {
    title: 'What we store and why',
    items: [
      'Your profile (name, grade, subject, goal), your solutions, marks and activity, so the plan, the progress and the feedback can work.',
      'Solutions and photos you submit are sent to an AI provider to be checked; they are not used to advertise to you and are not sold.',
      'You can ask for your account and data to be deleted at any time.',
    ],
  },
  {
    title: 'Problems and materials',
    items: [
      'Olympiad problems belong to their organisers and authors; each problem shows its source. They are here for personal practice.',
      'Do not copy the materials of the site in bulk or publish them as your own.',
    ],
  },
  {
    title: 'Fair use',
    items: [
      'No attempts to break, overload or trick the site or the AI, including asking it for answers in ways the rules forbid.',
      'In shared spaces (classes and discussions) be respectful: no insults, spam or other people’s personal data.',
      'We may limit or close an account that breaks these rules.',
    ],
  },
  {
    title: 'Changes',
    items: ['These terms may change as the service grows. Important changes are announced on the site before they apply.'],
  },
]

export default async function TermsPage() {
  const t = await getT()
  return (
    <main className="min-h-dvh bg-background">
      <MarketingHeader />
      <article className="mx-auto max-w-[760px] px-5 py-14 sm:px-8">
        <h1 className="font-display text-[34px] leading-tight font-semibold">{t('Terms of use')}</h1>
        <p className="mt-3 text-[16px] leading-7 text-muted-foreground">
          {t('Short and in plain language. By creating an account you agree to these terms.')}
        </p>
        {SECTIONS.map((section) => (
          <section key={section.title} className="mt-9">
            <h2 className="text-[20px] font-semibold">{t(section.title)}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-7">
              {section.items.map((item) => (
                <li key={item}>{t(item)}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="mt-12 text-sm text-muted-foreground">
          <Link href="/signup" className="font-medium text-primary hover:underline">{t('Create a free account')}</Link>
        </p>
      </article>
    </main>
  )
}
