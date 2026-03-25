import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ContractForm } from '../_components/ContractForm'
import { createContractAction } from '@/app/actions/contracts'
import { checkModuleAccess } from '@/app/actions/permissions'

interface Props { searchParams: Promise<{ proposal_id?: string }> }

export default async function NewContractPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  if (await checkModuleAccess('contracts', 'CREATE')) redirect('/comercial/contracts')

  const { proposal_id } = await searchParams

  const [clients, proposal] = await Promise.all([
    prisma.client.findMany({
      where: { organization_id: session.user.orgId, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    proposal_id
      ? prisma.proposal.findFirst({
          where: { id: proposal_id, organization_id: session.user.orgId },
          select: { id: true, title: true, client_id: true },
        })
      : null,
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/comercial/contracts" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          ← Contratos
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">Novo contrato</h1>
      </div>
      <div className="max-w-3xl rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
        <ContractForm
          action={createContractAction}
          clients={clients}
          defaultValues={proposal ? { proposal_id: proposal.id, client_id: proposal.client_id, title: `Contrato — ${proposal.title}` } : undefined}
        />
      </div>
    </div>
  )
}
