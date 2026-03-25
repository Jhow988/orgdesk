'use client'

import { useState, useTransition } from 'react'
import { Shield, ChevronRight, Lock, Check } from 'lucide-react'
import { saveUserPermissionsAction } from '@/app/actions/permissions'
import {
  MODULES, ACCESS_LEVELS, ROLE_DEFAULT_ACCESS, buildModuleAccessMap,
  type AccessLevel,
} from '@/lib/modules'

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN:   'Administrador',
  ORG_FINANCE: 'Financeiro',
  ORG_SUPPORT: 'Suporte',
}

interface OrgUser {
  membership_id: string
  user_id:       string
  name:          string
  email:         string
  role:          string
  permissions:   Record<string, AccessLevel>
}

interface Props {
  users:         OrgUser[]
  currentUserId: string
}

const SECTION_ORDER = ['Cadastro', 'Vendas', 'Financeiro', 'Suporte', 'Configurações']

const ACCESS_STYLE: Record<AccessLevel, string> = {
  NONE:   'bg-zinc-800/60 text-zinc-500 border-zinc-700/50',
  READ:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  EDIT:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CREATE: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  FULL:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

export function PermissionsClient({ users, currentUserId }: Props) {
  const [selected, setSelected] = useState<OrgUser | null>(null)
  const [draft,    setDraft]    = useState<Record<string, AccessLevel>>({})
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function selectUser(u: OrgUser) {
    setSelected(u)
    // Build effective permissions (custom overrides role defaults)
    setDraft(buildModuleAccessMap(u.role, u.permissions))
  }

  function setAccess(moduleKey: string, access: AccessLevel) {
    setDraft(prev => ({ ...prev, [moduleKey]: access }))
  }

  function handleSave() {
    if (!selected) return
    startTransition(async () => {
      const res = await saveUserPermissionsAction(selected.membership_id, draft)
      if (res.error) { showToast(res.error, false); return }
      showToast('Permissões salvas com sucesso.')
    })
  }

  const isAdmin = selected?.role === 'ORG_ADMIN' || selected?.role === 'SUPER_ADMIN'

  const sections = SECTION_ORDER.map(section => ({
    section,
    modules: MODULES.filter(m => m.section === section),
  }))

  return (
    <>
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-2 text-sm shadow-lg backdrop-blur ${
          toast.ok
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/20 bg-red-500/10 text-red-400'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Permissões</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure o acesso de cada usuário por módulo.
        </p>
      </div>

      <div className="flex gap-5">
        {/* User list */}
        <div className="w-64 flex-shrink-0">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="border-b border-white/[0.08] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Usuários</p>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {users.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => selectUser(u)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.03] flex items-center justify-between gap-2 ${
                    selected?.user_id === u.user_id ? 'bg-white/[0.05]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[13px] font-medium text-zinc-200">{u.name}</p>
                      {(u.role === 'ORG_ADMIN' || u.role === 'SUPER_ADMIN') && (
                        <Lock size={10} className="flex-shrink-0 text-zinc-500" />
                      )}
                    </div>
                    <p className="truncate text-[11px] text-zinc-500">{ROLE_LABELS[u.role] ?? u.role}</p>
                  </div>
                  {selected?.user_id === u.user_id && (
                    <ChevronRight size={13} className="flex-shrink-0 text-zinc-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permission editor */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <div className="text-center">
                <Shield size={24} className="mx-auto mb-2 text-zinc-600" />
                <p className="text-sm text-zinc-500">Selecione um usuário para configurar as permissões</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              {/* Editor header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{selected.name}</p>
                  <p className="text-[11px] text-zinc-500">{ROLE_LABELS[selected.role] ?? selected.role}</p>
                </div>
                {isAdmin ? (
                  <div className="flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] text-violet-400">
                    <Lock size={10} />
                    Acesso total (administrador)
                  </div>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    <Check size={13} />
                    {isPending ? 'Salvando…' : 'Salvar'}
                  </button>
                )}
              </div>

              {/* Module grid */}
              <div className="divide-y divide-white/[0.05]">
                {sections.map(({ section, modules }) => (
                  <div key={section}>
                    <div className="bg-white/[0.02] px-5 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{section}</p>
                    </div>
                    {modules.map(mod => {
                      const current = draft[mod.key] ?? 'NONE'
                      const roleDefault = ROLE_DEFAULT_ACCESS[selected.role]?.[mod.key] ?? 'NONE'

                      return (
                        <div
                          key={mod.key}
                          className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.01]"
                        >
                          <div>
                            <p className="text-[13px] text-zinc-200">{mod.label}</p>
                            <p className="text-[11px] text-zinc-600">
                              Padrão do perfil: <span className="text-zinc-500">{ACCESS_LEVELS.find(a => a.value === roleDefault)?.label}</span>
                            </p>
                          </div>

                          {isAdmin ? (
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${ACCESS_STYLE['FULL']}`}>
                              Acesso total
                            </span>
                          ) : (
                            <div className="flex gap-1.5">
                              {ACCESS_LEVELS.map(level => (
                                <button
                                  key={level.value}
                                  onClick={() => setAccess(mod.key, level.value)}
                                  title={level.label}
                                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                                    current === level.value
                                      ? ACCESS_STYLE[level.value]
                                      : 'border-transparent text-zinc-600 hover:text-zinc-400'
                                  }`}
                                >
                                  {level.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
