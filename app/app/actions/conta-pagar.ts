'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireOrg(): Promise<string> {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return session.user.orgId as string
}

export interface ContaPagarFilters {
  status?: string
  empresa_id?: string
  carteira_id?: string
}

export async function listContasPagarAction(filters?: ContaPagarFilters) {
  const orgId = await requireOrg()

  const where: Record<string, unknown> = { organization_id: orgId }
  if (filters?.status && filters.status !== 'ALL') where.status = filters.status
  if (filters?.empresa_id) where.empresa_id = filters.empresa_id
  if (filters?.carteira_id) where.carteira_id = filters.carteira_id

  return prisma.contaPagar.findMany({
    where,
    include: {
      empresa: { select: { id: true, name: true } },
      carteira: { select: { id: true, name: true } },
      categoria: { select: { id: true, name: true, color: true } },
      centro_custo: { select: { id: true, name: true } },
    },
    orderBy: { due_date: 'asc' },
  })
}

export async function createContaPagarAction(_prev: unknown, formData: FormData) {
  const orgId = await requireOrg()

  const title = (formData.get('title') as string)?.trim()
  const empresa_id = (formData.get('empresa_id') as string)?.trim()
  const carteira_id = (formData.get('carteira_id') as string)?.trim()
  const amountRaw = formData.get('amount') as string
  const due_date_raw = formData.get('due_date') as string

  if (!title) return { error: 'Título é obrigatório.' }
  if (!empresa_id) return { error: 'Empresa é obrigatória.' }
  if (!carteira_id) return { error: 'Carteira é obrigatória.' }
  if (!amountRaw || isNaN(parseFloat(amountRaw))) return { error: 'Valor inválido.' }
  if (!due_date_raw) return { error: 'Data de vencimento é obrigatória.' }

  const amount = parseFloat(amountRaw)
  const due_date = new Date(due_date_raw)

  const description = (formData.get('description') as string)?.trim() || null
  const supplier_name = (formData.get('supplier_name') as string)?.trim() || null
  const supplier_doc = (formData.get('supplier_doc') as string)?.trim() || null
  const categoria_id = (formData.get('categoria_id') as string)?.trim() || null
  const centro_custo_id = (formData.get('centro_custo_id') as string)?.trim() || null
  const payment_method = (formData.get('payment_method') as string)?.trim() || null
  const document_number = (formData.get('document_number') as string)?.trim() || null
  const recurrence = (formData.get('recurrence') as string)?.trim() || null
  const recurrence_end_raw = formData.get('recurrence_end') as string
  const recurrence_end = recurrence_end_raw ? new Date(recurrence_end_raw) : null
  const notes = (formData.get('notes') as string)?.trim() || null

  await prisma.contaPagar.create({
    data: {
      organization_id: orgId,
      empresa_id,
      carteira_id,
      title,
      description,
      amount,
      due_date,
      supplier_name,
      supplier_doc,
      categoria_id: categoria_id || null,
      centro_custo_id: centro_custo_id || null,
      payment_method,
      document_number,
      recurrence,
      recurrence_end,
      notes,
      status: 'PENDING',
    },
  })

  revalidatePath('/financeiro/contas-pagar')
  return { success: true }
}

export interface ContaPagarUpdateData {
  title?: string
  empresa_id?: string
  carteira_id?: string
  amount?: number
  due_date?: Date | string
  description?: string | null
  supplier_name?: string | null
  supplier_doc?: string | null
  categoria_id?: string | null
  centro_custo_id?: string | null
  payment_method?: string | null
  document_number?: string | null
  recurrence?: string | null
  recurrence_end?: Date | string | null
  notes?: string | null
  status?: string
}

export async function updateContaPagarAction(
  id: string,
  data: ContaPagarUpdateData,
): Promise<{ error?: string; success?: boolean }> {
  const orgId = await requireOrg()

  const updateData: Record<string, unknown> = { ...data }

  if (data.due_date) updateData.due_date = new Date(data.due_date as string)
  if (data.recurrence_end) updateData.recurrence_end = new Date(data.recurrence_end as string)
  if (data.status === 'PAID' && !updateData.paid_at) updateData.paid_at = new Date()

  await prisma.contaPagar.updateMany({
    where: { id, organization_id: orgId },
    data: updateData,
  })

  revalidatePath('/financeiro/contas-pagar')
  return { success: true }
}

export async function markContaPagarPaidAction(id: string, paid_amount?: number) {
  const orgId = await requireOrg()

  await prisma.contaPagar.updateMany({
    where: { id, organization_id: orgId },
    data: {
      status: 'PAID',
      paid_at: new Date(),
      ...(paid_amount !== undefined ? { paid_amount } : {}),
    },
  })

  revalidatePath('/financeiro/contas-pagar')
  return { success: true }
}

export async function cancelContaPagarAction(id: string) {
  const orgId = await requireOrg()

  await prisma.contaPagar.updateMany({
    where: { id, organization_id: orgId },
    data: { status: 'CANCELLED' },
  })

  revalidatePath('/financeiro/contas-pagar')
  return { success: true }
}

export async function deleteContaPagarAction(id: string) {
  const orgId = await requireOrg()
  await prisma.contaPagar.deleteMany({ where: { id, organization_id: orgId } })
  revalidatePath('/financeiro/contas-pagar')
}
