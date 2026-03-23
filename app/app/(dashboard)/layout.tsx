import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'
import Link from 'next/link'

interface NavItem {
  href: string
  label: string
  roles?: string[]
}

interface NavGroup {
  label: string
  roles?: string[]
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Geral',
    items: [
      { href: '/dashboard', label: 'Visão Geral' },
      { href: '/organizations', label: 'Organizações', roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/boletos',        label: 'Boletos' },
      { href: '/financeiro/pix', label: 'PIX' },
      { href: '/invoices',       label: 'Notas Fiscais' },
      { href: '/campaigns',      label: 'Campanhas' },
      { href: '/financeiro/relatorios', label: 'Relatórios' },
    ],
  },
  {
    label: 'Chamados',
    items: [
      { href: '/tickets',              label: 'Chamados' },
      { href: '/tickets/relatorios',   label: 'Relatórios' },
    ],
  },
  {
    label: 'Cadastro',
    items: [
      { href: '/clients',            label: 'Clientes' },
      { href: '/comercial/products', label: 'Produtos/Serviços' },
      { href: '/users',              label: 'Usuários' },
    ],
  },
  {
    label: 'Vendas',
    items: [
      { href: '/comercial/proposals', label: 'Propostas' },
      { href: '/comercial/contracts', label: 'Contratos' },
      { href: '/comercial/crm',       label: 'CRM' },
    ],
  },
  {
    label: 'Configuração',
    items: [
      { href: '/settings/permissions', label: 'Permissões' },
      { href: '/settings/company',     label: 'Dados da empresa' },
    ],
  },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userRole = session.user.role as string

  return (
    <div className="flex h-full min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="flex h-14 items-center border-b border-zinc-800 px-4">
          <span className="text-sm font-bold tracking-wider text-white">OrgDesk</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_GROUPS.map(group => {
            const visibleItems = group.items.filter(
              item => !item.roles || item.roles.includes(userRole)
            )
            if (visibleItems.length === 0) return null

            return (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium text-white">{session.user.name}</p>
            <p className="truncate text-xs text-zinc-500">{session.user.email}</p>
            <span className="mt-1 inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {session.user.role}
            </span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-1.5 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
