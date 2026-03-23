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
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Campanhas Mensais</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cadastre um PDF de NFs (e boletos) por mês. Escolha qual campanha enviar.
        </p>
      </div>

      <NewCampaignForm action={createCampaignAction} />

      <div className="mt-8">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}
        </p>

        {campaigns.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <p className="text-zinc-500">Nenhuma campanha criada ainda.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={{ ...c, created_at: c.created_at.toISOString() }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
