'use server'

import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { syncContatos, getBlingAuthUrl } from '@/lib/bling'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireOrg(): Promise<string> {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return session.user.orgId as string
}

export async function getBlingConnectUrlAction(): Promise<{ url?: string; error?: string }> {
  const orgId = await requireOrg()
  try {
    return { url: getBlingAuthUrl(orgId) }
  } catch {
    return { error: 'Erro ao gerar URL de conexão.' }
  }
}

export async function syncBlingAction(): Promise<{
  upserted?: number
  skipped?:  number
  errors?:   number
  error?:    string
}> {
  const orgId = await requireOrg()
  try {
    const result = await syncContatos(orgId)
    revalidatePath('/clients')
    return result
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro desconhecido' }
  }
}

export async function disconnectBlingAction(): Promise<{ error?: string }> {
  const orgId = await requireOrg()
  try {
    await adminPrisma.blingIntegration.delete({ where: { organization_id: orgId } })
  } catch { /* not connected — ignore */ }
  revalidatePath('/clients')
  return {}
}
