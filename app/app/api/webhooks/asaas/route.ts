import { NextRequest, NextResponse } from 'next/server'
import { adminPrisma as prisma } from '@/lib/prisma'

/**
 * Asaas Webhook Handler
 * Configure in Asaas dashboard: Settings → Notifications → Add webhook
 * URL: https://orgdesk.com.br/api/webhooks/asaas
 * Events: PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_DELETED, PAYMENT_UPDATED
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event, payment } = body

    if (!payment?.id) {
      return NextResponse.json({ ok: true })
    }

    const asaasId = payment.id as string

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        await prisma.boleto.updateMany({
          where: { asaas_id: asaasId },
          data: {
            status: 'PAID',
            paid_at: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
            paid_amount: payment.value ?? undefined,
          },
        })
        break
      }

      case 'PAYMENT_OVERDUE': {
        await prisma.boleto.updateMany({
          where: { asaas_id: asaasId, status: 'PENDING' },
          data: { status: 'OVERDUE' },
        })
        break
      }

      case 'PAYMENT_DELETED':
      case 'PAYMENT_RESTORED': {
        // No action needed
        break
      }

      case 'PAYMENT_UPDATED': {
        // Could update due_date or value if needed
        break
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[asaas-webhook]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
