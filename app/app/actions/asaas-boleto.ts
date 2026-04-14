'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { buildAsaasClient } from '@/app/lib/asaas'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return session.user.orgId as string
}

export async function generateAsaasBoletoAction(_prev: unknown, formData: FormData) {
  const orgId = await requireOrg()

  const empresa_id  = formData.get('empresa_id') as string
  const client_id   = formData.get('client_id') as string
  const description = (formData.get('description') as string)?.trim() || null
  const amount      = parseFloat(formData.get('amount') as string)
  const due_date    = formData.get('due_date') as string
  const notes       = (formData.get('notes') as string)?.trim() || null

  if (!empresa_id || !client_id || !amount || !due_date) {
    return { error: 'Empresa, cliente, valor e vencimento são obrigatórios.' }
  }
  if (amount <= 0) return { error: 'Valor deve ser maior que zero.' }

  // Load empresa with Asaas config
  const empresa = await prisma.empresa.findFirst({
    where: { id: empresa_id, organization_id: orgId },
  })
  if (!empresa) return { error: 'Empresa não encontrada.' }

  // Load client
  const client = await prisma.client.findFirst({
    where: { id: client_id, organization_id: orgId },
  })
  if (!client) return { error: 'Cliente não encontrado.' }

  // Build Asaas client
  let asaas
  try {
    asaas = buildAsaasClient(empresa)
  } catch (e: any) {
    return { error: e.message }
  }

  // Create boleto record first (to get the ID as external reference)
  const boleto = await prisma.boleto.create({
    data: {
      organization_id: orgId,
      client_id,
      empresa_id,
      amount,
      due_date: new Date(due_date),
      description,
      notes,
      status: 'PENDING',
    },
  })

  try {
    // Find or create customer in Asaas
    const asaasCustomerId = await asaas.findOrCreateCustomer({
      name: client.name,
      cpfCnpj: client.cnpj,
      email: client.email,
      phone: client.phone,
      address: client.address_street ?? client.address,
      address_number: client.address_number,
      address_district: client.address_district,
      address_city: client.address_city,
      address_state: client.address_state,
      address_zip: client.address_zip,
    })

    // Create payment in Asaas
    const payment = await asaas.createBoleto({
      customerId: asaasCustomerId,
      value: amount,
      dueDate: due_date,
      description: description ?? `Boleto - ${client.name}`,
      externalReference: boleto.id,
    })

    // Get identification field (linha digitável)
    let digitavel = ''
    let barcode = ''
    try {
      const field = await asaas.getBoletoIdentificationField(payment.id)
      digitavel = field.identificationField
      barcode = field.barCode
    } catch {}

    // Update boleto with Asaas data
    await prisma.boleto.update({
      where: { id: boleto.id },
      data: {
        asaas_id: payment.id,
        asaas_customer_id: asaasCustomerId,
        asaas_barcode: barcode || null,
        asaas_digitavel: digitavel || null,
        asaas_url: payment.bankSlipUrl ?? null,
      },
    })
  } catch (e: any) {
    // Rollback boleto if Asaas fails
    await prisma.boleto.delete({ where: { id: boleto.id } }).catch(() => {})
    return { error: `Erro ao comunicar com Asaas: ${e.message}` }
  }

  revalidatePath('/financeiro/boletos')
  return { success: true, boletoId: boleto.id }
}

export async function listBoletosAction(filters?: {
  status?: string
  empresa_id?: string
}) {
  const orgId = await requireOrg()

  const where: Record<string, unknown> = { organization_id: orgId }
  if (filters?.status) where.status = filters.status
  if (filters?.empresa_id) where.empresa_id = filters.empresa_id

  return prisma.boleto.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, cnpj: true } },
      empresa: { select: { id: true, name: true, cnpj: true } },
    },
    orderBy: { due_date: 'asc' },
  })
}

export async function cancelAsaasBoletoAction(id: string) {
  const orgId = await requireOrg()

  const boleto = await prisma.boleto.findFirst({
    where: { id, organization_id: orgId },
    include: { empresa: true },
  })
  if (!boleto) return { error: 'Boleto não encontrado.' }

  // Cancel in Asaas if has asaas_id
  if (boleto.asaas_id && boleto.empresa) {
    try {
      const asaas = buildAsaasClient(boleto.empresa)
      await asaas.cancelPayment(boleto.asaas_id)
    } catch (e: any) {
      return { error: `Erro ao cancelar no Asaas: ${e.message}` }
    }
  }

  await prisma.boleto.updateMany({
    where: { id, organization_id: orgId },
    data: { status: 'CANCELLED' },
  })

  revalidatePath('/financeiro/boletos')
  return { success: true }
}

export async function markBoletoPaidManualAction(id: string) {
  const orgId = await requireOrg()
  await prisma.boleto.updateMany({
    where: { id, organization_id: orgId },
    data: { status: 'PAID', paid_at: new Date() },
  })
  revalidatePath('/financeiro/boletos')
}
