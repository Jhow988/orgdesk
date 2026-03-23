import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { toggleOrgStatusAction } from '@/app/actions/organizations'
import { SubscriptionBadge } from './_components/SubscriptionBadge'

export default async function OrganizationsPage() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const orgs = await adminPrisma.organization.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      _count: { select: { memberships: true, clients: true } },
    },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Organizações</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {orgs.length} organização{orgs.length !== 1 ? 's' : ''} cadastrada{orgs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/organizations/new"
          className="rounded-md bg-white/[0.06] border border-white/[0.08] px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors"
        >
          + Nova Organização
        </Link>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <table className="w-full text-sm bg-transparent">
          <thead>
            <tr className="border-b border-white/[0.08] text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">CNPJ</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Assinatura</th>
              <th className="px-4 py-3 font-medium">Membros</th>
              <th className="px-4 py-3 font-medium">Clientes</th>
              <th className="px-4 py-3 font-medium">Cadastro</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                  Nenhuma organização cadastrada.
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-100">{org.name}</div>
                    <div className="font-mono text-xs text-zinc-400">{org.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{org.cnpj || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-white/[0.08] px-2 py-0.5 text-xs text-zinc-400 capitalize">{org.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <SubscriptionBadge status={org.subscription_status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{org._count.memberships}</td>
                  <td className="px-4 py-3 text-zinc-400">{org._count.clients}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/organizations/${org.id}`}
                        className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                      >
                        Gerenciar
                      </Link>
                      <form
                        action={async () => {
                          'use server'
                          await toggleOrgStatusAction(org.id, org.is_active)
                        }}
                      >
                        <button
                          type="submit"
                          className={`text-xs transition-colors ${org.is_active ? 'text-red-500 hover:text-red-400' : 'text-emerald-500 hover:text-emerald-400'}`}
                        >
                          {org.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
