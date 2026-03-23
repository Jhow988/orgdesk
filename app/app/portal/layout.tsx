import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'

const NAV = [
  { href: '/portal', label: 'Início', exact: true },
  { href: '/portal/tickets', label: 'Chamados' },
  { href: '/portal/documents', label: 'Documentos' },
  { href: '/portal/pix', label: 'PIX' },
  { href: '/portal/contracts', label: 'Contratos' },
]

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLIENT_PORTAL') redirect('/login')

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-white">OrgDesk</span>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV.map(n => (
                <Link key={n.href} href={n.href}
                  className="px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{session.user.name}</span>
            <form action={logoutAction}>
              <button type="submit" className="text-xs text-zinc-500 hover:text-white transition-colors">Sair</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
