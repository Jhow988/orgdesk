import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProposalForm } from '../_components/ProposalForm'
import { createProposalAction } from '@/app/actions/proposals'
import { checkModuleAccess } from '@/app/actions/permissions'

export default async function NewProposalPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const denied = await checkModuleAccess('proposals', 'CREATE')
  if (denied) redirect('/comercial/proposals')

  const [clients, products] = await Promise.all([
    prisma.client.findMany({
      where: { organization_id: session.user.orgId, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { organization_id: session.user.orgId, is_active: true },
      select: { id: true, name: true, unit: true, price: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/comercial/proposals" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          ← Propostas
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">Nova proposta</h1>
      </div>
      <ProposalForm action={createProposalAction} clients={clients} products={products as any} />
    </div>
  )
}
