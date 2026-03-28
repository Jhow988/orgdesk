import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ProposalForm } from '../../_components/ProposalForm'
import { updateProposalAction } from '@/app/actions/proposals'
import { checkModuleAccess } from '@/app/actions/permissions'

interface Props { params: Promise<{ id: string }> }

export default async function EditProposalPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const denied = await checkModuleAccess('proposals', 'EDIT')
  if (denied) redirect('/comercial/proposals')

  const { id } = await params

  const [proposal, clients, products] = await Promise.all([
    prisma.proposal.findFirst({
      where: { id, organization_id: session.user.orgId },
      include: { items: { orderBy: { sort_order: 'asc' } } },
    }),
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

  if (!proposal) notFound()

  const defaultValues = {
    title:          proposal.title,
    client_id:      proposal.client_id,
    valid_until:    proposal.valid_until ? proposal.valid_until.toISOString().slice(0, 10) : undefined,
    notes:          proposal.notes ?? undefined,
    discount:       Number(proposal.discount),
    freight:        Number((proposal as any).freight ?? 0),
    payment_method: (proposal as any).payment_method ?? undefined,
    items: proposal.items.map(item => ({
      id:          item.id,
      product_id:  item.product_id ?? '',
      description: item.description,
      unit:        item.unit ?? 'un',
      quantity:    Number(item.quantity),
      unit_price:  Number(item.unit_price),
      total:       Number(item.total),
      item_type:   ((item as any).item_type ?? 'MONTHLY_SERVICE') as any,
    })),
  }

  // Bind proposal_id into the action
  const action = updateProposalAction.bind(null, null as any)

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href={`/comercial/proposals/${id}`} className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          ← Proposta #{String(proposal.number).padStart(4, '0')}
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">Editar proposta</h1>
      </div>
      <form>
        <input type="hidden" name="proposal_id" value={id} />
      </form>
      <ProposalForm
        action={async (prev, fd) => {
          'use server'
          fd.set('proposal_id', id)
          return updateProposalAction(prev, fd)
        }}
        clients={clients}
        products={products as any}
        defaultValues={defaultValues}
      />
    </div>
  )
}
