'use server'

import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireOrg(): Promise<string> {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return session.user.orgId as string
}

export interface ClientUpdateData {
  name:               string
  trade_name:         string
  email:              string
  email_boleto:       string
  phone:              string
  address_street:     string
  address_number:     string
  address_complement: string
  address_district:   string
  address_city:       string
  address_state:      string
  address_zip:        string
}

export async function createClientAction(
  data: ClientUpdateData & { cnpj: string },
): Promise<{ error?: string }> {
  const orgId = await requireOrg()

  const cnpjRaw = data.cnpj.replace(/\D/g, '')
  if (!data.name?.trim()) return { error: 'Razão Social é obrigatória.' }
  if (cnpjRaw.length !== 11 && cnpjRaw.length !== 14) return { error: 'CPF/CNPJ inválido. Informe 11 dígitos (CPF) ou 14 dígitos (CNPJ).' }

  const existing = await adminPrisma.client.findFirst({
    where: { organization_id: orgId, cnpj: cnpjRaw },
  })
  if (existing) return { error: 'Este CPF/CNPJ já está cadastrado.' }

  await adminPrisma.client.create({
    data: {
      organization_id: orgId,
      cnpj:               cnpjRaw,
      name:               data.name.trim(),
      trade_name:         data.trade_name         || null,
      email:              data.email              || null,
      email_boleto:       data.email_boleto       || null,
      phone:              data.phone              || null,
      address_street:     data.address_street     || null,
      address_number:     data.address_number     || null,
      address_complement: data.address_complement || null,
      address_district:   data.address_district   || null,
      address_city:       data.address_city       || null,
      address_state:      data.address_state      || null,
      address_zip:        data.address_zip        || null,
    },
  })

  revalidatePath('/clients')
  return {}
}

export async function updateClientAction(
  clientId: string,
  data: ClientUpdateData,
): Promise<{ error?: string }> {
  const orgId = await requireOrg()

  await adminPrisma.client.update({
    where: { id: clientId, organization_id: orgId },
    data: {
      name:               data.name,
      trade_name:         data.trade_name         || null,
      email:              data.email              || null,
      email_boleto:       data.email_boleto       || null,
      phone:              data.phone              || null,
      address_street:     data.address_street     || null,
      address_number:     data.address_number     || null,
      address_complement: data.address_complement || null,
      address_district:   data.address_district   || null,
      address_city:       data.address_city       || null,
      address_state:      data.address_state      || null,
      address_zip:        data.address_zip        || null,
    },
  })

  revalidatePath('/clients')
  return {}
}
