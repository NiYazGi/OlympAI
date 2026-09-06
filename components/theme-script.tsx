/**
 * Applies the stored theme before the first paint.
 *
 * Dark is the product default, so the class is already on <html> from the
 * server. This only has to handle the reader who chose light: without it they
 * would get a dark flash on every navigation that reloads the document.
 *
 * Inline and synchronous on purpose — anything deferred runs after paint.
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('olympai:theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light')}}catch(e){}})()`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
