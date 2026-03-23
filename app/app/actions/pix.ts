'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return session.user.orgId as string
}

export async function createPixChargeAction(_prev: unknown, formData: FormData) {
  const orgId = await requireOrg()

  const client_id = formData.get('client_id') as string
  const description = (formData.get('description') as string)?.trim()
  const amount = parseFloat(formData.get('amount') as string)

  if (!client_id || !description || !amount || amount <= 0) {
    return { error: 'Cliente, descrição e valor são obrigatórios.' }
  }

  const expires_at = formData.get('expires_at') as string
  const pix_key = (formData.get('pix_key') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  await prisma.pixCharge.create({
    data: {
      organization_id: orgId,
      client_id,
      description,
      amount,
      pix_key,
      notes,
      expires_at: expires_at ? new Date(expires_at) : null,
    },
  })

  revalidatePath('/financeiro/pix')
  redirect('/financeiro/pix')
}

export async function markPixPaidAction(id: string) {
  const orgId = await requireOrg()
  await prisma.pixCharge.updateMany({
    where: { id, organization_id: orgId },
    data: { status: 'PAID', paid_at: new Date() },
  })
  revalidatePath(`/financeiro/pix/${id}`)
  revalidatePath('/financeiro/pix')
}

export async function cancelPixAction(id: string) {
  const orgId = await requireOrg()
  await prisma.pixCharge.updateMany({
    where: { id, organization_id: orgId },
    data: { status: 'CANCELLED' },
  })
  revalidatePath(`/financeiro/pix/${id}`)
  revalidatePath('/financeiro/pix')
}
