import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listBoletosAction } from '@/app/actions/asaas-boleto'
import { getEmpresasForSelectAction } from '@/app/actions/empresa'
import { BoletosTable } from './_components/BoletosTable'

interface PageProps {
  searchParams: Promise<{ status?: string; empresa_id?: string }>
}

export default async function BoletosPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const params = await searchParams
  const filters: { status?: string; empresa_id?: string } = {}
  if (params.status) filters.status = params.status
  if (params.empresa_id) filters.empresa_id = params.empresa_id

  const [boletos, empresas] = await Promise.all([
    listBoletosAction(filters),
    getEmpresasForSelectAction(),
  ])

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Boletos</h1>
          <p className="mt-1 text-sm text-zinc-500">Gerencie boletos gerados via Asaas.</p>
        </div>
        <Link
          href="/financeiro/boletos/new"
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Boleto
        </Link>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <BoletosTable boletos={boletos as any} empresas={empresas} />
    </div>
  )
}
