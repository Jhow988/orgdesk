import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'
import { SidebarNav } from './_components/SidebarNav'
import { getMyModuleAccessAction } from '@/app/actions/permissions'
import { LogOut } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const moduleAccess = await getMyModuleAccessAction()

  return (
    <div className="flex h-full min-h-screen bg-[#0f1117] text-zinc-100">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-white/[0.06] bg-[#13151c]">
        {/* Logo */}
        <div className="flex h-12 items-center gap-2.5 border-b border-white/[0.06] px-4">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-indigo-500 text-[10px] font-bold text-white">
            O
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">OrgDesk</span>
        </div>

        <SidebarNav userRole={session.user.role} moduleAccess={moduleAccess} />

        {/* User footer */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 px-1">
            <p className="truncate text-[13px] font-medium text-zinc-200">{session.user.name}</p>
            <p className="truncate text-[11px] text-zinc-500">{session.user.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
            >
              <LogOut size={13} strokeWidth={1.5} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
