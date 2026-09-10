import 'react'

/**
 * `<ViewTransition>` ships in the React build Next vendors for the App Router,
 * but @types/react 19 does not declare it yet. Without this the component is a
 * type error at every call site, and the alternative — casting it away at each
 * one — hides the day the real types arrive and this file can be deleted.
 *
 * Props follow React's own definition: `name` pairs elements across a
 * navigation, and the class props select which CSS animation runs. `default`
 * covers transitions this element is not otherwise named in; setting it to
 * "none" stops an element animating on every unrelated navigation.
 */
declare module 'react' {
  interface ViewTransitionProps {
    children?: ReactNode
    name?: string
    default?: string
    enter?: string
    exit?: string
    update?: string
    share?: string
    onEnter?: (element: Element, types: string[]) => void
    onExit?: (element: Element, types: string[]) => void
    onShare?: (element: Element, types: string[]) => void
    onUpdate?: (element: Element, types: string[]) => void
  }

  export const ViewTransition: ExoticComponent<ViewTransitionProps>
}
