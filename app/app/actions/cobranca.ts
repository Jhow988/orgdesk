'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export type CobrancaState = { error?: string; success?: string; cobrancaId?: string; tipo?: string } | null

export async function enviarCobrancaAction(prev: CobrancaState, data: FormData): Promise<CobrancaState> {
  const session = await auth()
  if (!session?.user?.orgId) return { error: 'Não autenticado.' }

  const orgId = session.user.orgId
  const tipo       = data.get('tipo') as string        // 'PIX' | 'BOLETO'
  const clientId   = data.get('client_id') as string
  const descricao  = data.get('descricao') as string
  const valor      = parseFloat(data.get('valor') as string)
  const vencimento = data.get('vencimento') as string  // date string
  const pixKey     = data.get('pix_key') as string
  const obs        = data.get('observacoes') as string

  if (!tipo || !clientId || !descricao || isNaN(valor) || valor <= 0) {
    return { error: 'Preencha todos os campos obrigatórios.' }
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, organization_id: orgId },
    select: { id: true },
  })
  if (!client) return { error: 'Cliente não encontrado.' }

  if (tipo === 'PIX') {
    const charge = await prisma.pixCharge.create({
      data: {
        organization_id: orgId,
        client_id: clientId,
        description: descricao,
        amount: valor,
        pix_key: pixKey || null,
        notes: obs || null,
        expires_at: vencimento ? new Date(vencimento) : null,
        status: 'PENDING',
      },
    })
    redirect(`/financeiro/pix/${charge.id}`)
  }

  if (tipo === 'BOLETO') {
    if (!vencimento) return { error: 'Informe o vencimento para boleto.' }
    const boleto = await prisma.boleto.create({
      data: {
        organization_id: orgId,
        client_id: clientId,
        description: descricao,
        amount: valor,
        due_date: new Date(vencimento),
        notes: obs || null,
        status: 'PENDING',
      },
    })
    redirect(`/boletos/${boleto.id}`)
  }

  return { error: 'Tipo de cobrança inválido.' }
}
