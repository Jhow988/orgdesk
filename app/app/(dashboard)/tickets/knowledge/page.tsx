import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listArticlesAction, deleteArticleAction } from '@/app/actions/knowledge'
import { BookOpen, Plus, Pencil, Trash2, Globe, Lock, Eye, EyeOff } from 'lucide-react'

const VISIBILITY_CFG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  PUBLIC:   { label: 'Público',   icon: <Globe  size={11} />, className: 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40' },
  INTERNAL: { label: 'Interno',   icon: <Lock   size={11} />, className: 'text-amber-400 bg-amber-900/30 border-amber-800/40' },
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  PUBLISHED: { label: 'Publicado', className: 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40' },
  DRAFT:     { label: 'Rascunho', className: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/40' },
}

export default async function KnowledgePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'ORG_ADMIN'
  const articles = await listArticlesAction()

  const categories = [...new Set(articles.map(a => a.category).filter(Boolean))] as string[]

  const grouped: Record<string, typeof articles> = {}
  for (const a of articles) {
    const cat = a.category ?? 'Sem categoria'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(a)
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Base de Conhecimento</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {articles.length} artigo{articles.length !== 1 ? 's' : ''} · tutoriais e documentação
          </p>
        </div>
        {isAdmin && (
          <Link href="/tickets/knowledge/new"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
            <Plus size={15} /> Novo artigo
          </Link>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
          <BookOpen size={28} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-400 font-medium">Nenhum artigo criado ainda.</p>
          <p className="text-sm text-zinc-600 mt-1">Crie tutoriais e documentações para clientes e equipe.</p>
          {isAdmin && (
            <Link href="/tickets/knowledge/new"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              <Plus size={14} /> Criar primeiro artigo
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 px-1">{cat}</p>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.05] overflow-hidden">
                {items.map(a => {
                  const vis = VISIBILITY_CFG[a.visibility] ?? VISIBILITY_CFG.PUBLIC
                  const st  = STATUS_CFG[a.status] ?? STATUS_CFG.DRAFT
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <BookOpen size={15} className="text-zinc-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <Link href={`/tickets/knowledge/${a.id}`}
                            className="text-sm font-medium text-zinc-200 hover:text-white transition-colors truncate block">
                            {a.title}
                          </Link>
                          <p className="text-xs text-zinc-600 mt-0.5">
                            Atualizado em {new Date(a.updated_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${vis.className}`}>
                          {vis.icon} {vis.label}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.className}`}>
                          {st.label}
                        </span>
                        {isAdmin && (
                          <div className="flex items-center gap-1 ml-1">
                            <Link href={`/tickets/knowledge/${a.id}/edit`}
                              className="p-1.5 rounded text-zinc-600 hover:text-indigo-400 transition-colors">
                              <Pencil size={12} />
                            </Link>
                            <form action={async () => { 'use server'; await deleteArticleAction(a.id) }}>
                              <button type="submit" className="p-1.5 rounded text-zinc-600 hover:text-red-400 transition-colors"
                                onClick={e => { if (!confirm('Excluir este artigo?')) e.preventDefault() }}>
                                <Trash2 size={12} />
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
