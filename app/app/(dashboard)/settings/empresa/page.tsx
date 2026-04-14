import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listEmpresasAction } from '@/app/actions/empresa'
import { EmpresaManager } from './_components/EmpresaManager'

export default async function EmpresaSettingsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const empresas = await listEmpresasAction()

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Empresas (CNPJs)</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie os CNPJs emissores da sua organização. Cada empresa pode ter seus próprios clientes, boletos, NFs e cobranças PIX.
        </p>
      </div>

      <EmpresaManager empresas={empresas} />
    </div>
  )
}
