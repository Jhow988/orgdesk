import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProductForm } from '../_components/ProductForm'
import { createProductAction } from '@/app/actions/products'

export default async function NewProductPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/comercial/products" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← Produtos e Serviços
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-700">Novo item</h1>
      </div>
      <div className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-6">
        <ProductForm action={createProductAction} />
      </div>
    </div>
  )
}
