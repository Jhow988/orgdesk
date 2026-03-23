'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function enviarSendsAction(sendIds: string[]): Promise<{ ok: boolean; error?: string; count?: number }> {
  const session = await auth()
  if (!session?.user?.orgId) return { ok: false, error: 'Não autenticado.' }
  if (!sendIds.length) return { ok: false, error: 'Nenhum registro selecionado.' }

  // Verify all sends belong to this org
  const sends = await prisma.campaignSend.findMany({
    where: {
      id: { in: sendIds },
      campaign: { organization_id: session.user.orgId },
    },
    select: { id: true, status: true },
  })

  if (!sends.length) return { ok: false, error: 'Registros não encontrados.' }

  const pending = sends.filter(s => s.status === 'PENDING' || s.status === 'FAILED')
  if (!pending.length) return { ok: false, error: 'Todos os registros já foram enviados.' }

  await prisma.campaignSend.updateMany({
    where: { id: { in: pending.map(s => s.id) } },
    data: { status: 'SENT', sent_at: new Date() },
  })

  revalidatePath('/financeiro/enviar-cobranca')
  return { ok: true, count: pending.length }
}
