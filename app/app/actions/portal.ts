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
  const cnpjDigits = cnpj.replace(/\D/g, '')
  if (client.cnpj.replace(/\D/g, '') !== cnpjDigits) {
    return { error: 'E-mail ou CNPJ incorreto.' }
  }

  // Verifica e-mail (qualquer campo de e-mail do cliente)
  const emails = [client.email, client.email_nfe, client.email_boleto]
    .filter(Boolean)
    .map(e => e!.toLowerCase().trim())

  if (!emails.includes(email.toLowerCase().trim())) {
    return { error: 'E-mail ou CNPJ incorreto.' }
  }

  // Registra acesso ao portal
  await db.client.update({
    where: { portal_token: token },
    data:  { last_portal_access: new Date() },
  })

  // Busca envios desta empresa
  const sends = await adminPrisma.campaignSend.findMany({
    where:   { client_cnpj: cnpjDigits },
    orderBy: { created_at: 'desc' },
    include: {
      campaign: { select: { id: true, label: true } },
    },
  })

  const visibleSends: Send[] = sends
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

  const fmtCnpj = (d: string) =>
    d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')

  return {
    data: {
      clientName: client.name,
      clientCnpj: fmtCnpj(cnpjDigits),
      sends:      visibleSends,
    },
  }
}
