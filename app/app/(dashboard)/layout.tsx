import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'
import { SidebarNav } from './_components/SidebarNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="flex h-full min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="flex h-14 items-center border-b border-zinc-800 px-4">
          <span className="text-sm font-bold tracking-wider text-white">OrgDesk</span>
        </div>

        <SidebarNav userRole={session.user.role} />

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

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
