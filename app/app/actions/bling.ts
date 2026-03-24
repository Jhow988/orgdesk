'use server'

import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { syncContatos, syncContasReceber, getBlingAuthUrl, updateContatoBling, type ReceivableFilters } from '@/lib/bling'
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

export async function syncReceivablesAction(filters: ReceivableFilters): Promise<{
  upserted?: number
  skipped?:  number
  errors?:   number
  error?:    string
}> {
  const orgId = await requireOrg()
  try {
    const result = await syncContasReceber(orgId, filters)
    revalidatePath('/invoices')
    return result
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro desconhecido' }
  }
}

export async function updateClientAction(
  clientId: string,
  data: { name: string; trade_name: string; email: string; phone: string },
): Promise<{ error?: string; blingWarning?: string }> {
  const orgId = await requireOrg()

  // 1. Update local DB
  const updated = await adminPrisma.client.update({
    where: { id: clientId, organization_id: orgId },
    data: {
      name:       data.name,
      trade_name: data.trade_name || null,
      email:      data.email || null,
      phone:      data.phone || null,
    },
    select: { bling_id: true },
  })

  revalidatePath('/clients')

  // 2. Sync to Bling if connected
  if (updated.bling_id) {
    try {
      await updateContatoBling(orgId, updated.bling_id, data)
    } catch (e) {
      return { blingWarning: e instanceof Error ? e.message : 'Erro ao atualizar no Bling' }
    }
  }

  return {}
}

export async function disconnectBlingAction(): Promise<{ error?: string }> {
  const orgId = await requireOrg()
  try {
    await adminPrisma.blingIntegration.delete({ where: { organization_id: orgId } })
  } catch { /* not connected — ignore */ }
  revalidatePath('/clients')
  return {}
}
