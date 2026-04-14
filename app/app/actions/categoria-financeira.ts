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

export async function listCategoriasAction() {
  const orgId = await requireOrg()
  return prisma.categoriaFinanceira.findMany({
    where: { organization_id: orgId, is_active: true },
    orderBy: { name: 'asc' },
  })
}

export async function getCategoriasForSelectAction(type?: string) {
  const orgId = await requireOrg()

  // AMBOS type matches all categories; otherwise filter by type or AMBOS
  const typeFilter =
    type && type !== 'AMBOS'
      ? { OR: [{ type }, { type: 'AMBOS' }] }
      : {}

  return prisma.categoriaFinanceira.findMany({
    where: {
      organization_id: orgId,
      is_active: true,
      ...typeFilter,
    },
    select: { id: true, name: true, type: true, color: true },
    orderBy: { name: 'asc' },
  })
}

export async function createCategoriaAction(_prev: unknown, formData: FormData) {
  const orgId = await requireOrg()

  const name = (formData.get('name') as string)?.trim()
  const type = (formData.get('type') as string)?.trim() || 'AMBOS'
  const color = (formData.get('color') as string)?.trim() || '#6366f1'

  if (!name) return { error: 'Nome é obrigatório.' }

  const existing = await prisma.categoriaFinanceira.findUnique({
    where: { organization_id_name: { organization_id: orgId, name } },
  })
  if (existing) return { error: 'Já existe uma categoria com este nome.' }

  await prisma.categoriaFinanceira.create({
    data: {
      organization_id: orgId,
      name,
      type,
      color,
    },
  })

  revalidatePath('/financeiro/categorias')
  return { success: true }
}

export async function updateCategoriaAction(
  id: string,
  data: {
    name: string
    type?: string
    color?: string
    is_active?: boolean
  }
) {
  const orgId = await requireOrg()

  if (!data.name?.trim()) return { error: 'Nome é obrigatório.' }

  // Check uniqueness ignoring current record
  const existing = await prisma.categoriaFinanceira.findFirst({
    where: {
      organization_id: orgId,
      name: data.name.trim(),
      NOT: { id },
    },
  })
  if (existing) return { error: 'Já existe uma categoria com este nome.' }

  await prisma.categoriaFinanceira.updateMany({
    where: { id, organization_id: orgId },
    data: {
      name: data.name.trim(),
      type: data.type || 'AMBOS',
      color: data.color || '#6366f1',
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
    },
  })

  revalidatePath('/financeiro/categorias')
  return { success: true }
}

export async function deleteCategoriaAction(id: string) {
  const orgId = await requireOrg()
  await prisma.categoriaFinanceira.deleteMany({ where: { id, organization_id: orgId } })
  revalidatePath('/financeiro/categorias')
}
