import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CampaignSendPanel } from './_components/CampaignSendPanel'
import { listEmailTemplatesAction } from '@/app/actions/email-templates'

export default async function EnviarCobrancaPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const orgId = session.user.orgId

  const [campaigns, clients, templates] = await Promise.all([
    prisma.campaign.findMany({
      where:    { organization_id: orgId },
      orderBy:  { created_at: 'desc' },
      include: {
        sends: {
          orderBy: { client_name: 'asc' },
          include: {
            invoice: { select: { id: true, number: true, amount: true } },
            boleto:  { select: { id: true, amount: true } },
          },
        },
      },
    }),
    prisma.client.findMany({
      where:  { organization_id: orgId },
      select: { cnpj: true, name: true, email: true, email_nfe: true, email_boleto: true },
    }),
    listEmailTemplatesAction(),
  ])

  // Map CNPJ (digits only) → client record for fast lookup
  const clientMap = new Map(clients.map(c => [c.cnpj.replace(/\D/g, ''), c]))

  const serialized = campaigns.map(c => ({
    id:           c.id,
    label:        c.label,
    month_year:   c.month_year,
    status:       c.status,
    has_boleto:   !!c.pdf_boleto_key,
    sends: c.sends.map(s => {
      const client    = clientMap.get(s.client_cnpj.replace(/\D/g, ''))
      const realName  = client?.name ?? s.client_name
      // Prefer email_nfe > email_boleto > email (same priority used at activation)
      const realEmail = client?.email_nfe ?? client?.email_boleto ?? client?.email ?? null
      return {
        id:           s.id,
        client_cnpj:  s.client_cnpj,
        client_name:  realName,
        client_email: realEmail,
        emails:       s.emails,
        status:       s.status as string,
        sent_at:      s.sent_at ? s.sent_at.toISOString() : null,
        open_count:   s.open_count,
        nf_pages:     s.nf_pages,
        boleto_pages: s.boleto_pages,
        invoice: s.invoice
          ? { id: s.invoice.id, number: s.invoice.number, amount: Number(s.invoice.amount) }
          : null,
        boleto: s.boleto
          ? { id: s.boleto.id, amount: Number(s.boleto.amount) }
          : null,
      }
    }),
  }))

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Enviar Cobrança</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Envie NFs e boletos para clientes por e-mail.
        </p>
      </div>

      <CampaignSendPanel
        campaigns={serialized as any}
        defaultCampaignId={serialized[0]?.id}
        templates={templates}
      />
    </div>
  )
}
