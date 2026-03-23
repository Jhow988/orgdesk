import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { OrgForm } from '../_components/OrgForm'
import { updateOrganizationAction } from '@/app/actions/organizations'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditOrganizationPage({ params }: Props) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const { id } = await params
  const org = await adminPrisma.organization.findUnique({ where: { id } })
  if (!org) notFound()

  const boundAction = updateOrganizationAction.bind(null, org.id)

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/organizations" className="text-xs text-zinc-500 hover:text-white transition-colors">
          ← Organizações
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-white">{org.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">slug: <span className="font-mono">{org.slug}</span></p>
      </div>

      <div className="max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <OrgForm
          action={boundAction}
          defaultValues={{
            name: org.name,
            slug: org.slug,
            cnpj: org.cnpj ?? '',
            plan: org.plan,
            is_active: org.is_active,
          }}
          isEdit
        />
      </div>
    </div>
  )
}
