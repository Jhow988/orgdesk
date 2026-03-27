import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getTicketAction } from '@/app/actions/tickets'
import { TicketDetail } from './_components/TicketDetail'

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const { id } = await params
  const ticket  = await getTicketAction(id)
  if (!ticket) notFound()

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TicketDetail ticket={ticket as any} />
    </div>
  )
}
