import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { signContractAction } from '@/app/actions/contracts'

interface Props { params: Promise<{ token: string }> }

export default async function SignContractPage({ params }: Props) {
  const { token } = await params
  const contract = await prisma.contract.findUnique({
    where: { sign_token: token },
    include: { client: { select: { name: true } } },
  })

  if (!contract || !['SENT', 'VIEWED'].includes(contract.status)) notFound()

  // Marcar como visualizado se ainda não foi
  if (contract.status === 'SENT') {
    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'VIEWED', viewed_at: new Date() },
    })
  }

  const boundAction = signContractAction.bind(null, contract.id, token)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">OrgDesk</h1>
          <p className="mt-1 text-sm text-zinc-500">Assinatura de contrato</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">{contract.title}</h2>
          <p className="text-sm text-zinc-500">
            Cliente: {contract.client.name}
            {contract.expires_at && <> · Expira em {new Date(contract.expires_at).toLocaleDateString('pt-BR')}</>}
          </p>
        </div>

        {contract.content && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-6 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-relaxed">
              {contract.content}
            </pre>
          </div>
        )}

        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400 mb-4">
            Ao clicar em <strong className="text-white">Assinar contrato</strong>, você confirma que leu e concorda com os termos acima.
            Esta assinatura digital tem validade jurídica.
          </p>
          <form action={boundAction}>
            <button type="submit"
              className="rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors">
              Assinar contrato
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
