import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listArticlesAction } from '@/app/actions/knowledge'
import { BookOpen, Plus } from 'lucide-react'
import { KnowledgeClient } from './_components/KnowledgeClient'

export default async function KnowledgePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'ORG_ADMIN'
  const articles = await listArticlesAction()

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
        <KnowledgeClient articles={articles} isAdmin={isAdmin} />
      )}
    </div>
  )
}
