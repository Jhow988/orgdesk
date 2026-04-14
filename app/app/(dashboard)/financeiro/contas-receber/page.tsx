import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listContasReceberAction } from '@/app/actions/conta-receber'
import { getEmpresasForSelectAction } from '@/app/actions/empresa'
import { getCarteirasForSelectAction } from '@/app/actions/carteira'
import { getClientsForSelectAction } from '@/app/actions/conta-receber'
import { ContasReceberManager } from './_components/ContasReceberManager'

interface PageProps {
  searchParams: Promise<{ status?: string; empresa_id?: string }>
}

export default async function ContasReceberPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const params = await searchParams
  const { status, empresa_id } = params

  const [contas, empresas, carteiras, clients] = await Promise.all([
    listContasReceberAction({
      status: status ?? undefined,
      empresa_id: empresa_id ?? undefined,
    }),
    getEmpresasForSelectAction(),
    getCarteirasForSelectAction(),
    getClientsForSelectAction(),
  ])

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Contas a Receber</h1>
        <p className="mt-1 text-sm text-zinc-500">Gerencie seus recebimentos e cobranças.</p>
      </div>

      <ContasReceberManager
        contas={contas}
        empresas={empresas}
        carteiras={carteiras}
        clients={clients}
        initialStatus={status ?? 'ALL'}
        initialEmpresaId={empresa_id ?? ''}
      />
    </div>
  )
}
