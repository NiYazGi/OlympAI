import { redirect } from 'next/navigation'

/** Renamed to /me, which now also carries the analytics. */
export default function ProfilePage() {
  redirect('/me')
}
