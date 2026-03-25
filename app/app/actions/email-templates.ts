'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

import { type EmailTemplateRow } from './email-templates-defaults'

export async function listEmailTemplatesAction(): Promise<EmailTemplateRow[]> {
  const session = await auth()
  if (!session?.user?.orgId) return []

  const rows = await prisma.emailTemplate.findMany({
    where:   { organization_id: session.user.orgId },
    orderBy: { created_at: 'asc' },
    select:  { id: true, name: true, subject: true, body: true },
  })
  return rows
}

export async function saveEmailTemplateAction(
  id: string | null,
  name: string,
  subject: string,
  body: string,
): Promise<{ error?: string; id?: string }> {
  const session = await auth()
  if (!session?.user?.orgId) return { error: 'Não autenticado.' }

  const trimName = name.trim()
  if (!trimName) return { error: 'O nome do template é obrigatório.' }
  if (!subject.trim()) return { error: 'O assunto é obrigatório.' }
  if (!body.trim())    return { error: 'O corpo do e-mail é obrigatório.' }

  if (id) {
    await prisma.emailTemplate.update({
      where: { id },
      data:  { name: trimName, subject, body },
    })
    revalidatePath('/settings/email')
    return { id }
  }

  // Check for duplicate name within org
  const exists = await prisma.emailTemplate.findFirst({
    where: { organization_id: session.user.orgId, name: trimName },
  })
  if (exists) return { error: `Já existe um template com o nome "${trimName}".` }

  const created = await prisma.emailTemplate.create({
    data: {
      organization_id: session.user.orgId,
      name: trimName,
      subject,
      body,
    },
  })
  revalidatePath('/settings/email')
  return { id: created.id }
}

export async function deleteEmailTemplateAction(id: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.orgId) return { error: 'Não autenticado.' }

  const tpl = await prisma.emailTemplate.findFirst({
    where: { id, organization_id: session.user.orgId },
  })
  if (!tpl) return { error: 'Template não encontrado.' }

  await prisma.emailTemplate.delete({ where: { id } })
  revalidatePath('/settings/email')
  return {}
}
