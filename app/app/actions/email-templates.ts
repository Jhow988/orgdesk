'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export const DEFAULT_SUBJECT = 'Nota Fiscal - {mes_ano}'

export const DEFAULT_BODY = `Prezado(a) {nome_cliente},

Segue em anexo sua Nota Fiscal referente ao período {mes_ano}.
Caso esteja cadastrado, segue em anexo seu boleto referente ao mesmo mês.

A partir do mês de março de 2026, todos os boletos não terão acréscimos de juros, caso venham a passar a data de vencimento. Entendemos que imprevistos podem acontecer e acreditamos assim melhorar ainda mais nossa parceria.

Se desejar cadastrar nosso PIX para futuros pagamentos, seguem os dados:

BANCO INTER
ALLAN CORREA DA SILVA
PIX/CNPJ: 24.347.456/0001-90

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Jhonatan Oliveira
WhatsApp: (12) 98868-7056
Departamento Financeiro
Syall Soluções
financeiro@syall.com.br`

export interface EmailTemplateRow {
  id:      string
  name:    string
  subject: string
  body:    string
}

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
