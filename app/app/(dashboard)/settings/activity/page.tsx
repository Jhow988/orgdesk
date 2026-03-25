import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listActivityAction } from '@/app/actions/activity'
import { ActivityClient } from './_components/ActivityClient'

export default async function ActivityPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role)) redirect('/dashboard')

  const entries = await listActivityAction(300)

  return (
    <div className="p-6">
      <ActivityClient entries={entries} />
    </div>
  )
}
