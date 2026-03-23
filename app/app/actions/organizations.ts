'use server'

import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireSuperAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')
  return session
}

export async function createOrganizationAction(_prevState: unknown, formData: FormData) {
  await requireSuperAdmin()

  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()
  const cnpj = (formData.get('cnpj') as string)?.trim() || null
  const plan = (formData.get('plan') as string) || 'free'

  if (!name || !slug) return { error: 'Nome e slug são obrigatórios.' }
  if (!/^[a-z0-9-]+$/.test(slug)) return { error: 'Slug deve conter apenas letras minúsculas, números e hífens.' }

  try {
    await adminPrisma.organization.create({ data: { name, slug, cnpj, plan } })
  } catch (e: any) {
    if (e.code === 'P2002') return { error: 'Esse slug já está em uso.' }
    return { error: 'Erro ao criar organização.' }
  }

  revalidatePath('/organizations')
  redirect('/organizations')
}

export async function updateOrganizationAction(id: string, _prevState: unknown, formData: FormData) {
  await requireSuperAdmin()

  const name = (formData.get('name') as string)?.trim()
  const cnpj = (formData.get('cnpj') as string)?.trim() || null
  const plan = (formData.get('plan') as string) || 'free'
  const is_active = formData.get('is_active') === '1'

  if (!name) return { error: 'Nome é obrigatório.' }

  try {
    await adminPrisma.organization.update({ where: { id }, data: { name, cnpj, plan, is_active } })
  } catch {
    return { error: 'Erro ao atualizar organização.' }
  }

  revalidatePath('/organizations')
  return { success: 'Organização atualizada.' }
}

export async function toggleOrgStatusAction(id: string, currentStatus: boolean) {
  await requireSuperAdmin()
  await adminPrisma.organization.update({ where: { id }, data: { is_active: !currentStatus } })
  revalidatePath('/organizations')
}
