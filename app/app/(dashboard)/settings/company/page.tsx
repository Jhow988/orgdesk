import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getCnpjsIgnore } from '@/app/actions/settings'
import { CnpjIgnoreManager } from './_components/CnpjIgnoreManager'

export default async function CompanySettingsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const cnpjsIgnore = await getCnpjsIgnore()

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Dados da Empresa</h1>
        <p className="mt-1 text-sm text-zinc-500">Configurações da organização.</p>
      </div>

      <CnpjIgnoreManager cnpjsIgnore={cnpjsIgnore} />
    </div>
  )
}
