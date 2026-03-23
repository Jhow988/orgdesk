import type { Membership, User } from '@prisma/client'

type MemberWithUser = Membership & { user: User }

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Administrador',
  ORG_FINANCE: 'Financeiro',
  ORG_SUPPORT: 'Suporte',
  CLIENT_PORTAL: 'Portal',
}

export function UsuariosTab({ members }: { members: MemberWithUser[] }) {
  if (members.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500">
        Nenhum usuário vinculado a esta organização.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Usuário</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Perfil</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Último acesso</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {members.map(m => (
            <tr key={m.id} className="hover:bg-zinc-800/40 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{m.user.name}</div>
                <div className="text-xs text-zinc-500">{m.user.email}</div>
              </td>
              <td className="px-4 py-3 text-zinc-300">
                {ROLE_LABELS[m.role] ?? m.role}
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {m.user.last_login_at
                  ? new Date(m.user.last_login_at).toLocaleString('pt-BR')
                  : <span className="text-zinc-600">Nunca acessou</span>}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.is_active
                    ? 'bg-emerald-900/50 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {m.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
