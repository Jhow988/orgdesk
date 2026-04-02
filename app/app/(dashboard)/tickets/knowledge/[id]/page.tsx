import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticleAction } from '@/app/actions/knowledge'
import { Globe, Lock, Pencil } from 'lucide-react'

const VISIBILITY_CFG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  PUBLIC:   { label: 'Público',  icon: <Globe size={11} />, className: 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40' },
  INTERNAL: { label: 'Interno', icon: <Lock  size={11} />, className: 'text-amber-400 bg-amber-900/30 border-amber-800/40' },
}

interface Props { params: Promise<{ id: string }> }

export default async function ArticleDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const { id } = await params
  const article = await getArticleAction(id)
  if (!article) notFound()

  const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'ORG_ADMIN'
  const vis = VISIBILITY_CFG[article.visibility] ?? VISIBILITY_CFG.PUBLIC

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/tickets/knowledge" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          ← Base de Conhecimento
        </Link>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            {article.category && (
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{article.category}</p>
            )}
            <h1 className="text-xl font-semibold text-zinc-100">{article.title}</h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${vis.className}`}>
                {vis.icon} {vis.label}
              </span>
              {article.status === 'DRAFT' && (
                <span className="rounded-full border border-zinc-700/40 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  Rascunho
                </span>
              )}
              <span className="text-xs text-zinc-600">
                Atualizado em {new Date(article.updated_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
          {isAdmin && (
            <Link href={`/tickets/knowledge/${id}/edit`}
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <Pencil size={12} /> Editar
            </Link>
          )}
        </div>

        <div className="border-t border-white/[0.06] pt-6">
          <div className="prose prose-invert prose-sm max-w-none">
            {article.content.split('\n\n').map((para, i) => (
              <p key={i} className="text-sm text-zinc-300 leading-relaxed mb-4 whitespace-pre-wrap last:mb-0">
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
