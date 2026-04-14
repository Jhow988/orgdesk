'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return session.user.orgId as string
}

function parseCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export async function listEmpresasAction() {
  const orgId = await requireOrg()
  return prisma.empresa.findMany({
    where: { organization_id: orgId },
    orderBy: { name: 'asc' },
  })
}

export async function getEmpresasForSelectAction() {
  const orgId = await requireOrg()
  return prisma.empresa.findMany({
    where: { organization_id: orgId, is_active: true },
    select: { id: true, name: true, cnpj: true },
    orderBy: { name: 'asc' },
  })
}

export async function createEmpresaAction(_prev: unknown, formData: FormData) {
  const orgId = await requireOrg()

  const name = (formData.get('name') as string)?.trim()
  const cnpjRaw = parseCnpj((formData.get('cnpj') as string) ?? '')
  const email = (formData.get('email') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null
  const address = (formData.get('address') as string)?.trim() || null

  if (!name) return { error: 'Nome é obrigatório.' }
  if (cnpjRaw.length !== 14) return { error: 'CNPJ inválido. Informe 14 dígitos.' }

  const existing = await prisma.empresa.findUnique({
    where: { organization_id_cnpj: { organization_id: orgId, cnpj: cnpjRaw } },
  })
  if (existing) return { error: 'Este CNPJ já está cadastrado.' }

  await prisma.empresa.create({
    data: { organization_id: orgId, name, cnpj: cnpjRaw, email, phone, address },
  })

  revalidatePath('/settings/empresa')
  return { success: true }
}

export async function updateEmpresaAction(
  id: string,
  data: {
    name: string
    cnpj: string
    email?: string | null
    phone?: string | null
    address?: string | null
    is_active: boolean
  }
) {
  const orgId = await requireOrg()

  const cnpjRaw = parseCnpj(data.cnpj)
  if (!data.name?.trim()) return { error: 'Nome é obrigatório.' }
  if (cnpjRaw.length !== 14) return { error: 'CNPJ inválido. Informe 14 dígitos.' }

  // Check uniqueness ignoring the current record
  const existing = await prisma.empresa.findFirst({
    where: {
      organization_id: orgId,
      cnpj: cnpjRaw,
      NOT: { id },
    },
  })
  if (existing) return { error: 'Este CNPJ já está cadastrado em outra empresa.' }

  await prisma.empresa.updateMany({
    where: { id, organization_id: orgId },
    data: {
      name: data.name.trim(),
      cnpj: cnpjRaw,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      is_active: data.is_active,
    },
  })

  revalidatePath('/settings/empresa')
  return { success: true }
}

export async function deleteEmpresaAction(id: string) {
  const orgId = await requireOrg()
  await prisma.empresa.deleteMany({ where: { id, organization_id: orgId } })
  revalidatePath('/settings/empresa')
}
