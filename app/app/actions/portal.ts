'use server'

import { adminPrisma } from '@/lib/prisma'

interface Send {
  id:           string
  campaignId:   string
  campaignLabel: string
  nf_pages:     number[]
  boleto_pages: number[]
  sent_at:      string | null
}

interface PortalData {
  clientName: string
  clientCnpj: string
  sends:      Send[]
}

function fmtCnpj(d: string) {
  return d.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export async function verifyPortalAccessAction(
  token: string,
  email: string,
  cnpj:  string,
): Promise<{ data?: PortalData; error?: string }> {
  if (!token || !email || !cnpj) return { error: 'Preencha todos os campos.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminPrisma as any

  const client = await db.client.findUnique({
    where:  { portal_token: token },
    select: {
      id:           true,
      name:         true,
      cnpj:         true,
      email:        true,
      email_nfe:    true,
      email_boleto: true,
    },
  }) as {
    id: string; name: string; cnpj: string;
    email: string | null; email_nfe: string | null; email_boleto: string | null;
  } | null

  if (!client) return { error: 'Link inválido ou expirado.' }

  // Verifica CNPJ (apenas dígitos)
  const cnpjDigits    = cnpj.replace(/\D/g, '')
  const clientCnpjRaw = client.cnpj.replace(/\D/g, '')
  if (clientCnpjRaw !== cnpjDigits) {
    return { error: 'E-mail ou CNPJ incorreto.' }
  }

  // Coleta todos os e-mails associados a este cliente:
  // 1. Campos diretos do cadastro
  const emailsCadastro = [client.email, client.email_nfe, client.email_boleto]
    .filter(Boolean)
    .map(e => e!.toLowerCase().trim())

  // 2. E-mails armazenados nos envios de campanha (pode ser diferente do cadastro atual)
  const sends = await adminPrisma.campaignSend.findMany({
    where:   { client_cnpj: cnpjDigits },
    select:  { emails: true },
  })
  const emailsSends = sends
    .flatMap(s => s.emails as string[])
    .map(e => e.toLowerCase().trim())
    .filter(Boolean)

  const todosEmails = [...new Set([...emailsCadastro, ...emailsSends])]

  const emailInput = email.toLowerCase().trim()

  // Se não há nenhum e-mail cadastrado, aceita qualquer um (token + CNPJ já são suficientes)
  if (todosEmails.length > 0 && !todosEmails.includes(emailInput)) {
    return { error: 'E-mail ou CNPJ incorreto.' }
  }

  // Registra acesso ao portal
  await db.client.update({
    where: { portal_token: token },
    data:  { last_portal_access: new Date() },
  })

  // Busca envios com documentos
  const allSends = await adminPrisma.campaignSend.findMany({
    where:   { client_cnpj: cnpjDigits },
    orderBy: { created_at: 'desc' },
    include: { campaign: { select: { id: true, label: true } } },
  })

  const visibleSends: Send[] = allSends
    .filter(s => s.nf_pages.length > 0 || s.boleto_pages.length > 0)
    .map(s => ({
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

  return {
    data: {
      clientName: client.name,
      clientCnpj: fmtCnpj(clientCnpjRaw),
      sends:      visibleSends,
    },
  }
}
