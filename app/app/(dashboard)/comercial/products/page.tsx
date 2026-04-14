import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProductsTable } from './_components/ProductsTable'

export default async function ProductsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const orgId = session.user.orgId

  const products = await prisma.product.findMany({
    where: { organization_id: orgId },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Produtos e Serviços</h1>
          <p className="mt-1 text-sm text-zinc-500">{products.length} item{products.length !== 1 ? 's' : ''} cadastrado{products.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/comercial/products/new"
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          + Novo item
        </Link>
      </div>

      <ProductsTable products={products.map(p => ({ ...p, price: Number(p.price), stock_quantity: p.stock_quantity ?? null }))} />
    </div>
  )
}
