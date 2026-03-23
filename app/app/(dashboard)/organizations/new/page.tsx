import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OrgForm } from '../_components/OrgForm'
import { createOrganizationAction } from '@/app/actions/organizations'

export default async function NewOrganizationPage() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/organizations" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← Organizações
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-700">Nova Organização</h1>
        <p className="mt-1 text-sm text-zinc-400">Preencha os dados para criar uma nova organização.</p>
      </div>

      <div className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-6">
        <OrgForm action={createOrganizationAction} />
      </div>
    </div>
  )
}
