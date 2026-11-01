import { pluralEn } from '@/lib/i18n/plural'

const p = pluralEn

/**
 * The English strings, and the shape every other language has to match.
 *
 * Organised by screen rather than by word, because the same English word is
 * rarely the same word twice in a language with cases: "Check" as the name of
 * a rung and "Check" on a button are one string here and two everywhere else.
 * A value is a function whenever it takes a number or a name, so the
 * translation can put them where its own grammar wants them rather than where
 * English left a gap.
 */
export const en = {
  locale: {
    label: 'Language',
    note: 'The interface. Lessons, problems and olympiad pages stay in the language they were written in.',
  },

  common: {
    save: 'Save',
    saving: 'Saving',
    saved: 'Saved.',
    cancel: 'Cancel',
    change: 'Change',
    back: 'Back',
    close: 'Close',
    open: 'Open',
    search: 'Search',
    clear: 'Clear',
    all: 'All',
    none: 'None',
    loading: 'Loading',
    notSaved: 'That did not save. Please try again.',
    offline: 'That did not save. Check your connection and try again.',
    expired: 'Your session has expired. Please log in again.',
    optional: 'optional',
    noData: 'No data',
    done: 'Done',
    next: 'Next',
    of: (a: number, b: number) => `${a} of ${b}`,
    percentThrough: (n: number) => `${n}% through`,
    days: (n: number) => `${n} ${p(n, 'day', 'days')}`,
    daysLeft: (n: number) => `${n} ${p(n, 'day', 'days')} left`,
    minutes: (n: number) => `${n} min`,
    hours: (n: number) => `${n} h`,
    problems: (n: number) => `${n} ${p(n, 'problem', 'problems')}`,
    questions: (n: number) => `${n} ${p(n, 'question', 'questions')}`,
    blocks: (n: number) => `${n} ${p(n, 'block', 'blocks')}`,
    cards: (n: number) => `${n} ${p(n, 'card', 'cards')}`,
    papers: (n: number) => `${n} ${p(n, 'paper', 'papers')}`,
  },

  /**
   * The seven subjects, by the name the database holds.
   *
   * Taxonomy rather than content: a fixed, short list that names a section of
   * the interface, like a level or a region. Topic names and the lessons
   * themselves are content and stay in the language they were written in.
   */
  subjects: {
    Mathematics: 'Mathematics',
    Physics: 'Physics',
    Biology: 'Biology',
    'Computer Science': 'Computer Science',
    Economics: 'Economics',
    Geography: 'Geography',
    Linguistics: 'Linguistics',
  } as Record<string, string>,

  /**
   * The sections inside a subject, by the slug the database holds.
   *
   * Taxonomy, like the subject names: a fixed list that titles a part of the
   * interface. The problems filed under them stay in the language they were
   * written in.
   */
  topics: {
    'Algebra': 'Algebra',
    'Inequalities': 'Inequalities',
    'Polynomials': 'Polynomials',
    'Functional Equations': 'Functional equations',
    'Sequences and Series': 'Sequences and series',
    'Number Theory': 'Number theory',
    'Geometry': 'Geometry',
    'Combinatorics': 'Combinatorics',
    'Graphs': 'Graphs',
    'Invariants and Colourings': 'Invariants and colourings',
    'Games and Strategies': 'Games and strategies',
    'Kinematics': 'Kinematics',
    'Mechanics': 'Mechanics',
    'Statics': 'Statics',
    'Conservation Laws': 'Conservation laws',
    'Fluids and Gases': 'Fluids and gases',
    'Oscillations and Waves': 'Oscillations and waves',
    'Molecular Physics': 'Molecular physics',
    'Thermodynamics': 'Thermodynamics',
    'Electrostatics': 'Electrostatics',
    'Electrodynamics': 'Current and circuits',
    'Magnetism and Induction': 'Magnetism and induction',
    'Optics': 'Optics',
    'Modern Physics': 'Modern physics',
  } as Record<string, string>,

  nav: {
    dashboard: 'Dashboard',
    plan: 'Plan',
    classes: 'Classes',
    learn: 'Learn',
    tasks: 'Problems',
    mock: 'Mock tests',
    sulu: 'Sulu AI',
    olympiads: 'Olympiads',
    settings: 'Settings',
    me: 'Your account',
    more: 'More',
    main: 'Main',
    home: 'Home',
    papers: 'Papers',
    meShort: 'Me',
    yourAccount: 'your account',
    accountAria: (name: string) => `${name} — your account`,
    streakTooltip: (n: number) => `${n} ${n === 1 ? 'day' : 'days'} in a row`,
    theme: { toLight: 'Switch to light', toDark: 'Switch to dark' },
  },

  dashboard: {
    title: 'Dashboard',
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    welcome: 'Welcome back',
    askSulu: 'Ask Sulu AI',
    loading: 'Loading your dashboard',
    emptyTitle: 'No problems are available yet',
    emptyBody:
      'The library has not been filled in for this workspace. Once it is, what to do next shows up here.',
    emptyAction: 'Ask Sulu something',
    today: 'Today',
    level: 'Level',
    streak: 'Streak',
    target: 'Target',
    dayUnit: (n: number): string => (n === 1 ? 'day' : 'days'),
    daysLeftUnit: 'days left',
    targetUnset: 'not set',
    targetPick: 'Choose one on Learn',
    whereYouStand: 'Where you stand',
    fullAnalytics: 'Full analytics',
    skills: 'Skills',
    weakest: (topics: string) => `Weakest: ${topics}.`,
    nothingWeak: 'Nothing left below 70%.',
    accuracyByWeek: 'Accuracy by week',
    preparingFor: 'Preparing for',
    perWeek: (n: number) => `${n} ${p(n, 'problem', 'problems')} a week`,
    behind: (pace: number, target: number) => `${pace} last week against ${target}.`,
    openPath: 'Open your path',
  },

  goal: {
    ready: 'ready',
    covered: (n: number) => `${n}% covered`,
    accurate: (n: number) => `${n}% accurate`,
    workload: {
      light: {
        label: 'Room to spare',
        note: 'At your rhythm the route lands well before the date. You could aim higher, or bring the date forward.',
      },
      steady: { label: 'Fits', note: 'The route lands just before the date. Nothing to change.' },
      demanding: {
        label: 'Tight',
        note: 'The route runs a little past the date at this rhythm. One more session a week, or a later date.',
      },
      unrealistic: {
        label: 'Does not fit',
        note: 'There is more route here than there is time. Move the date, raise the rhythm, or have your teacher shorten the sections.',
      },
    },
  },

  day: {
    heading: 'Today',
    outOf: (max: number) => `/ ${max}`,
    above: (target: number) => `above ${target}`,
    short: (n: number, need: number) => `${n} short of ${need}`,
    whyFive: 'Why these five',
    daysLeftShort: (n: number) => `${n} d left`,
    axes: {
      theory: 'Theory',
      solving: 'Solving',
      mental: 'Head',
      sleep: 'Sleep',
      load: 'Taken',
    },
    detail: {
      notRecorded: 'Not recorded',
      sleepHours: (h: number, lightsOut: boolean, at: string) =>
        `${h} h${lightsOut ? ` · in bed by ${at}` : ''}`,
      notStarted: 'Not started',
      restingRight: 'Nothing — right',
      xpOf: (today: number, goal: number) => `${today} of ${goal} XP`,
      xp: (n: number) => `${n} XP`,
      mental: (n: number): string =>
        ['', 'In pieces', 'Heavy going', 'Fine', 'Clear', 'Sharp'][n] ?? `${n}/5`,
      loadNone: 'The day was yours',
    },
    gap: {
      lightsOut: (at: string) => `In bed by ${at}: +1`,
      sleep: (n: number) => `Eight hours tonight: +${n}`,
      stop: (n: number) => `Stop for the day: +${n}`,
      more: (time: string, n: number) => `${time} more: +${n}`,
      leaveIt: 'Leave it alone until the paper',
      xp: (xp: number, n: number) => `${xp} XP more: +${n}`,
      mental: 'A walk, food, someone to talk to — it counts here',
      load: (n: number) => `Fewer hours to everything else: +${n}`,
    },
    phase: {
      base: {
        label: 'Base',
        rule: 'Two to three hours a day, every day. The days you do not feel like it are the ones being counted.',
      },
      crunch: {
        label: 'Final two weeks',
        rule: (at: string) =>
          `Ten to twelve hours a day, and lights out by ${at} — the night before the paper is the one you are rehearsing.`,
      },
      taper: {
        label: 'Last two days',
        rule: 'Nothing. Rest completely, so you arrive hungry for it rather than sick of it.',
      },
    },
    form: {
      theoryLabel: 'Theory',
      theoryHint: 'hours reading',
      solvingLabel: 'Solving',
      solvingHint: 'hours on problems',
      loadLabel: 'Taken',
      loadHint: 'hours on school and the rest',
      sleptLabel: 'Hours slept',
      sleptHint: 'last night',
      mentalLabel: 'Head',
      mentalHint: '1 to 5',
      lightsOut: (at: string) => `In bed by ${at}`,
      submit: 'Save the day',
    },
  },

  ladder: {
    next: 'Next',
    done: 'Done',
    study: {
      label: 'Read',
      blurb: 'The idea, why it works, a worked example.',
      readThrough: 'Read through.',
      opened: 'Opened, not finished.',
      waiting: (blocks: number, minutes: number | null) =>
        `${blocks} ${blocks === 1 ? 'block' : 'blocks'}${minutes ? ` · about ${minutes} min` : ''}.`,
      empty: 'No notes written for this topic yet.',
    },
    check: {
      label: 'Check',
      blurb: 'A few questions, marked as you answer.',
      empty: 'No questions for this topic yet.',
      waiting: (n: number) => `${n} ${n === 1 ? 'question' : 'questions'} waiting.`,
      progress: (correct: number, total: number) => `${correct} of ${total} answered right.`,
    },
    apply: {
      label: 'Solve',
      blurb: 'Full derivations, marked against the method.',
      empty: 'No problems in this topic yet.',
      progress: (solved: number, total: number) =>
        `${solved} of ${total} ${total === 1 ? 'problem' : 'problems'} solved.`,
    },
    sit: {
      label: 'Sit a paper',
      blurb: 'Timed, no hints, the whole subject at once.',
      ineligible: (subject: string) =>
        `${subject} needs at least three problems before a paper measures anything.`,
      taken: (n: number, best: number) =>
        `${n} ${n === 1 ? 'paper' : 'papers'} sat · best ${best}%.`,
      ready: 'Ready when you are.',
      early: 'Open now, but it measures best once the steps above are behind you.',
    },
    cards: {
      label: 'Flashcards',
      blurb: 'Terms and facts, spaced out so they stick.',
      empty: 'No cards for this topic yet.',
      due: (n: number) => `${n} ${n === 1 ? 'card' : 'cards'} due now.`,
      known: (learned: number, total: number) => `${learned} of ${total} known · nothing due.`,
      asideNote: (detail: string) => ` · optional · ${detail}`,
    },
  },

  nextAction: {
    doThisNow: 'Do this now',
    chooseSubject: {
      label: 'Choose what you are training for',
      detail: 'A competition, or just a subject and a date.',
      why: 'Everything here is ordered around one target. Without one there is no next step to name.',
      cta: 'Set your target',
    },
    emptySubject: {
      label: (subject: string) => `Nothing has been written for ${subject} yet`,
      detail: 'No notes, no questions, no problems in this subject.',
      why: 'Rather than filling the screen with material from a subject you are not training for.',
      cta: 'Look at the other subjects',
    },
    halfRead: {
      label: (topic: string) => `Finish the notes on ${topic}`,
      why: 'You opened this and did not finish it. Half-read is the worst place to leave a topic.',
      cta: 'Pick it up',
    },
    study: {
      label: (topic: string) => `Read the notes on ${topic}`,
      why: 'First step in a topic you have not started. Everything after it assumes this.',
      cta: 'Start reading',
    },
    check: {
      label: (topic: string) => `Check yourself on ${topic}`,
      detail: (left: number) =>
        `${left} ${left === 1 ? 'question' : 'questions'} still to get right · a few minutes`,
      why: 'You have read it. Answering from memory is what turns reading into something you can use.',
      cta: 'Start the quiz',
    },
    applyNamed: {
      label: (title: string) => `Solve: ${title}`,
      detail: (topic: string, difficulty: number, minutes: number | null) =>
        `${topic} · ${difficulty}★${minutes ? ` · about ${minutes} min` : ''}`,
      cta: 'Open the problem',
    },
    apply: {
      label: (topic: string) => `Solve a problem in ${topic}`,
      detail: (left: number) => `${left} left in this topic · full derivation, graded on the method`,
      why: 'The topic is learned. This is the step that finds out whether it holds up under a real problem.',
      cta: 'Pick a problem',
    },
    sit: {
      label: (subject: string) => `Sit a ${subject} paper`,
      detail: 'Timed, no hints, no coach.',
      why: 'Every topic here is behind you. A timed paper is the only thing left that measures the difference.',
      cta: 'Start a paper',
    },
    done: {
      label: (subject: string) => `You are through everything in ${subject}`,
      detail: 'Notes read, questions answered, problems solved.',
      why: 'Nothing here is unfinished. More material is what this needs now, not more effort from you.',
      cta: 'Look at another subject',
    },
  },

  learn: {
    title: 'Learn',
    description: 'Your target, and the route to it.',
    loading: 'Working out what to do next',
    loadingTopic: 'Loading the topic',
    allTopics: 'All topics',
    emptyTitle: 'No topics yet',
    emptyBody: 'Subjects and topics arrive with the reference content.',
    emptyAction: 'Browse problems',
    multiSubject: (name: string) => `${name} covers more than one subject. Choose yours.`,
    scopeAll: 'Every subject.',
    scopePick: 'Pick a target',
    scopeNarrow: 'to narrow it.',
    scopeBack: (subject: string) => `Back to ${subject}`,
    scopeBecause: (subject: string) => `${subject}, because that is your target`,
    scopeOther: (n: number): string => (n === 1 ? 'one other subject' : `${n} other subjects`),
    nothingLeft: 'Nothing left to do here.',
    nextIs: (label: string, detail: string) => `Next: ${label} — ${detail}`,
    nothingWritten: 'nothing written yet',
    chooseTitle: 'Choose what you are training for',
    chooseBody:
      'Pick a subject and the path lays itself out: topics in order of difficulty, each one unlocking the next.',
    changeSubject: 'Change subject',
    noSubjects:
      'No subjects came back. Reload the page — if the list is still empty, the reference content has not been imported into this workspace yet.',
    noTasksYet: 'no tasks yet',
    tasksCount: (n: number) => `${n} ${n === 1 ? 'task' : 'tasks'}`,
    summary: { perWeek: 'Per week', time: 'Time', load: 'Load' },
    nextUp: 'Next up',
    allSolved: 'Every problem in this subject is solved. Pick a harder target.',
    onTrack: 'On track',
    behindPace: 'Behind pace',
    paceLine: (state: string, pace: number, target: number) => `${state} — ${pace} last week against ${target}.`,
    setBySubject: ' (set by the competition)',
    readFurther: 'Read further',
    material: 'Material',
    flashcards: 'Flashcards',
  },

  solve: {
    yourSolution: 'Your solution',
    explainNote:
      'Explain the reasoning, not only the final answer — it is graded on the derivation.',
    placeholder: 'Write your reasoning and equations here…',
    keptLocally: 'Kept on this device while you work',
    photo: 'Photo of your notebook',
    photoHint:
      'Solved on paper? Photograph the page. Sulu copies it line by line into the box below; check it against your notebook, fix anything misread, then submit.',
    photoReading: 'Reading the photo…',
    photoRead: 'Read from the photo. Check every line against your notebook before you submit.',
    photoUnreadable: 'No solution could be read in this photo. Shoot the page straight on, closer, in good light.',
    photoFailed: 'The photo could not be read just now. Try again in a minute.',
    photoInvalid: 'That file cannot be read as a photo. Use a JPEG or PNG.',
    photoSession: 'Your session has expired. Log in again.',
    photoAlt: 'Your notebook page',
    moreChars: (n: number) => `${n} more characters before it can be graded`,
    notSubmitted: 'Your attempt could not be submitted. Check your connection and try again.',
    showHint: 'Show a hint',
    nextHint: (n: number, total: number) => `Next hint (${n}/${total})`,
    firstSolve: 'first solve',
    repeat: 'already solved — reduced',
    forAttempt: 'for the attempt',
    verdict: {
      correct: 'Complete solution',
      partially_correct: 'Solution with a gap',
      incorrect: 'Some progress',
      not_an_attempt: 'Not a solution yet',
    } as Record<string, string>,
    checking: 'Checking your solution',
    checkingNote: 'The grader reads every line, so this takes a little while.',
    grading: 'Checking…',
    submit: 'Submit solution',
    askSulu: 'Ask Sulu AI',
    fix: 'Fix the solution',
    openReview: 'Open the review',
  },

  protocol: {
    title: 'Attempt review',
    gradedOn: (date: string) => `Graded ${date}`,
    outOf: 'out of 7',
    derived: (score: number) => `recalculated from ${score}/100`,
    solution: 'Solution',
    criteria: 'Marking scheme',
    breaks: 'Where the solution breaks',
    need: 'What is needed',
    technique: 'The idea',
    nextStep: 'Next step',
    feedback: 'Feedback',
    legend: 'Marks',
    total: 'Total',
    earnedOf: (earned: number, max: number) => `${earned} of ${max}`,
    noMarks: 'This attempt was graded before line marks existed, so it has the feedback alone.',
    back: 'Back to the problem',
    attempts: 'My attempts',
    noAttempts: 'No attempts yet. The first one is graded line by line.',
    attemptOn: (date: string) => `Attempt of ${date}`,
    solutionTab: 'Solution',
    line: (n: number) => `Line ${n}`,
    lines: (from: number, to: number) => `Lines ${from}–${to}`,
    mark: {
      ok: 'holds',
      gap: 'needs a reason',
      error: 'error',
      strong: 'strong idea',
    } as Record<string, string>,
  },

  shortcut: {
    lastStepOf: 'The last step of',
    readNotes: 'Read the notes',
    checkYourself: 'Check yourself',
    cards: 'Cards',
    quizLeft: (left: number, total: number) => `${left} of ${total} still to get right`,
    quizAll: (total: number) => `All ${total} answered`,
    cardsDue: (n: number) => `${n} due now`,
    cardsNoneDue: (total: number) => `${total} in the deck, none due`,
  },

  quiz: {
    fallbackTitle: 'Quiz',
    metaTitle: (topic: string) => `${topic} quiz`,
    title: 'Check yourself',
    loading: 'Loading the questions',
    emptyTitle: 'No questions for this topic yet',
    emptyBody:
      'Nothing has been written for this topic. When it is, this is where the quick check will be.',
    backToTopic: 'Back to the topic',
    thisRound: 'This round',
    allRight: 'Every one right. The facts behind them are worth committing to cards before you move on.',
    another: 'Worth another pass. A question you got wrong is the most useful thing on this page.',
    notThisTime: 'Not this time.',
    alreadyCounted: 'Already counted',
    seeResult: 'See the result',
    nextQuestion: 'Next question',
    right: 'Right.',
    goAgain: 'Go again',
    reviewCards: 'Review the cards',
    questionOf: (n: number, total: number) => `Question ${n} of ${total}`,
    rightOf: (score: number, answered: number) => `${score}/${answered} right`,
    keyHint: 'to answer',
    keyNext: 'for the next question',
    notSent: 'That answer did not reach the server. Check your connection and try again.',
  },

  cards: {
    fallbackTitle: 'Cards',
    metaTitle: (topic: string) => `${topic} cards`,
    title: 'Recall',
    loading: 'Loading the cards',
    note: (due: number, known: number, total: number) =>
      `${due} due now · ${known} of ${total} known`,
    hideAnswer: 'Hide the answer',
    showAnswer: 'Show the answer',
    oneRating: 'One rating',
    nothingDue: 'Nothing is due right now.',
    noCards: 'This topic has no cards yet — write your own below and they start showing up here.',
    notSaved: 'The card could not be saved.',
    notRemoved: 'That card could not be removed. Check your connection and try again.',
    ownCards: 'Your own cards',
    frontPlaceholder: 'Front — the prompt, e.g. “What is active transport?”',
    backPlaceholder: 'Back — what you want to recall',
    positionOf: (n: number, total: number) => `${n} of ${total}`,
    reviewed: (n: number) => `${n} reviewed`,
    progressLabel: 'Cards reviewed in this round',
    ownJudgement:
      'Rating a card is your own judgement, so it moves this topic\u2019s progress rather than your XP. The quiz is where answers are marked.',
    showAnswerKey: 'Show answer',
    space: 'space',
    unsaved: (n: number) =>
      n === 1
        ? 'One rating could not be saved, so that card is still due. Your place in the deck is unaffected.'
        : `${n} ratings could not be saved, so those cards are still due. Your place in the deck is unaffected.`,
    doneCount: (n: number) => `${n} reviewed. Nothing else is due.`,
    comeBack:
      'Coming back on the day a card is due is the whole point of the spacing. You can still run through the deck early.',
    goThroughAll: (n: number) => `Go through all ${n}`,
    privateNote: 'Private to you, and scheduled alongside the shared ones.',
    addCard: 'Add a card',
    saveCard: 'Save card',
    ratings: {
      forgot: { label: 'Forgot', hint: 'Back to the start of the ladder.' },
      hard: { label: 'Hard', hint: 'Drops a step.' },
      good: { label: 'Good', hint: 'Up a step.' },
      easy: { label: 'Easy', hint: 'Up two.' },
    },
    interval: {
      today: 'again today',
      tomorrow: 'tomorrow',
      days: (n: number) => `in ${n} days`,
    },
    deleteCard: 'Delete card',
  },

  lesson: {
    fallbackTitle: 'Lesson',
    loading: 'Loading the notes',
    blocks: {
      concept: 'Concept',
      explanation: 'Why it works',
      example: 'Worked example',
      key_facts: 'Key facts',
    } as Record<string, string>,
    markedRead: 'Marked as read.',
    finished: 'Finished reading?',
    ownNote: 'Your own note to yourself — it is not a score, and nothing checks it.',
    notYet: 'Not yet',
    markRead: 'Mark as read',
    checkYourself: 'Check yourself',
    readTheNotes: 'Read the notes',
    notSaved: 'That could not be saved.',
  },

  bank: {
    searchPlaceholder: 'Search problems…',
    subject: 'Subject',
    topic: 'Topic',
    difficulty: 'Difficulty',
    status: 'Status',
    stage: 'Stage',
    allStages: 'All stages',
    stages: {
      oblast: 'Oblast round',
      republican: 'Republican round',
      international: 'International',
    } as Record<string, string>,
    allSubjects: 'All subjects',
    allTopics: 'All topics',
    allLevels: 'All levels',
    allStates: 'All',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    solved: 'Solved',
    unsolved: 'Unsolved',
    attempted: 'Attempted',
    count: (shown: number, total: number) =>
      `${shown} of ${total} ${total === 1 ? 'problem' : 'problems'}`,
    noMatch: 'No problem matches these filters.',
    attemptsBadge: (n: number) => `${n} ${n === 1 ? 'attempt' : 'attempts'}`,
    firstSolveXp: 'XP for a first solve',
    difficultyAria: (level: number) => `Difficulty ${level} out of 5`,
    emptyTitle: 'No tasks here yet',
    emptyBody:
      'Nothing has been added to the library for this workspace. Sulu can still work through a problem with you in the meantime.',
    emptyAction: 'Open Sulu AI',
  },

  tasks: {
    title: 'Problems',
    description:
      'The last step of every topic: write the full derivation and Sulu grades the reasoning.',
    loading: 'Loading the problems',
    loadingOne: 'Loading the problem',
    back: 'Back to problems',
    problem: 'Problem',
    given: 'Given',
    find: 'Find',
    solved: 'You have solved this task.',
    attempted: 'Attempted, not solved yet.',
    attempts: (n: number, best: number | null) =>
      `${n} ${n === 1 ? 'attempt' : 'attempts'}${best !== null ? ` · best score ${best}/100` : ''}`,
    minutes: (n: number) => `${n} min`,
    diagramAlt: (title: string) => `Diagram for ${title}`,
  },

  mock: {
    title: 'Mock tests',
    description:
      'A timed paper with no hints and no Sulu — the closest thing here to sitting the real thing.',
    loading: 'Loading your mock tests',
    emptyTitle: 'Not enough tasks for a mock yet',
    emptyBody: 'A subject needs at least three tasks before a paper can measure anything.',
    browseTasks: 'Browse tasks',
    inProgress: 'In progress',
    subjectMock: (subject: string) => `${subject} mock`,
    questionsMinutes: (questions: number, minutes: number) =>
      `${questions} ${questions === 1 ? 'question' : 'questions'} · ${minutes} minutes`,
    resume: 'Resume',
    takeAPaper: 'Take a paper',
    takeNote:
      'Up to five questions spanning the difficulty range, timed. Your answers are graded together at the end and the result sets the level on your profile — replacing the one you guessed at during setup.',
    yourTarget: 'your target',
    startLabel: (subject: string, isTarget: boolean, questions: number) =>
      `${subject}${isTarget ? ' (your target)' : ''} · ${questions} questions`,
    shortNote:
      'Not enough problems for a paper yet — a subject needs three before a score means anything:',
    shortCount: (n: number) => `(${n} of 3)`,
    realPapers: 'Past papers, as they were sat',
    realPapersNote:
      'Whole sittings from the Kazakh olympiad: the problems that were set, in the order they were printed, for the time that was given. Graded like any other paper.',
    paperShape: (n: number, minutes: number) =>
      `${n} problems · ${Math.round(minutes / 60)} h`,
    paperSeen: (n: number) => `${n} already solved`,
    composed: 'Or a paper put together for you',
    pastPapers: 'Past papers',
    noPapers: 'No papers yet. The first one takes about an hour.',
  },

  exam: {
    metaTitle: 'Mock test',
    back: 'All mock tests',
    timeUp: 'Time is up',
    questionAria: (n: number, answered: boolean) =>
      `Question ${n}${answered ? ', answered' : ', blank'}`,
    submitPaper: 'Submit paper',
    submitAll: (n: number) => `Submit all ${n} answers for grading?`,
    stillBlank: (n: number) => `${n} ${n === 1 ? 'question is' : 'questions are'} still blank.`,
    irreversible:
      'Everything you have written is graded together, and the paper cannot be reopened afterwards. A blank answer scores nothing.',
    submitN: (n: number) => `Submit ${n} ${n === 1 ? 'answer' : 'answers'}`,
    keepWorking: 'Keep working',
    questionHeading: (n: number, title: string) => `Question ${n}. ${title}`,
    keptLocally: 'Your answers are kept on this device until you submit.',
    grading: 'Grading…',
    placeholder: 'Your full derivation…',
    notSubmitted: 'The paper could not be submitted.',
    notStarted: 'The test could not be started.',
  },

  sulu: {
    startTitle: 'Start a focused conversation',
    startBody: 'Show Sulu what you have tried, or ask for one small hint.',
    prompts: ['Give me a hint', 'Explain the key idea', 'Check my approach'],
    placeholder: 'Ask Sulu about your approach…',
    messageAria: 'Message Sulu AI',
    sendAria: 'Send message',
    writingAria: 'Sulu is writing',
    noResponse: 'Sulu AI could not respond.',
    retry: 'Retry',
    unavailable: 'Sulu AI is unavailable.',
  },

  me: {
    title: 'Me',
    description: 'Your setup, your numbers and what you have earned.',
    loading: 'Loading your account',
    logOut: 'Log out',
    loggingOut: 'Logging out…',
    yourAccount: 'Your account',
    xpLevel: (level: number) => `XP · level ${level}`,
    attempts: 'Attempts',
    solvedStat: 'Solved',
    accuracy: 'Accuracy',
    dayStreak: 'Day streak',
    trainNext: 'Train next',
    needsPractice: (topic: string) => `${topic} needs more focused practice.`,
    nothingWeak: 'Nothing below 70% — step up the difficulty.',
    strongTopics: 'Strong topics',
    keepPractising: 'Keep practising to identify your strongest.',
    reviewMistakes: 'Review mistakes',
    nothingWrong: 'Nothing incorrect to review.',
    emptyTitle: 'Your numbers start with one attempt',
    emptyBody:
      'Submit a solution and this section fills in: accuracy, mastery per topic, your streak, and what to practise next.',
    achievements: 'Achievements',
    earnedOf: (earned: number, total: number) => `${earned} of ${total} earned`,
    takeAMock: 'Take a mock',
    noneYet: 'Nothing yet — the first one needs a single solved task.',
    closestFirst: 'Closest to unlocking, first.',
  },

  /**
   * The closed option sets a profile may hold. The value stored in the
   * database stays English — it is validated against lib/profile-options.ts —
   * and only the caption is looked up here.
   */
  options: {
    'Grade 7–8': 'Grade 7–8',
    'Grade 9–10': 'Grade 9–10',
    'Grade 11–12': 'Grade 11–12',
    University: 'University',
    'Getting started': 'Getting started',
    'Building momentum': 'Building momentum',
    'Competition ready': 'Competition ready',
    'Build a consistent practice habit': 'Build a consistent practice habit',
    'Reach a new personal rating': 'Reach a new personal rating',
    'Qualify for my national team': 'Qualify for my national team',
    'School or regional': 'School or regional',
    'National selection': 'National selection',
    'International preparation': 'International preparation',
    'Exploring for now': 'Exploring for now',
    '3 short sessions a week': '3 short sessions a week',
    '5 focused sessions a week': '5 focused sessions a week',
    'Daily intensive practice': 'Daily intensive practice',
  } as Record<string, string>,

  achievements: {
    firstSolution: { name: 'First solution', description: 'Solve your first task' },
    tenDown: { name: 'Ten down', description: 'Solve 10 tasks' },
    century: { name: 'Century club', description: 'Solve 100 tasks' },
    week: { name: '7-day streak', description: 'Practice every day for a week' },
    marathon: { name: 'Marathon', description: 'Practice every day for a month' },
    sharpshooter: { name: 'Sharpshooter', description: '10 correct submissions in a row' },
    topicMaster: {
      name: 'Topic master',
      description: '90% accuracy in a topic, over at least 5 attempts',
    },
    broadBase: { name: 'Broad base', description: 'Attempt tasks in 5 different topics' },
    level5: { name: 'Level 5', description: 'Reach level 5' },
    level10: { name: 'Level 10', description: 'Reach level 10' },
    thousand: { name: 'Thousand club', description: 'Earn 1,000 XP' },
  },

  landing: {
    badge: 'Built for olympiad thinkers',
    headline: 'Your hardest problems deserve a better training plan.',
    lede:
      'OlympAI turns ambitious practice into clear progress. Solve deeply, learn from every attempt, and train with Sulu AI when you get stuck.',
    startTraining: 'Start training',
    seeHow: 'See how it works',
    noCard: 'No credit card required',
    focused: 'Built for focused practice',
    todaysFocus: "Today's focus",
    buildMomentum: 'Build momentum',
    recommendedNext: 'Recommended next',
    sampleTask: 'Two masses and a pulley',
    sampleMeta: 'Physics · Mechanics · Hard',
    sampleMastery: 'Mechanics mastery',
    exampleNote: 'Example view — your dashboard starts empty.',
    oneHome: 'One home for serious practice',
    trainAcross: 'Train across the subjects that shape olympiad careers.',
    meetSulu: 'Meet Sulu AI',
    coachHeadline: 'A coach that makes you think better.',
    coachBody:
      'Sulu guides your reasoning with the right hint at the right time. It sees the problem context, follows the thread of your conversation, and helps you build the next step yourself.',
    suluMentor: 'Your olympiad mentor',
    chat1: 'Before we write equations, what stays the same throughout the string?',
    chat2: 'The acceleration magnitude of both masses.',
    chat3: 'Exactly. Now use that constraint to connect the two free-body diagrams.',
    progressEyebrow: 'Progress you can act on',
    progressHeadline: 'See what to practise next, not just what you finished.',
    footerTag: 'Practice with purpose. Compete with confidence.',
    navSubjects: 'Subjects',
    navProgress: 'Progress',
    sampleEstimate: '20 min estimate',
    sampleDifficulty: '5 of 5 difficulty',
    homeAria: 'OlympAI home',
    toggleMenu: 'Toggle menu',
    subjects: [
      { name: 'Physics', detail: 'Mechanics, fields, thermodynamics' },
      { name: 'Mathematics', detail: 'Algebra, combinatorics, number theory' },
      { name: 'Computer Science', detail: 'Algorithms, data structures, logic' },
    ],
    features: [
      {
        title: 'Graded on the reasoning',
        body: 'Submit a full derivation. Sulu reads the argument, awards partial credit for a sound method, and tells you the first step that breaks.',
      },
      {
        title: 'Hints before answers',
        body: 'The coach opens with a question, not a solution. It only walks the whole problem once you have genuinely attempted it.',
      },
      {
        title: 'Mastery per topic',
        body: 'Accuracy is tracked topic by topic from your own attempts, so the weekly plan always leads with what is actually weak.',
      },
    ],
  },

  onboarding: {
    steps: {
      grade: {
        eyebrow: 'Quick setup',
        title: 'What grade are you in?',
        description: 'This sets an appropriate starting point.',
      },
      primary_subject: {
        eyebrow: 'Your focus',
        title: 'Choose your primary subject',
        description:
          'You can practise the others any time — this only decides where we start.',
      },
      level: {
        eyebrow: 'Starting point',
        title: 'How does practice feel right now?',
        description: 'It sets the difficulty of your first tasks. Nothing is locked in.',
      },
      goal: {
        eyebrow: 'Your goal',
        title: 'What are you working toward?',
        description: 'Choose the outcome that matters most right now.',
      },
      target_competition_type: {
        eyebrow: 'Optional',
        title: 'Preparing for a particular kind of competition?',
        description:
          'Skip this if you are not sure yet — it only shapes the style of practice.',
      },
      training_intensity: {
        eyebrow: 'Your rhythm',
        title: 'How often would you like to train?',
        description:
          'Start sustainably. Your weekly plan is built from this, and you can change it.',
      },
    } as Record<string, { eyebrow: string; title: string; description: string }>,
    labels: {
      grade: 'Grade',
      primary_subject: 'Primary subject',
      level: 'Current level',
      goal: 'Goal',
      target_competition_type: 'Competition type',
      training_intensity: 'Training rhythm',
    } as Record<string, string>,
    review: 'Review',
    stepOf: (n: number, total: number) => `${n} of ${total}`,
    progressAria: 'Setup progress',
    almostThere: 'Almost there',
    looksRight: 'Does this look right?',
    answeredOf: (n: number, total: number) =>
      `${n} of ${total} answered. Change anything you like — none of it is permanent.`,
    skipped: 'Skipped',
    change: 'Change',
    back: 'Back',
    startTraining: 'Start training',
    skipQuestion: 'Skip this question',
    continue: 'Continue',
    enterToFinish: 'Press Enter to finish',
    keyHints: 'Press 1–9 to choose · Enter to continue · Backspace to go back',
    saveFailed: 'Unable to save your setup.',
  },

  auth: {
    logIn: 'Log in',
    createAccount: 'Create account',
    newPassword: 'Choose a new password',
    welcomeBack: 'Welcome back',
    startJourney: 'Start your journey',
    signupTitle: 'Create your OlympAI account',
    loginTitle: 'Log in to your training space',
    tagline: 'Train with intent. Compete with confidence.',
    blurb:
      'A focused practice space for students who want to understand hard problems, not just finish them.',
    builtFor: 'OlympAI · Built for ambitious minds',
    backHome: 'Back home',
    role: 'What is this account for?',
    roleStudent: 'I am training',
    roleStudentNote: 'Problems, a plan, and a target of your own.',
    roleTeacher: 'I am teaching',
    roleTeacherNote: 'Open a class, invite students, follow their work.',
    yourName: 'Your name',
    fullNamePlaceholder: 'Your full name',
    email: 'Email address',
    password: 'Password',
    minChars: 'At least 8 characters',
    enterPassword: 'Enter your password',
    terms: 'I agree to the terms and understand that OlympAI is a practice tool.',
    creating: 'Creating your account…',
    loggingIn: 'Logging in…',
    continue: 'Continue',
    haveAccount: 'Already have an account?',
    newHere: 'New to OlympAI?',
    createOne: 'Create an account',
    sendingReset: 'Sending a reset link…',
    forgot: 'Forgot password?',
    telegram: 'Telegram',
    telegramOptional: 'optional',
    telegramPlaceholder: '@username',
    telegramNote:
      'The bot asks you five short questions once a day and fills in your day for you. You can add this later in Settings.',
  },

  errors: {
    somethingWrong: 'Something went wrong',
    couldNotLoad: 'We could not load this page.',
    tryAgainNote: 'Please try again.',
    pageDidNotLoad: 'This page did not load.',
    nothingLost:
      'Nothing you have submitted is lost — attempts, answers and ratings are recorded as they happen. Try again, or move to another part of the app from the navigation.',
    ref: 'Ref',
    tryAgain: 'Try again',
    notFound: 'This page does not exist.',
    backToPractice: 'Let us get you back to focused practice.',
    goHome: 'Go to OlympAI',
  },

  settings: {
    title: 'Settings',
    description: 'Appearance, language, your account, and how you leave it.',
    loading: 'Loading your account',
    appearance: 'Appearance',
    dark: 'Dark',
    light: 'Light',
    theDefault: 'The default',
    account: 'Account',
    name: 'Name',
    grade: 'Grade',
    primarySubject: 'Primary subject',
    level: 'Level',
    accountType: 'Account type',
    classRow: 'Class',
    notSet: 'Not set',
    editedUnder: 'These are edited under',
    alongside: ', alongside your progress.',
    content: 'Content',
    contentNote:
      'Add lectures and readings to a task or a topic. Every item records where it came from and what may be done with it.',
    addMaterial: 'Add material',
    telegram: 'Telegram',
    telegramNote:
      'The bot asks five short questions once a day and fills in your day for you. The link below connects this account to your Telegram — it is single-use, and opening this page again replaces it.',
    telegramConnect: 'Connect Telegram',
    telegramLinked: 'Connected. The bot asks in the evening; /day asks now, /score repeats today\u2019s number.',
    telegramOff: 'The bot is not configured on this server.',
    session: 'Session',
    sessionNote: 'You will be returned to the login page. Nothing you have submitted is lost.',
    savePreferences: 'Save preferences',
    prefsFailed: 'Your preferences could not be saved.',
    currentLevel: 'Current level',
    currentGoal: 'Current goal',
    trainingRhythm: 'Training rhythm',
  },

  track: {
    stop: 'Stop tracking',
    start: 'Track this one',
    failed: 'That did not go through.',
  },

  olympiads: {
    title: 'Olympiads',
    description: 'Every contest in the catalogue, what each one involves, and how ready you are for it.',
    loading: 'Loading competitions',
    loadingOne: 'Loading the olympiad',
    back: 'All olympiads',
    emptyTitle: 'No competitions listed yet',
    emptyBody:
      'This page shows real competitions and how ready you are for each, based on your accuracy in that subject. Nothing has been added yet.',
    emptyAction: 'Keep training',
    searchPlaceholder: 'Search by name, subject or region',
    filterSubject: 'Subject',
    filterLevel: 'Level',
    allSubjects: 'All subjects',
    allLevels: 'All levels',
    shown: (shown: number, total: number) => `${shown} of ${total}`,
    nothingFound: 'Nothing matches that. Try a shorter search, or clear the filters.',
    tracking: 'Tracking',
    details: 'Details',
    about: 'What it is',
    format: 'The papers',
    eligibility: 'Who can enter',
    route: 'How you get there',
    links: 'Links',
    officialSite: 'Official site',
    pastPapers: 'Past papers',
    enterSite: 'Enter on the official site',
    region: 'Region',
    founded: 'Founded',
    level: 'Level',
    readiness: 'Readiness',
    accuracyIn: (subject: string) => `Accuracy in ${subject}`,
    thisSubject: 'this subject',
    noAttempts: 'No attempts in this subject yet.',
    datesNote:
      'No dates here on purpose: the sitting moves every year, and the organiser\u2019s own page is the only place that is right. Your own target date is set on Learn.',
    noWriteUp: 'No write-up for this one yet — the official site is the authority.',
    trackNote: 'Tracking keeps it on your list here. Entering is done on the organiser\u2019s site.',
    multiSubject: 'Several subjects',
    levels: {
      International: 'International',
      National: 'National',
      Regional: 'Regional',
      School: 'School',
      University: 'University',
    } as Record<string, string>,
    regions: {} as Record<string, string>,
  },

  /**
   * The route through a subject, as the student meets it.
   *
   * A catalogue answers "what is there"; a track answers "what now". The
   * second question is the one somebody opens this app with, so the track is
   * what /tasks shows first and the catalogue is a link away.
   */
  route: {
    title: 'Your track',
    nowDoing: 'Now',
    upNext: 'Next',
    done: 'Behind you',
    solvedOf: (solved: number, target: number) => `${solved} of ${target} solved`,
    solvedCount: (n: number) => `${n} solved`,
    leftHere: (n: number) => `${n} to go in this section`,
    inLibrary: (n: number) => `${n} in the library`,
    openCatalogue: 'Whole catalogue',
    backToTrack: 'Back to the track',
    catalogueNote:
      'Every problem in the subject, filterable. Looking something up here does not change what the track says to do next.',
    fromTeacher: (klass: string) => `Order set by your teacher · ${klass}`,
    fromTeacherNamed: (klass: string, teacher: string) => `Order set by ${teacher} · ${klass}`,
    defaultOrder: 'The default order for this subject',
    locked: 'Opens when the section before it is mostly behind you',
    lockedShort: 'later',
    allDone: 'Every section on the track is done',
    allDoneBody:
      'The track asks for a number of problems per section, not for all of them. The catalogue holds the rest, and a timed paper is the better measure from here.',
    sitPaper: 'Sit a paper',
    noTarget: 'Choose what you are training for',
    noTargetBody: 'The track runs through one subject. Pick yours and it lays itself out.',
    chooseTarget: 'Choose a subject',
    emptySubject: 'Nothing has been written for this subject yet',
  },
  plan: {
    title: 'Your plan',
    description: 'What the next weeks look like, and what today is for.',
    loading: 'Working out your plan',
    noTarget: 'Set a target first',
    noTargetBody:
      'A plan is a route to somewhere. Choose what you are preparing for and by when, and this page fills in.',
    setTarget: 'Choose a target',
    weeksLeft: (n: number) => `${n} ${n === 1 ? 'week' : 'weeks'} left`,
    perWeek: (n: number) => `${n} a week`,
    rhythm: (n: number) => `${n} a week — your chosen rhythm`,
    fitLine: (needed: number, left: number) =>
      needed === 0
        ? `The route is done, with ${left} ${left === 1 ? 'week' : 'weeks'} still to the date.`
        : `The route needs about ${needed} ${needed === 1 ? 'week' : 'weeks'} at that rhythm; ${left} ${left === 1 ? 'is' : 'are'} left.`,
    thinNote: (sections: string) =>
      `Not in the route, too little written: ${sections}. They are in the catalogue whenever you want them.`,
    thisWeek: 'This week',
    thisWeekNote: (n: number) =>
      `${n} ${n === 1 ? 'problem' : 'problems'} keeps you on the line. Here are the next ones on your route.`,
    nothingLeft: 'Every problem on the route is solved.',
    route: 'The route',
    routeNote:
      'Sections in the order of the syllabus — or your teacher\u2019s, if you are in a class. The week is when this one has to be behind you for the rest to fit.',
    byWeek: (n: number) => `by week ${n}`,
    byDate: (date: string) => `by ${date}`,
    teacherNote: 'From your teacher',
    skippedNote: (sections: string) =>
      `Your teacher has left ${sections} out of this route. They are still in the library.`,
    teacherList: 'chosen by your teacher',
    done: 'done',
    current: 'now',
    locked: 'later',
    ofSolved: (solved: number, total: number) => `${solved} of ${total}`,
    pace: 'Pace',
    onTrack: (pace: number, target: number) =>
      `${pace} solved last week against ${target}. On the line.`,
    behind: (pace: number, target: number) =>
      `${pace} solved last week against ${target}. The date moves or the week does.`,
    honest:
      'The route asks for a number of problems per section rather than all of them — the library holds far more than a season. A teacher can set both the order and the number for their class.',
  },

  method: {
    title: 'The method',
    description: 'How one coach prepares students, and why the app counts the day the way it does.',
    loading: 'Loading the method',
    endTitle: 'What this is for',
    endBody:
      'Write down the end of it. It appears under your target, where you will see it on the evenings the target is not reason enough.',
    endPlaceholder: 'The place this is for',
    tooLong: 'Keep it under a line.',
    rules: [
      {
        title: 'Two to three hours a day',
        body: 'Every day, including the ones where nothing is due. The habit is what carries you through the fortnight that is coming, and a week of nothing costs more than the hours it took.',
        where: "Theory and Solving, on the day's score",
      },
      {
        title: 'Ten to twelve hours in the last two weeks',
        body: 'The final stretch is a different kind of work, not more of the same. Two weeks is short enough to survive at that load and long enough to change the result.',
        where: 'The same two axes, in the last fortnight',
      },
      {
        title: 'Lights out by 22:30, from two weeks out',
        body: 'Not for the rest. You cannot decide to fall asleep the night before the paper — you can only have been falling asleep at that hour for a fortnight already. That night is the one being rehearsed.',
        where: 'Sleep, in the last fortnight',
      },
      {
        title: 'The last two days: nothing',
        body: 'Stop completely. Two days of rest costs nothing you could have learnt in them, and it is what makes you arrive hungry for the paper rather than sick of the subject.',
        where: 'Theory and Solving invert in the taper',
      },
      {
        title: 'Do not prepare alone',
        body: 'Alone it is a grind, and a grind stops. Other people are where the problems you would never have picked come from, and where the reason to keep going comes from when the score is flat.',
        where: 'No axis of its own — but working alone hits Head first',
      },
      {
        title: 'One thing at a time',
        body: 'An olympiad takes the whole of your attention. Run a startup or a side project in the same season and the olympiad is the thing that gives way — which is why the app scores a split day at nought rather than at half.',
        where: 'Taken: the more the rest of life took, the fewer points',
      },
      {
        title: 'More than 15 out of 25, every day',
        body: 'Five axes, 5 points each, and they are interchangeable on purpose. Short of the bar by five, you can solve another problem — or you can go to bed, which is worth the same five and is usually the one you were not going to spend. Reading the diagram that way is the point of having one.',
        where: 'The diagram on the dashboard',
      },
      {
        title: 'The medal is not the goal',
        body: 'You set the goals; a coach is there to get you to them. And the last one is not a place at an olympiad — it is what the place opens, which is usually a university.',
        where: 'Under your target, on the dashboard',
      },
    ],
  },
  /**
   * The teacher's side of the app.
   *
   * Written as a roster rather than a leaderboard. The columns are the work —
   * problems solved, accuracy, sections, when they were last here — and there
   * is no rank and no total: a class is not a table of who is winning.
   */
  classes: {
    title: 'Classes',
    description: 'Your classes, and how each student is getting on.',
    loading: 'Loading your classes',
    emptyTitle: 'No classes yet',
    emptyBody:
      'A class is a roster and a code. Make one, send the link to your students, and their work appears here.',
    create: 'Create a class',
    creating: 'Creating…',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. 11A physics',
    subjectLabel: 'Subject',
    bothSubjects: 'Both',
    students: (n: number) => `${n} ${n === 1 ? 'student' : 'students'}`,
    studentsLabel: 'Students',
    noStudents: 'Nobody has joined yet',
    open: 'Open',
    invite: 'Invite',
    inviteNote:
      'Send the link, or read the code out. Anyone who has it can join, so treat it like a door key.',
    code: 'Code',
    copyLink: 'Copy the link',
    copied: 'Copied',
    rotate: 'New code',
    rotating: 'Changing…',
    rotateNote:
      'The old link stops working. Students already in the class stay where they are.',
    rotateConfirm: 'Change the code? Any link you have already sent stops working.',
    trackTitle: 'The order of the course',
    trackNote: (n: number) =>
      `Your students work through the sections in this order, and each one asks for a number of problems before the next opens. Leave a box empty for the default of ${n}. Sections you do not touch follow the syllabus.`,
    trackTarget: 'Problems',
    trackUp: 'Move up',
    trackDown: 'Move down',
    trackReset: 'Back to the syllabus',
    trackEmpty: 'nothing written for this section yet',
    trackNote2:
      'Open a section to take it out of the route, choose its problems yourself, give it a deadline or leave the class a note.',
    trackSettings: 'Set up',
    trackSkip: 'Leave this section out of the route',
    trackSkipped: 'left out',
    trackDue: 'Finish by',
    trackDueNone: 'at the student\u2019s pace',
    trackNoteLabel: 'Note for the class',
    trackNotePlaceholder: 'Which chapter goes with it, what Friday\u2019s quiz covers…',
    trackPicks: 'Problems',
    trackPicksNone: (n: number) =>
      `None chosen: the class gets the ${n} easiest problems in the section. Choose problems to set your own list and order.`,
    trackPicksCount: (n: number) => `${n} chosen`,
    trackPickSearch: 'Search this section by title, year or a word in the statement',
    trackPickAdd: 'Add',
    trackPickRemove: 'Remove',
    trackPickNothing: 'Nothing in this section matches.',
    trackPickClear: 'Clear the list',
    trackChosenBadge: 'your list',
    trackDueBadge: (date: string) => `by ${date}`,
    trackUnsaved: 'Unsaved changes',
    roster: 'Roster',
    student: 'Student',
    solved: 'Solved',
    attempts: 'Attempts',
    accuracy: 'Accuracy',
    ready: 'Ready',
    lastSeen: 'Last seen',
    never: 'not yet',
    today: 'today',
    daysAgo: (n: number) => `${n} ${n === 1 ? 'day' : 'days'} ago`,
    weakest: 'Weakest',
    noWeakest: 'too early to say',
    remove: 'Remove',
    removeConfirm: (name: string) =>
      `Remove ${name} from this class? Their work is untouched — you simply stop seeing it.`,
    activeThisWeek: 'Active this week',
    classAccuracy: 'Class accuracy',
    classSolved: 'Problems solved',
    classWeak: 'Where the class is weakest',
    classWeakNote:
      'Accuracy by section across every attempt in this class, worst first. A section needs three attempts before it appears.',
    classWeakEmpty: 'Not enough work yet to say anything useful.',
    attemptsIn: (n: number) => `over ${n} ${n === 1 ? 'attempt' : 'attempts'}`,
    backToClass: 'Back to the class',
    bySection: 'By section',
    recent: 'Recent submissions',
    nothingYet: 'Nothing submitted yet.',
    notStarted: 'This student has not started yet.',
    papers: 'Papers',
    bestPaper: 'Best paper',
    lessonsRead: 'Lessons read',
    answered: 'Questions answered',
    joinedOn: (date: string) => `Joined ${date}`,
    privacy: 'What a teacher sees',
    privacyNote:
      'Problems, sections, questions, reading and papers. Not the daily state diagram, and not what was asked of the tutor — sleep, state of mind and the questions somebody asks when they are stuck stay theirs.',
    delete: 'Delete the class',
    deleting: 'Deleting…',
    deleteConfirm:
      'Delete this class? The students keep everything they have done; you stop seeing it.',
    yourClasses: 'Your class',
    taughtBy: (name: string) => `${name}`,
    teacher: 'Teacher',
    joinTitle: 'Join a class',
    joinNote: 'Your teacher gives you a code of six characters, or a link that carries it.',
    joinPlaceholder: 'ABC123',
    join: 'Join',
    joining: 'Joining…',
    leave: 'Leave',
    leaving: 'Leaving…',
    leaveConfirm: 'Leave this class? Your teacher stops seeing your work.',
    notInAClass: 'You are not in a class',
    notInAClassBody:
      'A class is optional. If your teacher runs one, they will give you a code — joining lets them see the work you do here.',
    inviteHeading: (name: string) => `You have been invited to ${name}`,
    inviteBody: 'Joining lets your teacher see the problems you solve here, and nothing else.',
    inviteSignedOut: 'Create an account or log in, and you land straight in the class.',
    inviteCreate: 'Create an account',
    inviteLogIn: 'Log in',
    inviteUnknown: 'That link does not match a class',
    inviteUnknownBody:
      'The code may have been changed, or the class deleted. Ask your teacher for the current link.',
    alreadyIn: 'You are already in this class.',
    teacherNote: 'You are signed in as a teacher, so there is nothing to join here.',
  },
  flame: {
    label: (n: number) => `${n} ${n === 1 ? 'day' : 'days'} in a row`,
    unlit: 'Open the app today to keep your flame alive',
    title: (n: number) => (n === 0 ? 'No flame yet' : `${n} ${n === 1 ? 'day' : 'days'} in a row`),
    best: (n: number) => `Best: ${n} ${n === 1 ? 'day' : 'days'}`,
    rule: 'Come back every day and the flame grows. Miss a whole day and it starts again from one.',
    litToday: 'Today counts.',
    extended: (n: number) => (n === 1 ? 'Your flame is lit!' : `${n} days in a row!`),
    milestone: (n: number) => `${n} days in a row — keep it going!`,
    weekday: (day: string) =>
      new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'narrow', timeZone: 'UTC' }),
  },
  tour: {
    open: 'How this works',
    step: (n: number, of: number) => `${n} of ${of}`,
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    done: 'Start',
    close: 'Close the tour',
    // On a phone some sections live behind "More" in the bottom bar.
    inMore: 'On a phone it is under \u201cMore\u201d in the bottom bar.',
    steps: {
      welcome: {
        title: 'Welcome to OlympAI',
        body: 'A minute on how preparing here works. You can skip it and come back any time with the \u201c?\u201d at the top.',
      },
      today: {
        title: 'What to do today',
        body: 'Every day starts with one concrete step — read a topic, check yourself, or solve a problem — picked from your route. Start here.',
      },
      stats: {
        title: 'Your numbers',
        body: 'Today\u2019s work, your level, your streak of days, and how long is left until the olympiad.',
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
        body: 'Week by week to the date of the olympiad: what to do this week and when each section is due. In a class, your teacher sets the order and the deadlines.',
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
        body: 'If a teacher gave you a code, join here. Their plan then becomes your route.',
      },
      finish: {
        title: 'That\u2019s it',
        body: 'Start with today\u2019s step. The \u201c?\u201d at the top runs this tour again.',
      },
      teacherWelcome: {
        title: 'Your classes',
        body: 'A minute on running a class here. You can skip it and come back any time with the \u201c?\u201d at the top.',
      },
      teacherCreate: {
        title: 'Create a class',
        body: 'A name and a subject. Students join with a six-letter code or a link you send them.',
      },
      teacherPlan: {
        title: 'The class plan is yours',
        body: 'Open a class and find \u201cThe order of the course\u201d. Reorder the sections, set how many problems each asks for, leave sections out, choose the problems yourself, and give each a deadline and a note. Students follow it from the moment you save.',
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
        body: 'Create your first class and send the code. The \u201c?\u201d at the top runs this tour again.',
      },
    },
  },
}

/**
 * Not `as const`: the literal types would make every other language have to
 * repeat the English words to satisfy the type. The shape is what is being
 * enforced — same keys, same arities — not the contents.
 */
export type Dictionary = typeof en
