'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

async function requireOrgAdmin() {
  const session = await auth()
  if (!session?.user?.orgId) throw new Error('Não autenticado.')
  if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role)) throw new Error('Sem permissão.')
  return { orgId: session.user.orgId, userId: session.user.id }
}

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN:   'Administrador',
  ORG_FINANCE: 'Financeiro',
  ORG_SUPPORT: 'Suporte',
}

export async function listOrgUsersAction() {
  const session = await auth()
  if (!session?.user?.orgId) return []

  const memberships = await prisma.membership.findMany({
    where:   { organization_id: session.user.orgId },
    include: { user: { select: { id: true, name: true, email: true, is_active: true, last_login_at: true, created_at: true } } },
    orderBy: { created_at: 'asc' },
  })

  return memberships.map(m => ({
    membership_id: m.id,
    user_id:       m.user.id,
    name:          m.user.name,
    email:         m.user.email,
    role:          m.role as string,
    role_label:    ROLE_LABELS[m.role] ?? m.role,
    is_active:     m.user.is_active,
    last_login_at: m.user.last_login_at?.toISOString() ?? null,
    created_at:    m.user.created_at.toISOString(),
  }))
}

export async function createUserAction(
  name: string,
  email: string,
  password: string,
  role: string,
): Promise<{ error?: string }> {
  const { orgId } = await requireOrgAdmin()

  if (!name.trim())  return { error: 'Nome é obrigatório.' }
  if (!email.trim()) return { error: 'E-mail é obrigatório.' }
  if (password.length < 6) return { error: 'Senha deve ter ao menos 6 caracteres.' }
  if (!['ORG_ADMIN', 'ORG_FINANCE', 'ORG_SUPPORT'].includes(role)) {
    return { error: 'Perfil inválido.' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // User exists — just add membership if not already in this org
    const alreadyMember = await prisma.membership.findUnique({
      where: { user_id_organization_id: { user_id: existing.id, organization_id: orgId } },
    })
    if (alreadyMember) return { error: 'Este e-mail já está cadastrado na organização.' }

    await prisma.membership.create({
      data: { user_id: existing.id, organization_id: orgId, role: role as any },
    })
    revalidatePath('/users')
    return {}
  }

  const password_hash = await bcrypt.hash(password, 12)

  await prisma.$transaction(async tx => {
    const user = await tx.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), password_hash, role: role as any },
    })
    await tx.membership.create({
      data: { user_id: user.id, organization_id: orgId, role: role as any },
    })
  })

  revalidatePath('/users')
  return {}
}

export async function updateUserAction(
  userId: string,
  name: string,
  role: string,
  newPassword?: string,
): Promise<{ error?: string }> {
  const { orgId } = await requireOrgAdmin()

  if (!name.trim()) return { error: 'Nome é obrigatório.' }
  if (!['ORG_ADMIN', 'ORG_FINANCE', 'ORG_SUPPORT'].includes(role)) {
    return { error: 'Perfil inválido.' }
  }

  // Confirm user belongs to this org
  const membership = await prisma.membership.findFirst({
    where: { user_id: userId, organization_id: orgId },
  })
  if (!membership) return { error: 'Usuário não encontrado.' }

  const userUpdate: any = { name: name.trim() }
  if (newPassword) {
    if (newPassword.length < 6) return { error: 'Nova senha deve ter ao menos 6 caracteres.' }
    userUpdate.password_hash = await bcrypt.hash(newPassword, 12)
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: userUpdate }),
    prisma.membership.update({ where: { id: membership.id }, data: { role: role as any } }),
  ])

  revalidatePath('/users')
  return {}
}

export async function toggleUserAction(userId: string): Promise<{ error?: string }> {
  const { orgId, userId: currentUserId } = await requireOrgAdmin()

  if (userId === currentUserId) return { error: 'Você não pode desativar sua própria conta.' }

  const membership = await prisma.membership.findFirst({
    where: { user_id: userId, organization_id: orgId },
  })
  if (!membership) return { error: 'Usuário não encontrado.' }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { is_active: true } })
  if (!user) return { error: 'Usuário não encontrado.' }

  await prisma.user.update({ where: { id: userId }, data: { is_active: !user.is_active } })
  revalidatePath('/users')
  return {}
}
