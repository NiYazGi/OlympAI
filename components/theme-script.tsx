/**
 * Applies the stored theme before the first paint.
 *
 * Light is the product default, so the class is already on <html> from the
 * server. This only has to handle the reader who chose dark: without it they
 * would get a white flash on every navigation that reloads the document.
 *
 * Inline and synchronous on purpose — anything deferred runs after paint.
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('olympai:theme');if(t==='dark'){document.documentElement.classList.remove('light');document.documentElement.classList.add('dark')}}catch(e){}})()`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
