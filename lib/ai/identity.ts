/**
 * Sulu never names the model behind it. The prompt says so; this makes sure
 * of it on the way out, whatever the model was talked into.
 *
 * Pure, and idempotent: the replacement matches none of the patterns, so a
 * stream can be scrubbed in overlapping pieces.
 */

const NAMES = [
  // Longest first, so a full product name is replaced as one.
  '(?:tencent\\s+)?hunyuan(?:[-\\s]+hy\\d*)?',
  'chat\\s?gpt',
  'gpt[-\\s]?\\d[\\w.-]*',
  'gpt[-\\s]?(?:o\\d|turbo|mini)',
  'open\\s?ai',
  'tencent',
  'hunyuan',
  'hy[-\\s]?\\d+(?:\\.\\d+)?',
  'claude',
  'anthropic',
  'gemini',
  'deepmind',
  'bard',
  'llama\\s?\\d*',
  'meta\\s+ai',
  'mistral',
  'mixtral',
  'qwen\\d*',
  'deepseek',
  'yandex\\s?gpt',
  'gigachat',
  'grok',
  'starimg',
  // Cyrillic spellings
  'чат\\s?gpt',
  'опен\\s?аи',
  'тенсент',
  'ханьюань',
  'хуньюань',
  'клод',
  'антропик',
  'джемини',
  'гигачат',
  'яндекс\\s?gpt',
  'дипсик',
]

const PATTERN = new RegExp(`(?<![\\p{L}\\d])(?:${NAMES.join('|')})(?![\\p{L}\\d])`, 'giu')

export const ASSISTANT_NAME = 'Sulu AI'

// "Sulu AI Sulu AI" and "Sulu AI от Sulu AI" read as a glitch; one name is enough.
const REPEATS = new RegExp(`${ASSISTANT_NAME}(?:[\\s,]+(?:(?:от|by|из|from|компании|of)\\s+)?${ASSISTANT_NAME})+`, 'g')

export function scrubIdentity(text: string) {
  return text.replace(PATTERN, ASSISTANT_NAME).replace(REPEATS, ASSISTANT_NAME)
}

/** Holds back the tail of a stream so a name split across two chunks is still caught. */
export function identityScrubber() {
  const HOLD = 32
  let buffer = ''
  return {
    push(chunk: string) {
      buffer = scrubIdentity(buffer + chunk)
      if (buffer.length <= HOLD) return ''
      const out = buffer.slice(0, -HOLD)
      buffer = buffer.slice(-HOLD)
      return out
    },
    flush() {
      const out = scrubIdentity(buffer)
      buffer = ''
      return out
    },
  }
}
