import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listCentrosCustoAction } from '@/app/actions/centro-custo'
import { CentroCustoManager } from './_components/CentroCustoManager'

export default async function CentrosCustoPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const centros = await listCentrosCustoAction()

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Centros de Custo</h1>
        <p className="mt-1 text-sm text-zinc-500">Gerencie os centros de custo da sua organização.</p>
      </div>

      <CentroCustoManager centros={centros} />
    </div>
  )
}
