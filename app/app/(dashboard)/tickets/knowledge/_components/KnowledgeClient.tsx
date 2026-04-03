'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen, Search, Globe, Lock, Pencil, FolderOpen } from 'lucide-react'
import { DeleteArticleButton } from './DeleteArticleButton'

const VISIBILITY_CFG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  PUBLIC:   { label: 'Público',   icon: <Globe size={11} />, className: 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40' },
  INTERNAL: { label: 'Interno',   icon: <Lock  size={11} />, className: 'text-amber-400 bg-amber-900/30 border-amber-800/40' },
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  PUBLISHED: { label: 'Publicado', className: 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40' },
  DRAFT:     { label: 'Rascunho', className: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/40' },
}

interface Article {
  id: string
  title: string
  category: string | null
  visibility: string
  status: string
  updated_at: Date
}

interface Props {
  articles: Article[]
  isAdmin: boolean
}

export function KnowledgeClient({ articles, isAdmin }: Props) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = useMemo(
    () => [...new Set(articles.map(a => a.category ?? 'Sem categoria'))],
    [articles]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return articles.filter(a => {
      const matchesQuery = !q || a.title.toLowerCase().includes(q) || (a.category ?? '').toLowerCase().includes(q)
      const matchesCat = !activeCategory || (a.category ?? 'Sem categoria') === activeCategory
      return matchesQuery && matchesCat
    })
  }, [articles, query, activeCategory])

  const grouped = useMemo(() => {
    const g: Record<string, Article[]> = {}
    for (const a of filtered) {
      const cat = a.category ?? 'Sem categoria'
      if (!g[cat]) g[cat] = []
      g[cat].push(a)
    }
    return g
  }, [filtered])

  return (
    <div>
      {/* Search hero */}
      <div className="rounded-xl bg-gradient-to-br from-indigo-900/60 via-indigo-800/40 to-violet-900/40 border border-indigo-700/30 px-6 py-10 mb-6 text-center">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Encontre respostas para suas dúvidas</h2>
        <div className="relative max-w-xl mx-auto">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveCategory(null) }}
            placeholder="Buscar artigos…"
            className="w-full rounded-lg border border-white/[0.12] bg-white/[0.06] pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/60 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory(null)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === null
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'border-white/[0.1] text-zinc-400 hover:text-zinc-200 hover:border-white/20'
            }`}>
            Todos · {articles.length}
          </button>
          {categories.map(cat => {
            const count = articles.filter(a => (a.category ?? 'Sem categoria') === cat).length
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'border-white/[0.1] text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                }`}>
                <FolderOpen size={11} /> {cat} · {count}
              </button>
            )
          })}
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
          <Search size={24} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-400 font-medium">Nenhum artigo encontrado</p>
          {query && <p className="text-sm text-zinc-600 mt-1">Tente outro termo de busca.</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 px-1">{cat}</p>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.05] overflow-hidden">
                {items.map(a => {
                  const vis = VISIBILITY_CFG[a.visibility] ?? VISIBILITY_CFG.PUBLIC
                  const st  = STATUS_CFG[a.status]  ?? STATUS_CFG.DRAFT
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
                            <DeleteArticleButton id={a.id} />
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
