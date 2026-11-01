# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

School students in Kazakhstan preparing for academic olympiads in mathematics and physics: the four stages of the republican olympiad, national team selection and the Zhautykov olympiad.

They work mostly on a laptop — reading a statement, writing a full derivation, reading the grader's protocol. The phone is secondary: reading notes, reviewing attempts.

Two situations matter equally: a student preparing on their own, and a student in a teacher's class, where the teacher reads the same attempts and sets the plan.

## Product Purpose

OlympAI trains a student for a chosen olympiad. It says what to do today, teaches each topic in four steps (notes, a quiz, a real olympiad problem, a paper), grades written solutions the way a jury does, and measures readiness with timed real papers.

Success is a student who knows where their reasoning breaks and what to practise next, and who arrives at the olympiad having sat its real papers.

## Positioning

Written solutions graded line by line like an olympiad jury: a protocol with points out of seven, marks on the student's own lines and the first point where the argument breaks — on the real problems and past papers of the Kazakh olympiads, with a coach (Sulu AI) that asks rather than tells.

## Operating Context

- Interface in Russian and English (locale in a cookie); the content is mostly Russian.
- Real past papers: whole rounds of the Kazakh olympiad, in the order and time they were set, with marking schemes where daryn.kz published them.
- A Telegram bot asks the evening day check-in.
- Teacher accounts: classes, join codes, per-student plans, read access to students' attempts.

## Capabilities and Constraints

- Next.js 16 (App Router), React 19, Tailwind v4, Supabase with RLS, OpenAI for grading and coaching; deployed on Vercel.
- Surfaces: today (`/dashboard`), study ladder (`/learn` with topic, lesson, quiz, cards), problems (`/tasks`, a problem, an attempt's protocol), papers (`/mock`), plan (`/plan`), olympiad catalogue (`/olympiads`), coach (`/sulu-ai`), progress (`/me`), rules (`/method`), classes (`/class`), settings, the marketing page and auth.
- Library: 1,672 problems, 76 with a reference solution (the OpenStax textbook exercises were removed on 1 November 2026 for their quality). Study content is thin: three lessons per subject.
- The olympiad catalogue carries no dates; the student sets their own target date.
- The grader never states the answer, in any field.

## Brand Commitments

- Name: OlympAI. The coach is Sulu AI.
- Voice: a strict coach, not a game. Plain, specific and honest; addresses the student as «вы» in Russian.
- The previous visual identity (blue on a neutral, Manrope, dark theme by default) is not binding: the owner opened all of it for the redesign of 29 October 2026.

## Evidence on Hand

- Real problems, past papers and reference solutions in the database; real grader protocols from live checks.
- No testimonials, user counts, outcomes, pricing or press exist. Nothing of the kind may be invented.

## Product Principles

1. One instruction with its reason: the product says what to do next and why.
2. Honesty over polish: empty means empty; no invented dates, numbers or content.
3. Evidence over claims: points and levels come from graded work, never from self-report.
4. The student's own work is the centre: their lines, their attempts, their marks.
5. Calm by default: nothing moves unless it answers the student.

## Accessibility & Inclusion

- Text at WCAG AA contrast in every theme (checked by `.tools/contrast.mjs`), visible focus, 44px touch targets on touch screens, reduced motion respected.
- Russian and English: every typeface must carry Cyrillic.
