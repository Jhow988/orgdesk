import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { sendContractAction, cancelContractAction } from '@/app/actions/contracts'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'Rascunho',    className: 'bg-zinc-800 text-zinc-400' },
  SENT:      { label: 'Enviado',     className: 'bg-blue-900/50 text-blue-400' },
  VIEWED:    { label: 'Visualizado', className: 'bg-yellow-900/50 text-yellow-400' },
  SIGNED:    { label: 'Assinado',    className: 'bg-emerald-900/50 text-emerald-400' },
  EXPIRED:   { label: 'Expirado',    className: 'bg-zinc-800 text-zinc-500' },
  CANCELLED: { label: 'Cancelado',   className: 'bg-red-900/50 text-red-400' },
}

interface Props { params: Promise<{ id: string }> }

export default async function ContractDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const { id } = await params
  const contract = await prisma.contract.findFirst({
    where: { id, organization_id: session.user.orgId },
    include: {
      client: { select: { name: true, cnpj: true, email: true } },
      proposal: { select: { title: true, number: true } },
    },
  })
  if (!contract) notFound()

  const cfg = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.DRAFT
  const portalLink = contract.sign_token
    ? `${process.env.NEXTAUTH_URL ?? ''}/portal/contracts/${contract.sign_token}`
    : null

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/comercial/contracts" className="text-xs text-zinc-500 hover:text-white transition-colors">
          ← Contratos
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">{contract.title}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {contract.client.name}
          {contract.proposal && <> · Proposta #{String(contract.proposal.number).padStart(4,'0')}</>}
          {contract.expires_at && <> · Expira em {new Date(contract.expires_at).toLocaleDateString('pt-BR')}</>}
        </p>
      </div>

      {/* Ações */}
      <div className="mb-6 flex flex-wrap gap-2">
        {contract.status === 'DRAFT' && (
          <form action={async () => { 'use server'; await sendContractAction(id) }}>
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors">
              Enviar para assinatura
            </button>
          </form>
        )}
        {['DRAFT', 'SENT', 'VIEWED'].includes(contract.status) && (
          <form action={async () => { 'use server'; await cancelContractAction(id) }}>
            <button type="submit" className="rounded-md border border-red-800 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950 transition-colors">
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Link de assinatura */}
      {portalLink && contract.status !== 'SIGNED' && contract.status !== 'CANCELLED' && (
        <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">Link de assinatura</p>
          <p className="break-all font-mono text-xs text-zinc-400">{portalLink}</p>
        </div>
      )}

      {/* Datas */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Criado', value: contract.created_at },
          { label: 'Enviado', value: contract.sent_at },
          { label: 'Visualizado', value: contract.viewed_at },
          { label: 'Assinado', value: contract.signed_at },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs text-zinc-600">{label}</p>
            <p className="mt-1 text-sm text-white">
              {value ? new Date(value).toLocaleDateString('pt-BR') : <span className="text-zinc-600">—</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Conteúdo */}
      {contract.content && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-4">Conteúdo</p>
          <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-relaxed">{contract.content}</pre>
        </div>
      )}
    </div>
  )
}
