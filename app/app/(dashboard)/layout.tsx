import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Visão Geral', icon: '◈', roles: null },
  { href: '/organizations', label: 'Organizações', icon: '◫', roles: ['SUPER_ADMIN'] },
  { href: '/clients', label: 'Clientes', icon: '◉', roles: null },
  { href: '/boletos', label: 'Boletos', icon: '◎', roles: null },
  { href: '/invoices', label: 'Notas Fiscais', icon: '◇', roles: null },
  { href: '/campaigns', label: 'Campanhas', icon: '◆', roles: null },
  { href: '/tickets', label: 'Chamados', icon: '◐', roles: null },
  { href: '/settings', label: 'Configurações', icon: '◈', roles: null },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userRole = session.user.role as string

  return (
    <div className="flex h-full min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="flex h-14 items-center border-b border-zinc-800 px-4">
          <span className="text-sm font-bold tracking-wider text-white">OrgDesk</span>
        </div>

        <nav className="flex-1 space-y-0.5 p-2 pt-3">
          {NAV_ITEMS.filter(item => !item.roles || item.roles.includes(userRole)).map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium text-white">{session.user.name}</p>
            <p className="truncate text-xs text-zinc-500">{session.user.email}</p>
            <span className="mt-1 inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {session.user.role}
            </span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
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
