'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkModuleAccess } from './permissions'
import { logActivity } from '@/lib/activity'
import { sendEmail } from '@/lib/mailer'

async function requireOrg() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')
  return { orgId: session.user.orgId as string, userId: session.user.id }
}

const VALID_ITEM_TYPES = ['MONTHLY_SERVICE', 'ONETIME_SERVICE', 'EQUIPMENT_RENTAL', 'EQUIPMENT_PURCHASE']

const ITEM_TYPE_LABEL: Record<string, string> = {
  MONTHLY_SERVICE:    'Serviços Mensais',
  ONETIME_SERVICE:    'Serviços Avulsos',
  EQUIPMENT_RENTAL:   'Equipamentos Alugados',
  EQUIPMENT_PURCHASE: 'Equipamentos Comprados',
}

function parseItems(formData: FormData) {
  const count = parseInt(formData.get('items_count') as string) || 0
  const items = []
  for (let i = 0; i < count; i++) {
    const description = (formData.get(`items[${i}][description]`) as string)?.trim()
    if (!description) continue
    const itemType = (formData.get(`items[${i}][item_type]`) as string) || 'MONTHLY_SERVICE'
    items.push({
      product_id: (formData.get(`items[${i}][product_id]`) as string) || null,
      description,
      unit: (formData.get(`items[${i}][unit]`) as string) || 'un',
      quantity: parseFloat(formData.get(`items[${i}][quantity]`) as string) || 1,
      unit_price: parseFloat(formData.get(`items[${i}][unit_price]`) as string) || 0,
      total: parseFloat(formData.get(`items[${i}][total]`) as string) || 0,
      item_type: (VALID_ITEM_TYPES.includes(itemType) ? itemType : 'MONTHLY_SERVICE') as any,
      sort_order: i,
    })
  }
  return items
}

function parseProposalFields(formData: FormData) {
  return {
    title:          (formData.get('title') as string)?.trim(),
    client_id:      formData.get('client_id') as string,
    total:          parseFloat(formData.get('total') as string) || 0,
    total_monthly:  parseFloat(formData.get('total_monthly') as string) || 0,
    total_onetime:  parseFloat(formData.get('total_onetime') as string) || 0,
    discount:       parseFloat(formData.get('discount') as string) || 0,
    freight:        parseFloat(formData.get('freight') as string) || 0,
    valid_until:    formData.get('valid_until') as string,
    payment_method: (formData.get('payment_method') as string)?.trim() || null,
    notes:          (formData.get('notes') as string)?.trim() || null,
  }
}

