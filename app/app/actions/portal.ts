'use server'

import { adminPrisma } from '@/lib/prisma'

interface Send {
  id:            string
  campaignId:    string
  campaignLabel: string
  nf_pages:      number[]
  boleto_pages:  number[]
  sent_at:       string | null
}

export interface PortalTicketMessage {
  id:         string
  body:       string
  authorType: string   // 'user' | 'client'
  createdAt:  string
}

export interface PortalTicket {
  id:        string
  number:    number
  title:     string
  category:  string | null
  status:    string
  priority:  string
  createdAt: string
  updatedAt: string
  messages:  PortalTicketMessage[]
}

export interface PortalArticle {
  id:        string
  title:     string
  category:  string | null
  content:   string
  updatedAt: string
}

export interface PortalData {
  clientId:   string
  clientName: string
  clientCnpj: string
  orgId:      string
  sends:      Send[]
  tickets:    PortalTicket[]
  articles:   PortalArticle[]
}

function fmtCnpj(d: string) {
  return d.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(d)
}

// ─── Verify portal access ─────────────────────────────────────────────────────

export async function verifyPortalAccessAction(
  token: string,
  email: string,
  cnpj:  string,
): Promise<{ data?: PortalData; error?: string }> {
  if (!token || !email || !cnpj) return { error: 'Preencha todos os campos.' }

  type ClientRow = {
    id: string; name: string; cnpj: string; organization_id: string;
    email: string | null; email_nfe: string | null; email_boleto: string | null;
  }

  const rows = await adminPrisma.$queryRaw<ClientRow[]>`
    SELECT id, name, cnpj, organization_id, email, email_nfe, email_boleto
    FROM clients
    WHERE portal_token = ${token}
    LIMIT 1
  `

  const client = rows[0] ?? null
  if (!client) return { error: 'Link inválido ou expirado.' }

  const cnpjDigits    = cnpj.replace(/\D/g, '')
  const clientCnpjRaw = client.cnpj.replace(/\D/g, '')
  if (clientCnpjRaw !== cnpjDigits) return { error: 'E-mail ou CNPJ incorreto.' }

  const emailsCadastro = [client.email, client.email_nfe, client.email_boleto]
    .filter(Boolean).map(e => e!.toLowerCase().trim())
  const emailInput = email.toLowerCase().trim()
  if (emailsCadastro.length === 0 || !emailsCadastro.includes(emailInput)) {
    return { error: 'E-mail ou CNPJ incorreto.' }
  }

  // Record portal access
  await adminPrisma.$executeRaw`
    UPDATE clients SET last_portal_access = NOW() WHERE portal_token = ${token}
  `

  // Fetch sends
  const allSends = await adminPrisma.campaignSend.findMany({
    where:   { client_cnpj: cnpjDigits },
    orderBy: { created_at: 'desc' },
    include: { campaign: { select: { id: true, label: true } } },
  })

  const sends: Send[] = allSends.map(s => ({
    id:            s.id,
    campaignId:    s.campaign.id,
    campaignLabel: s.campaign.label,
    nf_pages:      s.nf_pages as number[],
    boleto_pages:  s.boleto_pages as number[],
    sent_at:       s.sent_at
      ? new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          timeZone: 'America/Sao_Paulo',
        }).format(s.sent_at)
      : null,
  }))

  // Fetch public knowledge articles for this org
  const rawArticles = await adminPrisma.knowledgeArticle.findMany({
    where:   { organization_id: client.organization_id, visibility: 'PUBLIC', status: 'PUBLISHED' } as any,
    orderBy: [{ category: 'asc' }, { updated_at: 'desc' }],
    select:  { id: true, title: true, category: true, content: true, updated_at: true },
  })

  const articles: PortalArticle[] = rawArticles.map((a: any) => ({
    id:        a.id,
    title:     a.title,
    category:  a.category,
    content:   a.content,
    updatedAt: new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(a.updated_at),
  }))

  // Fetch tickets (public messages only)
  const rawTickets = await adminPrisma.ticket.findMany({
    where:   { client_id: client.id },
    orderBy: { updated_at: 'desc' },
    include: {
      messages: {
        where:   { is_internal: false },
        orderBy: { created_at: 'asc' },
      },
    },
  })

  const tickets: PortalTicket[] = rawTickets.map(t => ({
    id:       t.id,
    number:   t.number,
    title:    t.title,
    category: t.category,
    status:   t.status as string,
    priority: t.priority as string,
    createdAt: fmtDate(t.created_at),
    updatedAt: fmtDate(t.updated_at),
    messages:  t.messages.map(m => ({
      id:         m.id,
      body:       m.body,
      authorType: m.author_type,
      createdAt:  fmtDate(m.created_at),
    })),
  }))

  return {
    data: {
      clientId:   client.id,
      clientName: client.name,
      clientCnpj: fmtCnpj(clientCnpjRaw),
      orgId:      client.organization_id,
      sends,
      tickets,
      articles,
    },
  }
}

