import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PixForm } from '../_components/PixForm'
import { createPixChargeAction } from '@/app/actions/pix'

export default async function NewPixPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const clients = await prisma.client.findMany({
    where: { organization_id: session.user.orgId, is_active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/financeiro/pix" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          ← Cobranças PIX
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">Nova cobrança PIX</h1>
      </div>
      <div className="max-w-lg rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
        <PixForm action={createPixChargeAction} clients={clients} />
      </div>
    </div>
  )
}
