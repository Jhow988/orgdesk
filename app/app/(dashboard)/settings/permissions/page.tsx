import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listUsersWithPermissionsAction } from '@/app/actions/permissions'
import { PermissionsClient } from './_components/PermissionsClient'

export default async function PermissionsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role)) redirect('/dashboard')

  const users = await listUsersWithPermissionsAction()

  return (
    <div className="p-6">
      <PermissionsClient users={users} currentUserId={session.user.id} />
    </div>
  )
}
