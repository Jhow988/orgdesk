import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listTechSheetsAction } from '@/app/actions/tech-sheets'
import { FichasClient } from './_components/FichasClient'

export default async function FichasTecnicasPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const clients = await listTechSheetsAction()

  return (
    <div className="h-full flex flex-col overflow-hidden p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-zinc-100">Fichas Técnicas</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Informações técnicas por cliente — acesso remoto, rede, software e contatos.
        </p>
      </div>
      <FichasClient clients={clients} />
    </div>
  )
}
