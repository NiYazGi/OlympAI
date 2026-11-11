import { ViewTransition, type ReactNode } from 'react'

/** The page changes; the navigation and the student's sidebar stay still. */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <ViewTransition enter="page-arrive" exit="page-leave" default="none">{children}</ViewTransition>
}
