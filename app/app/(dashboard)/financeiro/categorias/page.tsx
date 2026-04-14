import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listCategoriasAction } from '@/app/actions/categoria-financeira'
import { CategoriaManager } from './_components/CategoriaManager'

export default async function CategoriasPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const categorias = await listCategoriasAction()

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Categorias Financeiras</h1>
        <p className="mt-1 text-sm text-zinc-500">Gerencie as categorias de contas a pagar e receber.</p>
      </div>

      <CategoriaManager categorias={categorias} />
    </div>
  )
}
