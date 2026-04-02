'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return { orgId: session.user.orgId as string, userId: session.user.id, role: session.user.role }
}

async function requireAdmin() {
  const { orgId, userId, role } = await requireOrg()
  if (role !== 'SUPER_ADMIN' && role !== 'ORG_ADMIN') return { error: 'Sem permissão.' }
  return { orgId, userId }
}

export async function listArticlesAction(visibility?: string) {
  const { orgId } = await requireOrg()
  const where: any = { organization_id: orgId }
  if (visibility) where.visibility = visibility
  return prisma.knowledgeArticle.findMany({
    where,
    orderBy: [{ status: 'asc' }, { updated_at: 'desc' }],
    select: { id: true, title: true, category: true, visibility: true, status: true, updated_at: true },
  })
}

export async function getArticleAction(id: string) {
  const { orgId } = await requireOrg()
  return prisma.knowledgeArticle.findFirst({ where: { id, organization_id: orgId } })
}

export async function createArticleAction(_prev: unknown, formData: FormData) {
  const r = await requireAdmin()
  if ('error' in r) return r
  const { orgId, userId } = r

  const title      = (formData.get('title') as string)?.trim()
  const content    = (formData.get('content') as string)?.trim()
  const category   = (formData.get('category') as string)?.trim() || null
  const visibility = (formData.get('visibility') as string) || 'PUBLIC'
  const status     = (formData.get('status') as string) || 'DRAFT'

  if (!title || !content) return { error: 'Título e conteúdo são obrigatórios.' }

  await prisma.knowledgeArticle.create({
    data: { organization_id: orgId, title, content, category, visibility, status, created_by: userId },
  })

  revalidatePath('/tickets/knowledge')
  redirect('/tickets/knowledge')
}

export async function updateArticleAction(_prev: unknown, formData: FormData) {
  const r = await requireAdmin()
  if ('error' in r) return r
  const { orgId } = r

  const id         = formData.get('id') as string
  const title      = (formData.get('title') as string)?.trim()
  const content    = (formData.get('content') as string)?.trim()
  const category   = (formData.get('category') as string)?.trim() || null
  const visibility = (formData.get('visibility') as string) || 'PUBLIC'
  const status     = (formData.get('status') as string) || 'DRAFT'

  if (!title || !content) return { error: 'Título e conteúdo são obrigatórios.' }

  await prisma.knowledgeArticle.updateMany({
    where: { id, organization_id: orgId },
    data: { title, content, category, visibility, status, updated_at: new Date() },
  })

  revalidatePath('/tickets/knowledge')
  redirect('/tickets/knowledge')
}

export async function deleteArticleAction(id: string) {
  const r = await requireAdmin()
  if ('error' in r) return r
  const { orgId } = r

  await prisma.knowledgeArticle.deleteMany({ where: { id, organization_id: orgId } })
  revalidatePath('/tickets/knowledge')
}

export async function listPublicArticlesAction(orgId: string) {
  return prisma.knowledgeArticle.findMany({
    where: { organization_id: orgId, visibility: 'PUBLIC', status: 'PUBLISHED' },
    orderBy: [{ category: 'asc' }, { updated_at: 'desc' }],
    select: { id: true, title: true, category: true, content: true, updated_at: true },
  })
}
