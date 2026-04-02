import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArticleForm } from '../_components/ArticleForm'
import { createArticleAction } from '@/app/actions/knowledge'

export default async function NewArticlePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'ORG_ADMIN'
  if (!isAdmin) redirect('/tickets/knowledge')

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/tickets/knowledge" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          ← Base de Conhecimento
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">Novo artigo</h1>
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
        <ArticleForm action={createArticleAction} />
      </div>
    </div>
  )
}
