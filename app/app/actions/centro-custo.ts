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

export async function listCentrosCustoAction() {
  const orgId = await requireOrg()
  return prisma.centroCusto.findMany({
    where: { organization_id: orgId, is_active: true },
    orderBy: { name: 'asc' },
  })
}

export async function getCentrosCustoForSelectAction() {
  const orgId = await requireOrg()
  return prisma.centroCusto.findMany({
    where: { organization_id: orgId, is_active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export async function createCentroCustoAction(_prev: unknown, formData: FormData) {
  const orgId = await requireOrg()

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null

  if (!name) return { error: 'Nome é obrigatório.' }

  const existing = await prisma.centroCusto.findUnique({
    where: { organization_id_name: { organization_id: orgId, name } },
  })
  if (existing) return { error: 'Já existe um centro de custo com este nome.' }

  await prisma.centroCusto.create({
    data: {
      organization_id: orgId,
      name,
      description,
    },
  })

  revalidatePath('/financeiro/centros-custo')
  return { success: true }
}

export async function updateCentroCustoAction(
  id: string,
  data: {
    name: string
    description?: string | null
    is_active?: boolean
  }
) {
  const orgId = await requireOrg()

  if (!data.name?.trim()) return { error: 'Nome é obrigatório.' }

  // Check uniqueness ignoring current record
  const existing = await prisma.centroCusto.findFirst({
    where: {
      organization_id: orgId,
      name: data.name.trim(),
      NOT: { id },
    },
  })
  if (existing) return { error: 'Já existe um centro de custo com este nome.' }

  await prisma.centroCusto.updateMany({
    where: { id, organization_id: orgId },
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
    },
  })

  revalidatePath('/financeiro/centros-custo')
  return { success: true }
}

export async function deleteCentroCustoAction(id: string) {
  const orgId = await requireOrg()
  await prisma.centroCusto.deleteMany({ where: { id, organization_id: orgId } })
  revalidatePath('/financeiro/centros-custo')
}
