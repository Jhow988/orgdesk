'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return session.user.orgId as string
}

export async function createProductAction(_prev: unknown, formData: FormData) {
  const orgId = await requireOrg()

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Nome é obrigatório.' }

  await prisma.product.create({
    data: {
      organization_id: orgId,
      name,
      type: (formData.get('type') as any) ?? 'SERVICE',
      unit: (formData.get('unit') as string)?.trim() || 'un',
      price: parseFloat(formData.get('price') as string) || 0,
      description: (formData.get('description') as string)?.trim() || null,
      is_active: formData.get('is_active') !== '0',
    },
  })

  revalidatePath('/comercial/products')
  redirect('/comercial/products')
}

export async function updateProductAction(id: string, _prev: unknown, formData: FormData) {
  const orgId = await requireOrg()

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Nome é obrigatório.' }

  await prisma.product.updateMany({
    where: { id, organization_id: orgId },
    data: {
      name,
      type: (formData.get('type') as any) ?? 'SERVICE',
      unit: (formData.get('unit') as string)?.trim() || 'un',
      price: parseFloat(formData.get('price') as string) || 0,
      description: (formData.get('description') as string)?.trim() || null,
      is_active: formData.get('is_active') !== '0',
    },
  })

  revalidatePath('/comercial/products')
  return { success: 'Item atualizado.' }
}

export async function toggleProductAction(id: string, current: boolean) {
  const orgId = await requireOrg()
  await prisma.product.updateMany({
    where: { id, organization_id: orgId },
    data: { is_active: !current },
  })
  revalidatePath('/comercial/products')
}
