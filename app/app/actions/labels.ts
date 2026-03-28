'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ORG_ADMIN') {
    throw new Error('Apenas administradores podem gerenciar etiquetas.')
  }
  return { orgId: session.user.orgId as string, userId: session.user.id }
}

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return { orgId: session.user.orgId as string }
}

export async function listLabelsAction() {
  const { orgId } = await requireOrg()
  return prisma.salesLabel.findMany({
    where:   { organization_id: orgId },
    orderBy: { name: 'asc' },
  })
}

export async function createLabelAction(_prev: unknown, formData: FormData) {
  try {
    const { orgId } = await requireAdmin()
    const name  = (formData.get('name') as string)?.trim()
    const color = (formData.get('color') as string) || '#6366f1'
    const description = (formData.get('description') as string)?.trim() || null
    if (!name) return { error: 'Nome é obrigatório.' }

    await prisma.salesLabel.create({
      data: { organization_id: orgId, name, color, description },
    })
    revalidatePath('/comercial/labels')
    return { ok: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function updateLabelAction(_prev: unknown, formData: FormData) {
  try {
    const { orgId } = await requireAdmin()
    const id    = formData.get('id') as string
    const name  = (formData.get('name') as string)?.trim()
    const color = (formData.get('color') as string) || '#6366f1'
    const description = (formData.get('description') as string)?.trim() || null
    if (!name) return { error: 'Nome é obrigatório.' }

    await prisma.salesLabel.updateMany({
      where: { id, organization_id: orgId },
      data:  { name, color, description },
    })
    revalidatePath('/comercial/labels')
    return { ok: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteLabelAction(id: string) {
  try {
    const { orgId } = await requireAdmin()
    await prisma.salesLabel.deleteMany({ where: { id, organization_id: orgId } })
    revalidatePath('/comercial/labels')
    return { ok: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function setProposalLabelsAction(proposalId: string, labelIds: string[]) {
  const { orgId } = await requireOrg()
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, organization_id: orgId },
  })
  if (!proposal) return { error: 'Proposta não encontrada.' }

  await prisma.proposalLabel.deleteMany({ where: { proposal_id: proposalId } })
  if (labelIds.length > 0) {
    await prisma.proposalLabel.createMany({
      data: labelIds.map(label_id => ({ proposal_id: proposalId, label_id })),
    })
  }
  revalidatePath(`/comercial/proposals/${proposalId}`)
  revalidatePath('/comercial/proposals')
  return { ok: true }
}

export async function setContractLabelsAction(contractId: string, labelIds: string[]) {
  const { orgId } = await requireOrg()
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, organization_id: orgId },
  })
  if (!contract) return { error: 'Contrato não encontrado.' }

  await prisma.contractLabel.deleteMany({ where: { contract_id: contractId } })
  if (labelIds.length > 0) {
    await prisma.contractLabel.createMany({
      data: labelIds.map(label_id => ({ contract_id: contractId, label_id })),
    })
  }
  revalidatePath(`/comercial/contracts/${contractId}`)
  revalidatePath('/comercial/contracts')
  return { ok: true }
}
