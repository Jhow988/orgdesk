'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) throw new Error('Não autenticado')
  return { orgId: session.user.orgId!, userId: session.user.id! }
}

// ─── Fetch all clients for modal cache ─────────────────────────────────────────

export async function fetchAllClientsAction() {
  const { orgId } = await requireOrg()
  return prisma.client.findMany({
    where:   { organization_id: orgId, is_active: true },
    select:  { id: true, name: true, cnpj: true },
    orderBy: { name: 'asc' },
  })
}

// ─── List ──────────────────────────────────────────────────────────────────────

const TICKETS_PER_PAGE = 25

export async function listTicketsAction(params?: {
  page?:     number
  status?:   string
  priority?: string
  search?:   string
}) {
  const { orgId } = await requireOrg()

  const page  = Math.max(1, params?.page ?? 1)
  const skip  = (page - 1) * TICKETS_PER_PAGE

  const where: Record<string, unknown> = { organization_id: orgId }
  if (params?.status   && params.status   !== 'all') where.status   = params.status
  if (params?.priority && params.priority !== 'all') where.priority = params.priority
  if (params?.search) {
    const q   = params.search.trim()
    const num = parseInt(q)
    const or: object[] = [
      { title:  { contains: q, mode: 'insensitive' } },
      { client: { name: { contains: q, mode: 'insensitive' } } },
    ]
    if (!isNaN(num)) or.push({ number: num })
    where.OR = or
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where:   where as any,
      orderBy: { created_at: 'desc' },
      take:    TICKETS_PER_PAGE,
      skip,
      include: {
        client:   { select: { id: true, name: true, cnpj: true } },
        assignee: { select: { id: true, name: true } },
        messages: { select: { id: true }, where: { is_internal: false } },
      },
    }),
    prisma.ticket.count({ where: where as any }),
  ])

  return {
    tickets: tickets.map(t => ({
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
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / TICKETS_PER_PAGE)),
  }
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export async function getTicketStatsAction() {
  const { orgId } = await requireOrg()

  // Uma única query GROUP BY no lugar de 5 COUNTs separados
  const rows = await prisma.$queryRaw<{ status: string; count: bigint }[]>`
    SELECT status, COUNT(*) AS count
    FROM tickets
    WHERE organization_id = ${orgId}
    GROUP BY status
  `

  const byStatus = Object.fromEntries(rows.map(r => [r.status, Number(r.count)]))

  return {
    total:        rows.reduce((sum, r) => sum + Number(r.count), 0),
    open:         byStatus['OPEN']           ?? 0,
    inProgress:   byStatus['IN_PROGRESS']    ?? 0,
    waitingClient: byStatus['WAITING_CLIENT'] ?? 0,
    resolved:     byStatus['RESOLVED']       ?? 0,
  }
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
    messages: ticket.messages.map(m => {
      let authorName = 'Equipe'
      if (m.author_type === 'client') {
        authorName = ticket.client.name
      } else {
        const member = orgMembers.find(mb => mb.user.id === m.author_id)
        authorName = member?.user.name ?? member?.user.email ?? 'Equipe'
      }
      return {
        id:         m.id,
        body:       m.body,
        isInternal: m.is_internal,
        isAuto:     m.is_auto,
        authorName,
        authorType: m.author_type,
        createdAt:  m.created_at.toISOString(),
      }
    }),
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

  // Usa transação com lock na org para evitar race condition no número do ticket
  const ticket = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${orgId} FOR UPDATE`

    const last = await tx.ticket.findFirst({
      where:   { organization_id: orgId },
      orderBy: { number: 'desc' },
      select:  { number: true },
    })
    const number = (last?.number ?? 0) + 1

    return tx.ticket.create({
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
