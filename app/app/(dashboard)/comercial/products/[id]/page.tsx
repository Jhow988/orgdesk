import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ProductForm } from '../_components/ProductForm'
import { updateProductAction } from '@/app/actions/products'

interface Props { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const { id } = await params
  const product = await prisma.product.findFirst({
    where: { id, organization_id: session.user.orgId },
  })
  if (!product) notFound()

  const boundAction = updateProductAction.bind(null, product.id)

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/comercial/products" className="text-xs text-zinc-500 hover:text-white transition-colors">
          ← Produtos e Serviços
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-white">Editar item</h1>
      </div>
      <div className="max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <ProductForm action={boundAction} defaultValues={product as any} />
      </div>
    </div>
  )
}
