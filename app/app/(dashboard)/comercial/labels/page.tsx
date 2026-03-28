import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listLabelsAction } from '@/app/actions/labels'
import { LabelsClient } from './_components/LabelsClient'

export default async function LabelsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'ORG_ADMIN'
  const labels = await listLabelsAction()

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Etiquetas</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Etiquetas para categorizar propostas e contratos.
          {!isAdmin && <span className="ml-1 text-zinc-600">Apenas administradores podem criar ou editar.</span>}
        </p>
      </div>
      <LabelsClient labels={labels} isAdmin={isAdmin} />
    </div>
  )
}
