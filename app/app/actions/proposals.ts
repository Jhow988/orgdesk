'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkModuleAccess } from './permissions'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return session.user.orgId as string
}

function parseItems(formData: FormData) {
  const count = parseInt(formData.get('items_count') as string) || 0
  const items = []
  for (let i = 0; i < count; i++) {
    const description = (formData.get(`items[${i}][description]`) as string)?.trim()
    if (!description) continue
    items.push({
      product_id: (formData.get(`items[${i}][product_id]`) as string) || null,
      description,
      unit: (formData.get(`items[${i}][unit]`) as string) || 'un',
      quantity: parseFloat(formData.get(`items[${i}][quantity]`) as string) || 1,
      unit_price: parseFloat(formData.get(`items[${i}][unit_price]`) as string) || 0,
      total: parseFloat(formData.get(`items[${i}][total]`) as string) || 0,
      sort_order: i,
    })
  }
  return items
}

export async function createProposalAction(_prev: unknown, formData: FormData) {
  const denied = await checkModuleAccess('proposals', 'CREATE')
  if (denied) return { error: denied }
  const orgId = await requireOrg()

  const title = (formData.get('title') as string)?.trim()
  const client_id = formData.get('client_id') as string
  if (!title || !client_id) return { error: 'Título e cliente são obrigatórios.' }

  const lastProposal = await prisma.proposal.findFirst({
    where: { organization_id: orgId },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  const number = (lastProposal?.number ?? 0) + 1
  const items = parseItems(formData)
  const total = parseFloat(formData.get('total') as string) || 0
  const discount = parseFloat(formData.get('discount') as string) || 0
  const valid_until = formData.get('valid_until') as string
  const notes = (formData.get('notes') as string)?.trim() || null

  await prisma.proposal.create({
    data: {
      organization_id: orgId,
      client_id,
      number,
      title,
      discount,
      total,
      notes,
      valid_until: valid_until ? new Date(valid_until) : null,
      items: { create: items },
    },
  })

  revalidatePath('/comercial/proposals')
  redirect('/comercial/proposals')
}

export async function updateProposalStatusAction(id: string, status: string) {
  const denied = await checkModuleAccess('proposals', 'EDIT')
  if (denied) return
  const orgId = await requireOrg()
  const data: any = { status }
  if (status === 'SENT') data.sent_at = new Date()
  if (status === 'ACCEPTED') data.accepted_at = new Date()
  if (status === 'REJECTED') data.rejected_at = new Date()

  await prisma.proposal.updateMany({ where: { id, organization_id: orgId }, data })
  revalidatePath(`/comercial/proposals/${id}`)
}
