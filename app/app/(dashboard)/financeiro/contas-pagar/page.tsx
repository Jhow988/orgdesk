import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listContasPagarAction } from '@/app/actions/conta-pagar'
import { getEmpresasForSelectAction } from '@/app/actions/empresa'
import { getCarteirasForSelectAction } from '@/app/actions/carteira'
import { ContasPagarManager } from './_components/ContasPagarManager'

interface PageProps {
  searchParams: Promise<{ status?: string; empresa_id?: string }>
}

export default async function ContasPagarPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const params = await searchParams
  const { status, empresa_id } = params

  const [contas, empresas, carteiras] = await Promise.all([
    listContasPagarAction({
      status: status ?? undefined,
      empresa_id: empresa_id ?? undefined,
    }),
    getEmpresasForSelectAction(),
    getCarteirasForSelectAction(),
  ])

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Contas a Pagar</h1>
        <p className="mt-1 text-sm text-zinc-500">Gerencie suas despesas e pagamentos.</p>
      </div>

      <ContasPagarManager
        contas={contas}
        empresas={empresas}
        carteiras={carteiras}
        initialStatus={status ?? 'ALL'}
        initialEmpresaId={empresa_id ?? ''}
      />
    </div>
  )
}
