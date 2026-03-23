import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { toggleProductAction } from '@/app/actions/products'

export default async function ProductsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const products = await prisma.product.findMany({
    where: { organization_id: session.user.orgId },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Produtos e Serviços</h1>
          <p className="mt-1 text-sm text-zinc-500">{products.length} item{products.length !== 1 ? 's' : ''} cadastrado{products.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/comercial/products/new"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors">
          + Novo item
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Preço padrão</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  Nenhum produto ou serviço cadastrado.
                </td>
              </tr>
            ) : products.map(p => (
              <tr key={p.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{p.name}</div>
                  {p.description && <div className="text-xs text-zinc-500 truncate max-w-xs">{p.description}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.type === 'SERVICE' ? 'bg-blue-900/50 text-blue-400' : 'bg-violet-900/50 text-violet-400'}`}>
                    {p.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.unit}</td>
                <td className="px-4 py-3 text-zinc-300 font-mono">
                  {Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.is_active ? 'bg-emerald-900/50 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/comercial/products/${p.id}`} className="text-xs text-zinc-400 hover:text-white transition-colors">Editar</Link>
                    <form action={async () => { 'use server'; await toggleProductAction(p.id, p.is_active) }}>
                      <button type="submit" className={`text-xs transition-colors ${p.is_active ? 'text-red-500 hover:text-red-400' : 'text-emerald-500 hover:text-emerald-400'}`}>
                        {p.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
