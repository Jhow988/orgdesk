'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import { checkModuleAccess } from './permissions'
import { logActivity } from '@/lib/activity'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return { orgId: session.user.orgId as string, userId: session.user.id }
}

export async function createContractAction(_prev: unknown, formData: FormData) {
  const denied = await checkModuleAccess('contracts', 'CREATE')
  if (denied) return { error: denied }
  const { orgId, userId } = await requireOrg()

  const title = (formData.get('title') as string)?.trim()
  const client_id = formData.get('client_id') as string
  if (!title || !client_id) return { error: 'Título e cliente são obrigatórios.' }

  const expires_at = formData.get('expires_at') as string
  const content = (formData.get('content') as string)?.trim() || null
  const proposal_id = (formData.get('proposal_id') as string) || null

  const contract = await prisma.contract.create({
    data: {
      organization_id: orgId,
      client_id,
      proposal_id,
      title,
      content,
      expires_at: expires_at ? new Date(expires_at) : null,
    },
  })

  // Auto-create tech sheet for the client if it doesn't exist yet
  await prisma.clientTechSheet.upsert({
    where:  { client_id },
    create: { organization_id: orgId, client_id },
    update: {},
  })

  await logActivity({ orgId, userId, action: 'contract.created', entity: 'contract', entityId: contract.id, payload: { title } })
  revalidatePath('/comercial/contracts')
  revalidatePath('/tickets/fichas')
  redirect('/comercial/contracts')
}

export async function sendContractAction(id: string) {
  const denied = await checkModuleAccess('contracts', 'EDIT')
  if (denied) return
  const { orgId, userId } = await requireOrg()
  const token = crypto.randomBytes(32).toString('hex')

  await prisma.contract.updateMany({
    where: { id, organization_id: orgId },
    data: { status: 'SENT', sent_at: new Date(), sign_token: token },
  })

  await logActivity({ orgId, userId, action: 'contract.sent', entity: 'contract', entityId: id })
  revalidatePath(`/comercial/contracts/${id}`)
}

export async function signContractAction(id: string, token: string) {
  await prisma.contract.update({
    where: { id, sign_token: token },
    data: { status: 'SIGNED', signed_at: new Date() },
  })
  redirect('/portal/contracts')
}

export async function cancelContractAction(id: string) {
  const denied = await checkModuleAccess('contracts', 'EDIT')
  if (denied) return
  const { orgId, userId } = await requireOrg()
  await prisma.contract.updateMany({
    where: { id, organization_id: orgId },
    data: { status: 'CANCELLED' },
  })
  await logActivity({ orgId, userId, action: 'contract.cancelled', entity: 'contract', entityId: id })
  revalidatePath(`/comercial/contracts/${id}`)
}
