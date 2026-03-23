import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { enviarCobrancaAction } from '@/app/actions/cobranca'
import { EnviarCobrancaForm } from './_components/EnviarCobrancaForm'

export default async function EnviarCobrancaPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const clients = await prisma.client.findMany({
    where: { organization_id: session.user.orgId, is_active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-100">Enviar Cobrança</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gere uma cobrança via PIX ou Boleto para um cliente.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
        <EnviarCobrancaForm action={enviarCobrancaAction} clients={clients} />
      </div>
    </div>
  )
}
