import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BoletoForm } from './_components/BoletoForm'

export default async function NewBoletoPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  const orgId = session.user.orgId

  const [empresas, clients] = await Promise.all([
    prisma.empresa.findMany({
      where: { organization_id: orgId, is_active: true },
      select: {
        id: true,
        name: true,
        cnpj: true,
        asaas_api_key: true,
        asaas_environment: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.client.findMany({
      where: { organization_id: orgId, is_active: true },
      select: { id: true, name: true, cnpj: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/financeiro/boletos"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Boletos
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">Novo Boleto</h1>
        <p className="mt-1 text-sm text-zinc-500">Gere um boleto via Asaas.</p>
      </div>

      <div className="max-w-lg rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
        <BoletoForm empresas={empresas} clients={clients} />
      </div>
    </div>
  )
}
