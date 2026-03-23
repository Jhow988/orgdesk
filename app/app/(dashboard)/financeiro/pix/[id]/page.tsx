import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { markPixPaidAction, cancelPixAction } from '@/app/actions/pix'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Pendente',  className: 'bg-yellow-900/50 text-yellow-400' },
  PAID:      { label: 'Pago',      className: 'bg-emerald-900/50 text-emerald-400' },
  EXPIRED:   { label: 'Expirado',  className: 'bg-zinc-800 text-zinc-500' },
  CANCELLED: { label: 'Cancelado', className: 'bg-red-900/50 text-red-400' },
}

interface Props { params: Promise<{ id: string }> }

export default async function PixDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const { id } = await params
  const charge = await prisma.pixCharge.findFirst({
    where: { id, organization_id: session.user.orgId },
    include: { client: { select: { name: true, cnpj: true } } },
  })
  if (!charge) notFound()

  const cfg = STATUS_CONFIG[charge.status] ?? STATUS_CONFIG.PENDING

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/financeiro/pix" className="text-xs text-zinc-500 hover:text-white transition-colors">
          ← Cobranças PIX
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">{charge.description}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">{charge.client.name}</p>
      </div>

      {charge.status === 'PENDING' && (
        <div className="mb-6 flex gap-2">
          <form action={async () => { 'use server'; await markPixPaidAction(id) }}>
            <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
              Confirmar pagamento
            </button>
          </form>
          <form action={async () => { 'use server'; await cancelPixAction(id) }}>
            <button type="submit" className="rounded-md border border-red-800 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950 transition-colors">
              Cancelar
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Valor</dt>
            <dd className="font-mono font-bold text-white text-lg">
              {Number(charge.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </dd>
          </div>
          {charge.pix_key && (
            <div className="flex justify-between">
              <dt className="text-zinc-500">Chave PIX</dt>
              <dd className="font-mono text-zinc-300">{charge.pix_key}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-zinc-500">Criado em</dt>
            <dd className="text-zinc-300">{new Date(charge.created_at).toLocaleString('pt-BR')}</dd>
          </div>
          {charge.expires_at && (
            <div className="flex justify-between">
              <dt className="text-zinc-500">Expira em</dt>
              <dd className={new Date(charge.expires_at) < new Date() ? 'text-red-400' : 'text-zinc-300'}>
                {new Date(charge.expires_at).toLocaleDateString('pt-BR')}
              </dd>
            </div>
          )}
          {charge.paid_at && (
            <div className="flex justify-between">
              <dt className="text-zinc-500">Pago em</dt>
              <dd className="text-emerald-400">{new Date(charge.paid_at).toLocaleString('pt-BR')}</dd>
            </div>
          )}
          {charge.notes && (
            <div>
              <dt className="text-zinc-500 mb-1">Observações</dt>
              <dd className="text-zinc-400">{charge.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {charge.qr_code && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-3">QR Code PIX</p>
          <p className="break-all font-mono text-xs text-zinc-500">{charge.qr_code}</p>
        </div>
      )}
    </div>
  )
}
