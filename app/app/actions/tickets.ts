'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) throw new Error('Não autenticado')
  return { orgId: session.user.orgId!, userId: session.user.id! }
}

// ─── Search clients ────────────────────────────────────────────────────────────

export async function searchClientsAction(q: string) {
  const { orgId } = await requireOrg()
  if (!q || q.trim().length < 3) return []

  const term = q.trim()
  const rows = await prisma.$queryRaw<{ id: string; name: string; cnpj: string }[]>`
    SELECT id, name, cnpj FROM clients
    WHERE organization_id = ${orgId}
      AND is_active = true
      AND (
        name ILIKE ${term + '%'}
        OR cnpj ILIKE ${term + '%'}
        OR cnpj LIKE ${term.replace(/\D/g, '') + '%'}
      )
    ORDER BY name ASC
    LIMIT 60
  `
  return rows
}

// ─── List ──────────────────────────────────────────────────────────────────────

export async function listTicketsAction(filters?: {
  status?:   string
  priority?: string
}) {
  const { orgId } = await requireOrg()

  const where: Record<string, unknown> = { organization_id: orgId }
  if (filters?.status)   where.status   = filters.status
  if (filters?.priority) where.priority = filters.priority

  const tickets = await prisma.ticket.findMany({
    where:   where as any,
    orderBy: { created_at: 'desc' },
    include: {
      client:   { select: { id: true, name: true, cnpj: true } },
      assignee: { select: { id: true, name: true } },
      messages: { select: { id: true }, where: { is_internal: false } },
    },
  })

  return tickets.map(t => ({
    id:           t.id,
    number:       t.number,
    title:        t.title,
    status:       t.status as string,
    priority:     t.priority as string,
    category:     t.category,
    clientName:   t.client.name,
    clientCnpj:   t.client.cnpj,
    clientId:     t.client.id,
    assigneeName: t.assignee?.name ?? null,
    messageCount: t.messages.length,
    createdAt:    t.created_at.toISOString(),
    updatedAt:    t.updated_at.toISOString(),
    resolvedAt:   t.resolved_at?.toISOString() ?? null,
  }))
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export async function getTicketStatsAction() {
  const { orgId } = await requireOrg()

  const [total, open, inProgress, waitingClient, resolved] = await Promise.all([
    prisma.ticket.count({ where: { organization_id: orgId } }),
    prisma.ticket.count({ where: { organization_id: orgId, status: 'OPEN' } }),
    prisma.ticket.count({ where: { organization_id: orgId, status: 'IN_PROGRESS' } }),
    prisma.ticket.count({ where: { organization_id: orgId, status: 'WAITING_CLIENT' } }),
    prisma.ticket.count({ where: { organization_id: orgId, status: 'RESOLVED' } }),
  ])

  return { total, open, inProgress, waitingClient, resolved }
}

// ─── Detail ────────────────────────────────────────────────────────────────────

export async function getTicketAction(id: string) {
  const { orgId } = await requireOrg()

  const [ticket, orgMembers] = await Promise.all([
    prisma.ticket.findFirst({
      where:   { id, organization_id: orgId },
      include: {
        client:   { select: { id: true, name: true, cnpj: true, email: true, phone: true } },
        assignee: { select: { id: true, name: true } },
        messages: {
          orderBy: { created_at: 'asc' },
          include: { author: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    prisma.membership.findMany({
      where:   { organization_id: orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ])

  if (!ticket) return null

  return {
    id:          ticket.id,
    number:      ticket.number,
    title:       ticket.title,
    status:      ticket.status as string,
    priority:    ticket.priority as string,
    category:    ticket.category,
    resolvedAt:  ticket.resolved_at?.toISOString() ?? null,
    closedAt:    ticket.closed_at?.toISOString() ?? null,
    createdAt:   ticket.created_at.toISOString(),
    updatedAt:   ticket.updated_at.toISOString(),
    client: {
      id:    ticket.client.id,
      name:  ticket.client.name,
      cnpj:  ticket.client.cnpj,
      email: ticket.client.email ?? '',
      phone: ticket.client.phone ?? '',
    },
    assignee: ticket.assignee
      ? { id: ticket.assignee.id, name: ticket.assignee.name ?? '' }
      : null,
    messages: ticket.messages.map(m => ({
      id:         m.id,
      body:       m.body,
      isInternal: m.is_internal,
      isAuto:     m.is_auto,
      authorName: m.author.name ?? m.author.email ?? 'Equipe',
      authorType: m.author_type,
      createdAt:  m.created_at.toISOString(),
    })),
    orgMembers: orgMembers.map(m => ({
      id:   m.user.id,
      name: m.user.name ?? m.user.email ?? '',
    })),
  }
}

// ─── Create ────────────────────────────────────────────────────────────────────

export async function createTicketAction(data: {
  clientId:   string
  title:      string
  body:       string
  priority:   string
  category?:  string
}) {
  const { orgId, userId } = await requireOrg()

  const last = await prisma.ticket.findFirst({
    where:   { organization_id: orgId },
    orderBy: { number: 'desc' },
    select:  { number: true },
  })
  const number = (last?.number ?? 0) + 1

  const ticket = await prisma.ticket.create({
    data: {
      organization_id: orgId,
      number,
      client_id:       data.clientId,
      opened_by:       userId,
      opened_by_type:  'user',
      title:           data.title,
      priority:        data.priority as any,
      category:        data.category || null,
      messages: {
        create: {
          author_id:   userId,
          author_type: 'user',
          body:        data.body,
        },
      },
    },
  })

  revalidatePath('/tickets')
  return { id: ticket.id, number: ticket.number }
}

// ─── Reply ─────────────────────────────────────────────────────────────────────

export async function addTicketReplyAction(
  ticketId:   string,
  body:       string,
  isInternal: boolean,
) {
  const { orgId, userId } = await requireOrg()

  const ticket = await prisma.ticket.findFirst({
    where:  { id: ticketId, organization_id: orgId },
    select: { id: true, status: true },
  })
  if (!ticket) throw new Error('Chamado não encontrado')

  const newStatus =
    ticket.status === 'WAITING_CLIENT' && !isInternal ? 'IN_PROGRESS' : ticket.status

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticket_id:   ticketId,
        author_id:   userId,
        author_type: 'user',
        body,
        is_internal: isInternal,
      },
    }),
    prisma.ticket.update({
      where: { id: ticketId },
      data:  { status: newStatus as any },
    }),
  ])

  revalidatePath(`/tickets/${ticketId}`)
  return { ok: true }
}

// ─── Update status / priority / assignee ───────────────────────────────────────

export async function updateTicketStatusAction(ticketId: string, status: string) {
  const { orgId } = await requireOrg()

  const data: Record<string, unknown> = { status }
  if (status === 'RESOLVED') data.resolved_at = new Date()
  if (status === 'CLOSED')   data.closed_at   = new Date()

  await prisma.ticket.updateMany({
    where: { id: ticketId, organization_id: orgId },
    data:  data as any,
  })

  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath('/tickets')
  return { ok: true }
}

export async function updateTicketPriorityAction(ticketId: string, priority: string) {
  const { orgId } = await requireOrg()

  await prisma.ticket.updateMany({
    where: { id: ticketId, organization_id: orgId },
    data:  { priority: priority as any },
  })

  revalidatePath(`/tickets/${ticketId}`)
  return { ok: true }
}

export async function assignTicketAction(ticketId: string, userId: string | null) {
  const { orgId } = await requireOrg()

  await prisma.ticket.updateMany({
    where: { id: ticketId, organization_id: orgId },
    data:  { assigned_to: userId },
  })

  revalidatePath(`/tickets/${ticketId}`)
  return { ok: true }
}
