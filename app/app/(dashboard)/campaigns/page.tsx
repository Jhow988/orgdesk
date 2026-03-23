import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { createCampaignAction } from '@/app/actions/campaigns'
import { NewCampaignForm } from './_components/NewCampaignForm'
import { CampaignCard } from './_components/CampaignCard'

export default async function CampaignsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const campaigns = await adminPrisma.campaign.findMany({
    where: { organization_id: session.user.orgId },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      label: true,
      month_year: true,
      status: true,
      kb_nf: true,
      kb_boleto: true,
      created_at: true,
    },
  })

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Campanhas Mensais</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            PDF de NFs e boletos por mês para envio em lote.
          </p>
        </div>
      </div>

      {/* Campaigns grid — main focus */}
      {campaigns.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={{ ...c, created_at: c.created_at.toISOString() }} />
            ))}
          </div>
        </div>
      )}

      {/* New campaign form — compact, at bottom */}
      <NewCampaignForm action={createCampaignAction} />

      {campaigns.length === 0 && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-zinc-600">Nenhuma campanha criada ainda.</p>
          <p className="mt-1 text-xs text-zinc-700">Clique em "Nova Campanha" acima para começar.</p>
        </div>
      )}
    </div>
  )
}
