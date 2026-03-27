'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) throw new Error('Não autenticado')
  return session.user.orgId!
}

export interface TechSheet {
  id:            string
  clientId:      string
  clientName:    string
  clientCnpj:    string
  remoteAccess:  string
  network:       string
  software:      string
  contacts:      string
  notes:         string
  updatedAt:     string
}

// List all clients with info on whether they have a sheet
export async function listTechSheetsAction() {
  const orgId = await requireOrg()

  const clients = await prisma.client.findMany({
    where:   { organization_id: orgId },
    select:  {
      id: true, name: true, cnpj: true,
      tech_sheet: { select: { id: true, updated_at: true } },
    },
    orderBy: { name: 'asc' },
  })

  return clients.map(c => ({
    id:         c.id,
    name:       c.name,
    cnpj:       c.cnpj,
    hasSheet:   !!c.tech_sheet,
    sheetUpdatedAt: c.tech_sheet?.updated_at?.toISOString() ?? null,
  }))
}

// Get a single client's tech sheet (creates empty if not exists)
export async function getTechSheetAction(clientId: string): Promise<TechSheet> {
  const orgId = await requireOrg()

  // Verify client belongs to org
  const client = await prisma.client.findFirst({
    where: { id: clientId, organization_id: orgId },
    select: { id: true, name: true, cnpj: true },
  })
  if (!client) throw new Error('Cliente não encontrado')

  const sheet = await prisma.clientTechSheet.upsert({
    where:  { client_id: clientId },
    create: { organization_id: orgId, client_id: clientId },
    update: {},
  })

  return {
    id:           sheet.id,
    clientId:     client.id,
    clientName:   client.name,
    clientCnpj:   client.cnpj,
    remoteAccess: sheet.remote_access ?? '',
    network:      sheet.network ?? '',
    software:     sheet.software ?? '',
    contacts:     sheet.contacts ?? '',
    notes:        sheet.notes ?? '',
    updatedAt:    sheet.updated_at.toISOString(),
  }
}

// Save tech sheet fields
export async function saveTechSheetAction(
  clientId: string,
  data: {
    remoteAccess?: string
    network?:      string
    software?:     string
    contacts?:     string
    notes?:        string
  },
) {
  const orgId = await requireOrg()

  const client = await prisma.client.findFirst({
    where: { id: clientId, organization_id: orgId },
    select: { id: true },
  })
  if (!client) throw new Error('Cliente não encontrado')

  await prisma.clientTechSheet.upsert({
    where:  { client_id: clientId },
    create: {
      organization_id: orgId,
      client_id:       clientId,
      remote_access:   data.remoteAccess ?? '',
      network:         data.network      ?? '',
      software:        data.software     ?? '',
      contacts:        data.contacts     ?? '',
      notes:           data.notes        ?? '',
    },
    update: {
      remote_access: data.remoteAccess,
      network:       data.network,
      software:      data.software,
      contacts:      data.contacts,
      notes:         data.notes,
      updated_at:    new Date(),
    },
  })

  revalidatePath('/tickets/fichas')
  return { ok: true }
}
