import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'Rascunho',    className: 'bg-zinc-800 text-zinc-400' },
  SENT:      { label: 'Aguardando assinatura', className: 'bg-blue-900/50 text-blue-400' },
  VIEWED:    { label: 'Visualizado', className: 'bg-yellow-900/50 text-yellow-400' },
  SIGNED:    { label: 'Assinado',    className: 'bg-emerald-900/50 text-emerald-400' },
  EXPIRED:   { label: 'Expirado',    className: 'bg-zinc-800 text-zinc-500' },
  CANCELLED: { label: 'Cancelado',   className: 'bg-red-900/50 text-red-400' },
}

export default async function PortalContractsPage() {
  const session = await auth()
  if (!session?.user?.clientId) redirect('/login')

  const contracts = await prisma.contract.findMany({
    where: { client_id: session.user.clientId },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-white">Contratos</h1>

      <div className="space-y-4">
        {contracts.length === 0 && (
          <p className="text-center py-12 text-zinc-500">Nenhum contrato.</p>
        )}
        {contracts.map(c => {
          const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.DRAFT
          const canSign = (c.status === 'SENT' || c.status === 'VIEWED') && c.sign_token
          return (
            <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-white">{c.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Criado em {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    {c.expires_at && <> · Expira em {new Date(c.expires_at).toLocaleDateString('pt-BR')}</>}
                    {c.signed_at && <> · Assinado em {new Date(c.signed_at).toLocaleDateString('pt-BR')}</>}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
              </div>
              {canSign && (
                <div className="mt-4">
                  <Link href={`/portal/contracts/${c.sign_token}`}
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors">
                    Ver e assinar contrato
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