export async function createProposalAction(_prev: unknown, formData: FormData) {
  const denied = await checkModuleAccess('proposals', 'CREATE')
  if (denied) return { error: denied }
  const { orgId, userId } = await requireOrg()

  const fields = parseProposalFields(formData)
  if (!fields.title || !fields.client_id) return { error: 'Título e cliente são obrigatórios.' }

  const lastProposal = await prisma.proposal.findFirst({
    where: { organization_id: orgId },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  const number = (lastProposal?.number ?? 0) + 1
  const items = parseItems(formData)

  const proposal = await prisma.proposal.create({
    data: {
      organization_id: orgId,
      client_id: fields.client_id,
      number,
      title: fields.title,
      discount: fields.discount,
      total: fields.total,
      total_monthly: fields.total_monthly,
      total_onetime: fields.total_onetime,
      freight: fields.freight,
      payment_method: fields.payment_method,
      notes: fields.notes,
      valid_until: fields.valid_until ? new Date(fields.valid_until) : null,
      items: { create: items },
    },
  })

  await logActivity({ orgId, userId, action: 'proposal.created', entity: 'proposal', entityId: proposal.id, payload: { title: fields.title, number } })
  revalidatePath('/comercial/proposals')
  redirect('/comercial/proposals')
}

export async function updateProposalAction(_prev: unknown, formData: FormData) {
  const denied = await checkModuleAccess('proposals', 'EDIT')
  if (denied) return { error: denied }
  const { orgId, userId } = await requireOrg()

  const id = formData.get('proposal_id') as string
  if (!id) return { error: 'ID da proposta inválido.' }

  const fields = parseProposalFields(formData)
  if (!fields.title || !fields.client_id) return { error: 'Título e cliente são obrigatórios.' }

  const existing = await prisma.proposal.findFirst({ where: { id, organization_id: orgId } })
  if (!existing) return { error: 'Proposta não encontrada.' }

  const items = parseItems(formData)

  await prisma.$transaction([
    prisma.proposalItem.deleteMany({ where: { proposal_id: id } }),
    prisma.proposal.update({
      where: { id },
      data: {
        client_id: fields.client_id,
        title: fields.title,
        discount: fields.discount,
        total: fields.total,
        total_monthly: fields.total_monthly,
        total_onetime: fields.total_onetime,
        freight: fields.freight,
        payment_method: fields.payment_method,
        notes: fields.notes,
        valid_until: fields.valid_until ? new Date(fields.valid_until) : null,
        items: { create: items },
      },
    }),
  ])

  await logActivity({ orgId, userId, action: 'proposal.updated', entity: 'proposal', entityId: id, payload: { title: fields.title } })
  revalidatePath(`/comercial/proposals/${id}`)
  redirect(`/comercial/proposals/${id}`)
}

export async function updateProposalStatusAction(id: string, status: string) {
  const denied = await checkModuleAccess('proposals', 'EDIT')
  if (denied) return
  const { orgId, userId } = await requireOrg()
  const data: any = { status }
  if (status === 'SENT')     data.sent_at     = new Date()
  if (status === 'ACCEPTED') data.accepted_at = new Date()
  if (status === 'REJECTED') data.rejected_at = new Date()

  await prisma.proposal.updateMany({ where: { id, organization_id: orgId }, data })
  await logActivity({ orgId, userId, action: 'proposal.status_changed', entity: 'proposal', entityId: id, payload: { status } })
  revalidatePath(`/comercial/proposals/${id}`)
}

export async function sendProposalEmailAction(id: string) {
  const denied = await checkModuleAccess('proposals', 'EDIT')
  if (denied) return { error: denied }
  const { orgId, userId } = await requireOrg()

  const proposal = await prisma.proposal.findFirst({
    where: { id, organization_id: orgId },
    include: {
      client:       { select: { name: true, email: true } },
      items:        { orderBy: { sort_order: 'asc' } },
      organization: true,
    },
  })
  if (!proposal) return { error: 'Proposta não encontrada.' }
  if (!proposal.client.email) return { error: 'Cliente não possui e-mail cadastrado.' }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const TYPE_ORDER = ['MONTHLY_SERVICE', 'ONETIME_SERVICE', 'EQUIPMENT_RENTAL', 'EQUIPMENT_PURCHASE']
  const grouped = TYPE_ORDER.map(type => ({
    label: ITEM_TYPE_LABEL[type],
    items: proposal.items.filter(i => (i as any).item_type === type),
  })).filter(g => g.items.length > 0)

  const itemsHtml = grouped.map(group => `
    <tr><td colspan="4" style="padding:10px 16px 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-top:1px solid #e5e7eb">${group.label}</td></tr>
    ${group.items.map(item => `
      <tr>
        <td style="padding:8px 16px;font-size:13px;color:#111827">${item.description} <span style="color:#9ca3af;font-size:11px">${item.unit ?? ''}</span></td>
        <td style="padding:8px 16px;font-size:13px;color:#6b7280;text-align:right">${Number(item.quantity)}</td>
        <td style="padding:8px 16px;font-size:13px;color:#6b7280;text-align:right">${fmt(Number(item.unit_price))}</td>
        <td style="padding:8px 16px;font-size:13px;font-weight:600;color:#111827;text-align:right">${fmt(Number(item.total))}</td>
      </tr>
    `).join('')}
  `).join('')

  const monthly = proposal.items.filter(i => (i as any).item_type === 'MONTHLY_SERVICE').reduce((s, i) => s + Number(i.total), 0)
  const onetime = proposal.items.filter(i => (i as any).item_type !== 'MONTHLY_SERVICE').reduce((s, i) => s + Number(i.total), 0)

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#1e1b4b;padding:24px 32px">
      <h1 style="margin:0;font-size:18px;color:#fff">${proposal.organization.name}</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#a5b4fc">Proposta Comercial</p>
    </div>
    <div style="padding:24px 32px">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Para: <strong style="color:#111827">${proposal.client.name}</strong></p>
      <h2 style="margin:8px 0 4px;font-size:20px;color:#111827">${proposal.title}</h2>
      <p style="margin:0;font-size:12px;color:#9ca3af">
        Proposta Nº ${String(proposal.number).padStart(4, '0')}
        ${proposal.valid_until ? ` · Válida até ${new Date(proposal.valid_until).toLocaleDateString('pt-BR')}` : ''}
        ${(proposal as any).payment_method ? ` · ${(proposal as any).payment_method}` : ''}
      </p>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:10px 16px;font-size:11px;text-align:left;color:#6b7280;font-weight:600;text-transform:uppercase">Descrição</th>
          <th style="padding:10px 16px;font-size:11px;text-align:right;color:#6b7280;font-weight:600;text-transform:uppercase">Qtd</th>
          <th style="padding:10px 16px;font-size:11px;text-align:right;color:#6b7280;font-weight:600;text-transform:uppercase">Unitário</th>
          <th style="padding:10px 16px;font-size:11px;text-align:right;color:#6b7280;font-weight:600;text-transform:uppercase">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb">
      ${monthly > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;color:#4f46e5">Total Mensal</span><strong style="font-size:13px;color:#4f46e5">${fmt(monthly)}</strong></div>` : ''}
      ${onetime > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;color:#0284c7">Total Avulso + Equipamentos</span><strong style="font-size:13px;color:#0284c7">${fmt(onetime)}</strong></div>` : ''}
      ${Number((proposal as any).freight) > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;color:#6b7280">Frete</span><strong style="font-size:13px;color:#374151">${fmt(Number((proposal as any).freight))}</strong></div>` : ''}
      ${Number(proposal.discount) > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;color:#6b7280">Desconto</span><strong style="font-size:13px;color:#dc2626">-${fmt(Number(proposal.discount))}</strong></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid #e5e7eb">
        <span style="font-size:14px;font-weight:600;color:#111827">Total Geral</span>
        <strong style="font-size:16px;color:#111827">${fmt(Number(proposal.total))}</strong>
      </div>
    </div>
    ${proposal.notes ? `<div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb"><p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af">Observações</p><p style="margin:0;font-size:13px;color:#374151;white-space:pre-wrap">${proposal.notes}</p></div>` : ''}
    <div style="padding:16px 32px;text-align:center;font-size:11px;color:#9ca3af">
      Em caso de dúvidas, entre em contato com nossa equipe.
    </div>
  </div>
</body>
</html>`

  try {
    await sendEmail(proposal.organization, {
      to: proposal.client.email,
      subject: `Proposta #${String(proposal.number).padStart(4, '0')} – ${proposal.title}`,
      html,
    })
    // Mark as SENT if still DRAFT
    if (proposal.status === 'DRAFT') {
      await prisma.proposal.update({ where: { id }, data: { status: 'SENT', sent_at: new Date() } })
    }
    await logActivity({ orgId, userId, action: 'proposal.email_sent', entity: 'proposal', entityId: id, payload: { to: proposal.client.email } })
    revalidatePath(`/comercial/proposals/${id}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message ?? 'Erro ao enviar e-mail.' }
  }
}
