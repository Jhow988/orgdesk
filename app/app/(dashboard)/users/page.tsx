import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listOrgUsersAction } from '@/app/actions/users'
import { UsersClient } from './_components/UsersClient'

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const users = await listOrgUsersAction()

  return (
    <div className="p-6">
      <UsersClient users={users} currentUserId={session.user.id} />
    </div>
  )
}
