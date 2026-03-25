'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getCnpjsIgnore(): Promise<string[]> {
  const session = await auth()
  if (!session?.user?.orgId) return []
  const org = await prisma.organization.findUnique({
    where:  { id: session.user.orgId },
    select: { cnpjs_ignore: true },
  })
  return org?.cnpjs_ignore ?? []
}

export async function addCnpjIgnoreAction(cnpj: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.orgId) return { error: 'Não autenticado.' }

  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return { error: 'CNPJ inválido — deve ter 14 dígitos.' }

  const org = await prisma.organization.findUnique({
    where:  { id: session.user.orgId },
    select: { cnpjs_ignore: true },
  })
  if (org?.cnpjs_ignore.includes(clean)) return { error: 'CNPJ já está na lista.' }

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data:  { cnpjs_ignore: { push: clean } },
  })

  revalidatePath('/settings/company')
  return {}
}

export async function removeCnpjIgnoreAction(cnpj: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.orgId) return { error: 'Não autenticado.' }

  const org = await prisma.organization.findUnique({
    where:  { id: session.user.orgId },
    select: { cnpjs_ignore: true },
  })
  if (!org) return { error: 'Organização não encontrada.' }

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data:  { cnpjs_ignore: org.cnpjs_ignore.filter(c => c !== cnpj) },
  })

  revalidatePath('/settings/company')
  return {}
}
