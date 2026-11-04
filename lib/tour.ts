
/**
 * The guided tour, as data.
 *
 * Each step names what it points at by a `data-tour` value in the page, in
 * order of preference: the first one that is on screen wins. Nav items are on
 * the rail on a laptop and in the bottom bar on a phone, and three of them are
 * behind "More" on a phone — so those steps fall back to the More button and
 * say so. A step whose target is nowhere (a teacher with no classes yet) is
 * shown in the middle of the screen rather than skipped: the words still hold.
 */
/** What each step says, as translation keys. */
export const TOUR_COPY = {
  welcome: {
    title: 'Welcome to OlympAI',
    body: 'A minute on how preparing here works. You can skip it and come back any time with the “?” at the top.',
  },
  today: {
    title: 'What to do today',
    body: 'Every day starts with one concrete step — read a topic, check yourself, or solve a problem — picked from your route. Start here.',
  },
  stats: {
    title: 'Your numbers',
    body: 'Your streak of days, today’s points, and how long is left until the olympiad. The details are on Progress.',
  },
  flame: {
    title: 'Your flame',
    body: 'Every day you open OlympAI, the flame grows by one. Miss a whole day and it starts again — so drop in daily, even for five minutes.',
  },
  day: {
    title: 'Score the day',
    body: 'Once a day, mark five things: theory, solving, head, sleep and what the rest of life took. The bar is more than 15 of 25, and the card says where the missing points are cheapest tonight.',
  },
  plan: {
    title: 'Your plan',
    body: 'Week by week to the date of the olympiad: what to do this week and when each section is due. It opens from Learn. In a class, your teacher sets the order and the deadlines.',
  },
  learn: {
    title: 'Topics',
    body: 'Every topic is four steps: read the notes, check yourself on a quiz, solve a real olympiad problem, then sit a paper.',
  },
  tasks: {
    title: 'Problems',
    body: 'Real problems from regional, national and international rounds, with their figures and tables. Write your solution in words and formulas — the AI marks the reasoning, not just the answer.',
  },
  mock: {
    title: 'Mock papers',
    body: 'Real papers against the clock. The result tells you your level.',
  },
  sulu: {
    title: 'Sulu, your coach',
    body: 'Ask about a topic or a problem. Sulu gives hints and asks questions, but never hands you the answer.',
  },
  classes: {
    title: 'Your class',
    body: 'If a teacher sends you a class link, open it: you join the class, it appears in the menu, and their plan becomes your route.',
  },
  finish: {
    title: 'That’s it',
    body: 'Start with today’s step. The “?” at the top runs this tour again.',
  },
  teacherWelcome: {
    title: 'Your classes',
    body: 'A minute on running a class here. You can skip it and come back any time with the “?” at the top.',
  },
  teacherCreate: {
    title: 'Create a class',
    body: 'A name and a subject. Students join with a six-letter code or a link you send them.',
  },
  teacherPlan: {
    title: 'The class plan is yours',
    body: 'Open a class and find “The order of the course”. Reorder the sections, set how many problems each asks for, leave sections out, choose the problems yourself, and give each a deadline and a note. Students follow it from the moment you save.',
  },
  teacherLearn: {
    title: 'Topics',
    body: 'The same notes and quizzes your students see — handy before a lesson.',
  },
  teacherTasks: {
    title: 'Problem bank',
    body: 'Every problem with its figures, searchable by year and by text.',
  },
  teacherOlympiads: {
    title: 'Olympiads',
    body: 'The catalogue: what each olympiad is, who can enter, and the official links.',
  },
  teacherFinish: {
    title: 'Ready',
    body: 'Create your first class and send the code. The “?” at the top runs this tour again.',
  },
} satisfies Record<string, { title: string; body: string }>

export type TourStepKey = keyof typeof TOUR_COPY

export type TourStep = {
  key: TourStepKey
  /** `data-tour` values to point at; none for a step that is just words. */
  targets: string[]
  /** Shown under the text when the step had to fall back to "More". */
  more?: boolean
}

const STUDENT: TourStep[] = [
  { key: 'welcome', targets: [] },
  { key: 'today', targets: ['today'] },
  { key: 'stats', targets: ['stats'] },
  { key: 'flame', targets: ['flame'] },
  { key: 'day', targets: ['day'] },
  { key: 'plan', targets: ['nav:/learn'] },
  { key: 'learn', targets: ['nav:/learn'] },
  { key: 'tasks', targets: ['nav:/tasks'] },
  { key: 'mock', targets: ['nav:/mock'] },
  { key: 'sulu', targets: ['nav:/sulu-ai'] },
  { key: 'classes', targets: ['nav:/class', 'nav:more'], more: true },
  { key: 'finish', targets: ['today'] },
]

const TEACHER: TourStep[] = [
  { key: 'teacherWelcome', targets: [] },
  { key: 'teacherCreate', targets: ['class-create'] },
  { key: 'teacherPlan', targets: ['class-list'] },
  { key: 'teacherLearn', targets: ['nav:/learn'] },
  { key: 'teacherTasks', targets: ['nav:/tasks'] },
  { key: 'teacherOlympiads', targets: ['nav:/olympiads'] },
  { key: 'teacherFinish', targets: ['class-create'] },
]

export type TourRole = 'student' | 'teacher'

export const tourFor = (role: TourRole) => (role === 'teacher' ? TEACHER : STUDENT)

/** Where each kind of account's tour runs: the page its targets are on. */
export const tourHome = (role: TourRole) => (role === 'teacher' ? '/class' : '/dashboard')
