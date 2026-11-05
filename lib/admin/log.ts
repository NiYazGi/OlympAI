import 'server-only'

import type { Json } from '@/lib/supabase/database.types'
import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

/**
 * One line in the admin log. Never throws: a change that went through must not
 * be reported as failed because its log line did not.
 */
export async function logAdmin(
  admin: Admin,
  adminId: string,
  action: string,
  target: string | null,
  detail: Record<string, Json | undefined> = {},
) {
  try {
    await admin.from('admin_log').insert({ admin_id: adminId, action, target, detail: detail as Json })
  } catch (cause) {
    console.error('[admin-log]', action, cause)
  }
}

/** What each logged action is called on the log page. Keys are the English text. */
export const ACTION_LABEL: Record<string, string> = {
  'admin.grant': 'Granted admin',
  'admin.revoke': 'Removed admin',
  'user.role': 'Changed role',
  'card.save': 'Saved a problem card',
  'card.verify': 'Verified a problem card',
  'card.generate': 'Drafted problem cards',
  'user.confirm': 'Confirmed email',
  'user.block': 'Blocked account',
  'user.unblock': 'Unblocked account',
  'user.sessions': 'Signed out everywhere',
  'user.onboarding': 'Reset onboarding',
  'user.profile': 'Edited profile',
  'user.delete': 'Deleted account',
  'olympiad.add': 'Added olympiad',
  'olympiad.edit': 'Edited olympiad',
  'olympiad.active': 'Showed or hid olympiad',
  'olympiad.remove': 'Removed olympiad',
  'task.create': 'Created problem',
  'task.edit': 'Edited problem',
  'task.hide': 'Hid problem',
  'task.show': 'Showed problem',
  'task.delete': 'Deleted problem',
  'attempt.rescore': 'Re-scored attempt',
  'attempt.delete': 'Deleted attempt',
  'report.resolve': 'Answered report',
  'class.delete': 'Deleted class',
  'class.member': 'Removed student from class',
  'settings.announcement': 'Changed announcement',
  'settings.signups': 'Opened or closed sign-ups',
}
