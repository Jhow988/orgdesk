import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listCarteirasAction } from '@/app/actions/carteira'
import { getEmpresasForSelectAction } from '@/app/actions/empresa'
import { CarteirasManager } from './_components/CarteirasManager'

export default async function CarteirasPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const [carteiras, empresas] = await Promise.all([
    listCarteirasAction(),
    getEmpresasForSelectAction(),
  ])

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Carteiras</h1>
        <p className="mt-1 text-sm text-zinc-500">Gerencie as carteiras financeiras por empresa.</p>
      </div>

      <CarteirasManager carteiras={carteiras} empresas={empresas} />
    </div>
  )
}
