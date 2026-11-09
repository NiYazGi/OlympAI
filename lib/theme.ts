/**
 * Light or dark. Stored in a cookie so the server renders the chosen theme in
 * the first byte: a theme picked in localStorage would flash light on every
 * load before the script could switch it.
 */
export const THEME_COOKIE = 'olympai-theme'
export const THEMES = ['light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'light'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/** The browser chrome colour for each theme: the page background. */
export const THEME_COLOR: Record<Theme, string> = { light: '#ffffff', dark: '#000000' }