// ─── Create ticket from portal ────────────────────────────────────────────────

export async function createPortalTicketAction(
  token:    string,
  clientId: string,
  title:    string,
  body:     string,
  category?: string,
  priority?: string,
): Promise<{ ticketId?: string; error?: string }> {
  if (!title.trim() || !body.trim()) return { error: 'Preencha título e descrição.' }

  // Verify token still belongs to this client
  const rows = await adminPrisma.$queryRaw<{ id: string; organization_id: string }[]>`
    SELECT id, organization_id FROM clients WHERE portal_token = ${token} AND id = ${clientId} LIMIT 1
  `
  const client = rows[0]
  if (!client) return { error: 'Sessão inválida.' }

  // Next ticket number for this org
  const last = await adminPrisma.ticket.findFirst({
    where:   { organization_id: client.organization_id },
    orderBy: { number: 'desc' },
    select:  { number: true },
  })
  const nextNumber = (last?.number ?? 0) + 1

  const ticket = await adminPrisma.ticket.create({
    data: {
      organization_id: client.organization_id,
      number:          nextNumber,
      client_id:       clientId,
      opened_by:       clientId,
      opened_by_type:  'client',
      title:           title.trim(),
      category:        category?.trim() || null,
      status:          'OPEN',
      priority:        (priority ?? 'MEDIUM') as any,
    },
  })

  // First message
  await adminPrisma.ticketMessage.create({
    data: {
      ticket_id:   ticket.id,
      author_id:   clientId,
      author_type: 'client',
      body:        body.trim(),
      is_internal: false,
    },
  })

  return { ticketId: ticket.id }
}

// ─── Add message from portal ──────────────────────────────────────────────────

export async function addPortalMessageAction(
  token:    string,
  clientId: string,
  ticketId: string,
  body:     string,
): Promise<{ error?: string }> {
  if (!body.trim()) return { error: 'Mensagem não pode estar vazia.' }

  // Verify token
  const rows = await adminPrisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM clients WHERE portal_token = ${token} AND id = ${clientId} LIMIT 1
  `
  if (!rows[0]) return { error: 'Sessão inválida.' }

  // Verify ticket belongs to this client
  const ticket = await adminPrisma.ticket.findFirst({
    where: { id: ticketId, client_id: clientId },
    select: { id: true, status: true },
  })
  if (!ticket) return { error: 'Chamado não encontrado.' }
  if (ticket.status === 'CLOSED') return { error: 'Este chamado está fechado.' }

  await adminPrisma.ticketMessage.create({
    data: {
      ticket_id:   ticketId,
      author_id:   clientId,
      author_type: 'client',
      body:        body.trim(),
      is_internal: false,
    },
  })

  // Move back to OPEN if it was RESOLVED/WAITING_CLIENT
  if (ticket.status === 'RESOLVED' || ticket.status === 'WAITING_CLIENT') {
    await adminPrisma.ticket.update({
      where: { id: ticketId },
      data:  { status: 'OPEN', updated_at: new Date() },
    })
  }

  return {}
}
