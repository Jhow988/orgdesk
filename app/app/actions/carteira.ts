'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return session.user.orgId as string
}

export async function listCarteirasAction() {
  const orgId = await requireOrg()
  return prisma.carteira.findMany({
    where: { organization_id: orgId },
    include: {
      empresa: {
        select: { id: true, name: true, cnpj: true },
      },
    },
    orderBy: [{ empresa: { name: 'asc' } }, { name: 'asc' }],
  })
}

export async function getCarteirasForSelectAction(empresa_id?: string) {
  const orgId = await requireOrg()
  return prisma.carteira.findMany({
    where: {
      organization_id: orgId,
      is_active: true,
      ...(empresa_id ? { empresa_id } : {}),
    },
    select: {
      id: true,
      name: true,
      empresa: { select: { name: true } },
    },
    orderBy: [{ empresa: { name: 'asc' } }, { name: 'asc' }],
  })
}

export async function createCarteiraAction(_prev: unknown, formData: FormData) {
  const orgId = await requireOrg()

  const name = (formData.get('name') as string)?.trim()
  const empresa_id = (formData.get('empresa_id') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const type = (formData.get('type') as string)?.trim() || 'CORRENTE'
  const bank = (formData.get('bank') as string)?.trim() || null

  if (!name) return { error: 'Nome é obrigatório.' }
  if (!empresa_id) return { error: 'Empresa é obrigatória.' }

  await prisma.carteira.create({
    data: {
      organization_id: orgId,
      empresa_id,
      name,
      description,
      type,
      bank,
    },
  })

  revalidatePath('/financeiro/carteiras')
  return { success: true }
}

export async function updateCarteiraAction(
  id: string,
  data: {
    name: string
    empresa_id: string
    description?: string | null
    type?: string
    bank?: string | null
    is_active?: boolean
  }
) {
  const orgId = await requireOrg()

  if (!data.name?.trim()) return { error: 'Nome é obrigatório.' }
  if (!data.empresa_id) return { error: 'Empresa é obrigatória.' }

  await prisma.carteira.updateMany({
    where: { id, organization_id: orgId },
    data: {
      name: data.name.trim(),
      empresa_id: data.empresa_id,
      description: data.description?.trim() || null,
      type: data.type || 'CORRENTE',
      bank: data.bank?.trim() || null,
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
    },
  })

  revalidatePath('/financeiro/carteiras')
  return { success: true }
}

export async function deleteCarteiraAction(id: string) {
  const orgId = await requireOrg()
  await prisma.carteira.deleteMany({ where: { id, organization_id: orgId } })
  revalidatePath('/financeiro/carteiras')
}
