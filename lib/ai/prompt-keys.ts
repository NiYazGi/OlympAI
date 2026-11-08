/** The AI tasks whose prompts the admin panel can edit. Shared with the client. */
export const PROMPT_KEYS = ['chat', 'tutor', 'grader', 'card', 'transcribe'] as const
export type PromptKey = (typeof PROMPT_KEYS)[number]

/** English keys, translated where shown. */
export const PROMPT_LABEL: Record<PromptKey, { title: string; note: string }> = {
  chat: { title: 'Sulu chat', note: 'The general chat and conversations started from a problem without Opora.' },
  tutor: { title: 'Opora hints', note: 'The hint ladder on a problem page: reads the attempt and gives the next step.' },
  grader: { title: 'Grading', note: 'Marks a submitted solution out of 7, line by line.' },
  card: { title: 'Card drafts', note: 'Drafts an Opora card from the reference solution.' },
  transcribe: { title: 'Photo of a solution', note: 'Turns a photographed handwritten solution into text.' },
}
