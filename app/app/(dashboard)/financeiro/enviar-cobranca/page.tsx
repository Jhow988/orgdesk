import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CampaignSendPanel } from './_components/CampaignSendPanel'

export default async function EnviarCobrancaPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const campaigns = await prisma.campaign.findMany({
    where: { organization_id: session.user.orgId },
    orderBy: { created_at: 'desc' },
    include: {
      sends: {
        orderBy: { client_name: 'asc' },
        include: {
          invoice: { select: { id: true, number: true, amount: true } },
          boleto:  { select: { id: true, amount: true } },
        },
      },
    },
  })

  const serialized = campaigns.map(c => ({
    id: c.id,
    label: c.label,
    month_year: c.month_year,
    status: c.status,
    sends: c.sends.map(s => ({
      id: s.id,
      client_cnpj: s.client_cnpj,
      client_name: s.client_name,
      emails: s.emails,
      status: s.status,
      sent_at: s.sent_at,
      open_count: s.open_count,
      invoice: s.invoice
        ? { id: s.invoice.id, number: s.invoice.number, amount: Number(s.invoice.amount) }
        : null,
      boleto: s.boleto
        ? { id: s.boleto.id, amount: Number(s.boleto.amount) }
        : null,
    })),
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
      />
    </div>
  )
}
