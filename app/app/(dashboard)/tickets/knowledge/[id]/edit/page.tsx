import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArticleForm } from '../../_components/ArticleForm'
import { getArticleAction, updateArticleAction } from '@/app/actions/knowledge'

interface Props { params: Promise<{ id: string }> }

export default async function EditArticlePage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'ORG_ADMIN'
  if (!isAdmin) redirect('/tickets/knowledge')

  const { id } = await params
  const article = await getArticleAction(id)
  if (!article) notFound()

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/tickets/knowledge" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          ← Base de Conhecimento
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">Editar artigo</h1>
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
        <ArticleForm
          action={updateArticleAction}
          defaultValues={{
            id: article.id,
            title: article.title,
            content: article.content,
            category: article.category ?? '',
            visibility: article.visibility,
            status: article.status,
          }}
        />
      </div>
    </div>
  )
}
