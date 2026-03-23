import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Pendente',  className: 'bg-yellow-900/50 text-yellow-400' },
  PAID:      { label: 'Pago',      className: 'bg-emerald-900/50 text-emerald-400' },
  EXPIRED:   { label: 'Expirado',  className: 'bg-zinc-800 text-zinc-500' },
  CANCELLED: { label: 'Cancelado', className: 'bg-red-900/50 text-red-400' },
}

export default async function PortalPixPage() {
  const session = await auth()
  if (!session?.user?.clientId) redirect('/login')

  const charges = await prisma.pixCharge.findMany({
    where: { client_id: session.user.clientId },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-white">Cobranças PIX</h1>

      <div className="space-y-4">
        {charges.length === 0 && (
          <p className="text-center py-12 text-zinc-500">Nenhuma cobrança PIX.</p>
        )}
        {charges.map(c => {
          const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.PENDING
          return (
            <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-white">{c.description}</p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-white">
                    {Number(c.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Criado em {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    {c.expires_at && <> · Expira em {new Date(c.expires_at).toLocaleDateString('pt-BR')}</>}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
              </div>

              {c.status === 'PENDING' && c.pix_key && (
                <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 mb-1">Chave PIX</p>
                  <p className="font-mono text-sm text-white">{c.pix_key}</p>
                </div>
              )}

              {c.status === 'PENDING' && c.qr_code && (
                <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 mb-1">Copia e cola</p>
                  <p className="break-all font-mono text-xs text-zinc-400">{c.qr_code}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
