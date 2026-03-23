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

export async function updateOrganizationDadosAction(id: string, _prevState: unknown, formData: FormData) {
  await requireSuperAdmin()

  const name = (formData.get('name') as string)?.trim()
  const cnpj = (formData.get('cnpj') as string)?.trim() || null
  const plan = (formData.get('plan') as string) || 'free'
  const is_active = formData.get('is_active') === '1'
  const billing_email = (formData.get('billing_email') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!name) return { error: 'Nome é obrigatório.' }

  try {
    await adminPrisma.organization.update({
      where: { id },
      data: { name, cnpj, plan, is_active, billing_email, notes },
    })
  } catch {
    return { error: 'Erro ao atualizar organização.' }
  }

  revalidatePath(`/organizations/${id}`)
  return { success: 'Dados atualizados com sucesso.' }
}

export async function updateOrganizationAssinaturaAction(id: string, _prevState: unknown, formData: FormData) {
  await requireSuperAdmin()

  const subscription_status = formData.get('subscription_status') as string
  const trial_ends_at = formData.get('trial_ends_at') as string
  const subscription_ends_at = formData.get('subscription_ends_at') as string

  try {
    await adminPrisma.organization.update({
      where: { id },
      data: {
        subscription_status: subscription_status as any,
        trial_ends_at: trial_ends_at ? new Date(trial_ends_at) : null,
        subscription_ends_at: subscription_ends_at ? new Date(subscription_ends_at) : null,
      },
    })
  } catch {
    return { error: 'Erro ao atualizar assinatura.' }
  }

  revalidatePath(`/organizations/${id}`)
  return { success: 'Assinatura atualizada com sucesso.' }
}

export async function updateOrganizationAction(id: string, _prevState: unknown, formData: FormData) {
  return updateOrganizationDadosAction(id, _prevState, formData)
}

export async function toggleOrgStatusAction(id: string, currentStatus: boolean) {
  await requireSuperAdmin()
  await adminPrisma.organization.update({ where: { id }, data: { is_active: !currentStatus } })
  revalidatePath('/organizations')
}
