'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) throw new Error('Não autenticado')
  return session.user.orgId!
}

export interface TechSheetData {
  remoteAccess: string; remoteTool: string; remoteId: string; remotePassword: string; remoteNotes: string
  network:      string; gateway: string; dnsPrimary: string; dhcpRange: string; networkNotes: string
  software:     string; softwareNotes: string
  contacts:     string; contactName: string; contactRole: string; contactPhone: string; contactEmail: string
  notes:        string
  additionalInfo: string
}

export interface TechSheet extends TechSheetData {
  id:        string
  clientId:  string
  clientName: string
  clientCnpj: string
  createdAt:     string
  updatedAt:     string
  updatedByName: string | null
  updatedById:   string | null
}

export interface ClientWithSheet {
  id:             string
  name:           string
  cnpj:           string
  hasSheet:       boolean
  status:         string
  remoteTool:     string | null
  remoteId:       string | null
  gateway:        string | null
  contactName:    string | null
  contactRole:    string | null
  sheetUpdatedAt: string | null
}

function mapSheet(sheet: any, client: { id: string; name: string; cnpj: string }): TechSheet {
  return {
    id:             sheet.id,
    clientId:       client.id,
    clientName:     client.name,
    clientCnpj:     client.cnpj,
    remoteAccess:   '',
    remoteTool:     sheet.remote_tool      ?? '',
    remoteId:       sheet.remote_id        ?? '',
    remotePassword: sheet.remote_password  ?? '',
    remoteNotes:    sheet.remote_notes     ?? '',
    network:        '',
    gateway:        sheet.gateway          ?? '',
    dnsPrimary:     sheet.dns_primary      ?? '',
    dhcpRange:      sheet.dhcp_range       ?? '',
    networkNotes:   sheet.network_notes    ?? '',
    software:       '',
    softwareNotes:  sheet.software_notes   ?? '',
    contacts:       '',
    contactName:    sheet.contact_name     ?? '',
    contactRole:    sheet.contact_role     ?? '',
    contactPhone:   sheet.contact_phone    ?? '',
    contactEmail:   sheet.contact_email    ?? '',
    notes:          sheet.notes            ?? '',
    additionalInfo: sheet.additional_info  ?? '',
    createdAt:      sheet.created_at.toISOString(),
    updatedAt:      sheet.updated_at.toISOString(),
    updatedByName:  sheet.updated_by_name  ?? null,
    updatedById:    sheet.updated_by_id    ?? null,
  }
}

export async function listTechSheetsAction(): Promise<ClientWithSheet[]> {
  const orgId = await requireOrg()
  const clients = await prisma.client.findMany({
    where:   { organization_id: orgId, tech_sheet: { isNot: null } },
    select:  {
      id: true, name: true, cnpj: true,
      tech_sheet: {
        select: { id: true, remote_tool: true, remote_id: true, gateway: true, contact_name: true, contact_role: true, updated_at: true, status: true },
      },
    },
    orderBy: { name: 'asc' },
  })
  return clients.map(c => ({
    id:             c.id,
    name:           c.name,
    cnpj:           c.cnpj,
    hasSheet:       true,
    status:         c.tech_sheet?.status       ?? 'ACTIVE',
    remoteTool:     c.tech_sheet?.remote_tool  ?? null,
    remoteId:       c.tech_sheet?.remote_id    ?? null,
    gateway:        c.tech_sheet?.gateway      ?? null,
    contactName:    c.tech_sheet?.contact_name ?? null,
    contactRole:    c.tech_sheet?.contact_role ?? null,
    sheetUpdatedAt: c.tech_sheet?.updated_at?.toISOString() ?? null,
  }))
}

export async function getTechSheetAction(clientId: string): Promise<TechSheet> {
  const orgId = await requireOrg()
  const client = await prisma.client.findFirst({
    where: { id: clientId, organization_id: orgId },
    select: { id: true, name: true, cnpj: true },
  })
  if (!client) throw new Error('Cliente não encontrado')

  const sheet = await prisma.clientTechSheet.findUnique({ where: { client_id: clientId } })
  if (!sheet) throw new Error('Ficha técnica não encontrada')
  return mapSheet(sheet, client)
}

export async function saveTechSheetAction(clientId: string, data: Partial<TechSheetData>) {
  const session = await auth()
  if (!session?.user?.orgId) throw new Error('Não autenticado')
  const orgId = session.user.orgId!
  const client = await prisma.client.findFirst({
    where: { id: clientId, organization_id: orgId }, select: { id: true },
  })
  if (!client) throw new Error('Cliente não encontrado')

  const updatedByName = session.user.name ?? session.user.email ?? null
  const updatedById   = session.user.id ?? null

  await prisma.clientTechSheet.upsert({
    where:  { client_id: clientId },
    create: {
      organization_id: orgId,
      client_id:       clientId,
      remote_tool:     data.remoteTool    ?? null,
      remote_id:       data.remoteId      ?? null,
      remote_password: data.remotePassword ?? null,
      remote_notes:    data.remoteNotes   ?? null,
      gateway:         data.gateway       ?? null,
      dns_primary:     data.dnsPrimary    ?? null,
      dhcp_range:      data.dhcpRange     ?? null,
      network_notes:   data.networkNotes  ?? null,
      software_notes:  data.softwareNotes ?? null,
      contact_name:    data.contactName   ?? null,
      contact_role:    data.contactRole   ?? null,
      contact_phone:   data.contactPhone  ?? null,
      contact_email:   data.contactEmail  ?? null,
      notes:           data.notes         ?? null,
      additional_info: data.additionalInfo ?? null,
      updated_by_name: updatedByName,
      updated_by_id:   updatedById,
    },
    update: {
      remote_tool:     data.remoteTool,
      remote_id:       data.remoteId,
      remote_password: data.remotePassword,
      remote_notes:    data.remoteNotes,
      gateway:         data.gateway,
      dns_primary:     data.dnsPrimary,
      dhcp_range:      data.dhcpRange,
      network_notes:   data.networkNotes,
      software_notes:  data.softwareNotes,
      contact_name:    data.contactName,
      contact_role:    data.contactRole,
      contact_phone:   data.contactPhone,
      contact_email:   data.contactEmail,
      notes:           data.notes,
      additional_info: data.additionalInfo,
      updated_by_name: updatedByName,
      updated_by_id:   updatedById,
      updated_at:      new Date(),
    },
  })
  revalidatePath('/tickets/fichas')
  return { ok: true }
}

export async function deleteTechSheetAction(clientId: string) {
  const orgId = await requireOrg()
  await prisma.clientTechSheet.deleteMany({
    where: { client_id: clientId, organization_id: orgId },
  })
  revalidatePath('/tickets/fichas')
  return { ok: true }
}
