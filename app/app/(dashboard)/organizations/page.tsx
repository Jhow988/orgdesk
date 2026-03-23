import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { toggleOrgStatusAction } from '@/app/actions/organizations'

export default async function OrganizationsPage() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const orgs = await adminPrisma.organization.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      _count: { select: { memberships: true, clients: true, tickets: true } },
    },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Organizações</h1>
          <p className="mt-1 text-sm text-zinc-500">{orgs.length} organização{orgs.length !== 1 ? 's' : ''} cadastrada{orgs.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/organizations/new"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
        >
          + Nova Organização
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">CNPJ</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Membros</th>
              <th className="px-4 py-3 font-medium">Clientes</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Criado em</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                  Nenhuma organização cadastrada.
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{org.slug}</td>
                  <td className="px-4 py-3 text-zinc-400">{org.cnpj || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{org.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{org._count.memberships}</td>
                  <td className="px-4 py-3 text-zinc-400">{org._count.clients}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${org.is_active ? 'bg-emerald-900/50 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                      {org.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/organizations/${org.id}`}
                        className="text-xs text-zinc-400 hover:text-white transition-colors"
                      >
                        Editar
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
