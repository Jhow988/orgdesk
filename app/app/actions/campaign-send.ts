'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import { checkModuleAccess } from './permissions'
import { sendEmail as mailerSendEmail, resolveFromAddress } from '@/lib/mailer'
import type { Organization } from '@prisma/client'

// ─── PDF helpers ─────────────────────────────────────────────────────────────

// Usa o singleton S3Client de lib/storage ao invés de criar uma nova instância
import { fetchFile as fetchPdfBuffer } from '@/lib/storage'

async function extractPages(pdfBuffer: Buffer, pages: number[]): Promise<Buffer> {
  const { PDFDocument } = await import('pdf-lib')
  const src = await PDFDocument.load(pdfBuffer)
  const out = await PDFDocument.create()
  for (const pageNum of pages) {
    const idx = pageNum - 1 // convert 1-indexed to 0-indexed
    if (idx >= 0 && idx < src.getPageCount()) {
      const [page] = await out.copyPages(src, [idx])
      out.addPage(page)
    }
  }
  return Buffer.from(await out.save())
}

// ─── Email ───────────────────────────────────────────────────────────────────

function bodyToHtmlParagraphs(text: string): string {
  return text
    .split(/\n\n+/)
    .map(block => {
      const lines = block
        .split('\n')
        .map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        .join('<br>')
      return `<p style="margin:0 0 12px 0">${lines}</p>`
    })
    .join('')
}

function buildEmailHtmlFromTemplate(
  templateBody: string,
  vars: { nome_cliente: string; mes_ano: string; link_portal: string },
  pixelUrl: string,
): string {
  const rendered = templateBody
    .replace(/\{nome_cliente\}/g, vars.nome_cliente)
    .replace(/\{mes_ano\}/g,      vars.mes_ano)
    .replace(/\{link_portal\}/g,  vars.link_portal)

  const bodyHtml = bodyToHtmlParagraphs(rendered)

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.08);overflow:hidden;max-width:600px;width:100%">
  <tr><td style="background:#1a2e4a;padding:22px 32px">
    <p style="margin:0;color:#fff;font-size:19px;font-weight:700;letter-spacing:.3px">Syall Soluções</p>
    <p style="margin:3px 0 0;color:#93adc8;font-size:12px">Departamento Financeiro</p>
  </td></tr>
  <tr><td style="padding:28px 32px;color:#374151;font-size:14px;line-height:1.7">
    ${bodyHtml}
  </td></tr>
  <tr><td style="background:#f9fafb;padding:14px 32px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
    Este e-mail foi gerado automaticamente pelo sistema OrgDesk.
  </td></tr>
</table>
</td></tr></table>
<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0" alt="">
</body></html>`
}

async function sendEmail(opts: {
  org:             Organization
  to:              string[]
  nome:            string
  mesAno:          string
  portalUrl:       string
  templateSubject: string
  templateBody:    string
  nfBuffer?:       Buffer
  nfFilename?:     string
  boletoBuffer?:   Buffer
  boletoFilename?: string
  pixelId:         string
}) {
  const baseUrl  = process.env.NEXTAUTH_URL ?? 'https://orgdesk.com.br'
  const pixelUrl = `${baseUrl}/api/track/${opts.pixelId}`

  const vars = { nome_cliente: opts.nome, mes_ano: opts.mesAno, link_portal: opts.portalUrl }

  const subject = opts.templateSubject
    .replace(/\{nome_cliente\}/g, vars.nome_cliente)
    .replace(/\{mes_ano\}/g,      vars.mes_ano)
    .replace(/\{link_portal\}/g,  vars.link_portal)

  const html = buildEmailHtmlFromTemplate(opts.templateBody, vars, pixelUrl)

  const text = opts.templateBody
    .replace(/\{nome_cliente\}/g, vars.nome_cliente)
    .replace(/\{mes_ano\}/g,      vars.mes_ano)
    .replace(/\{link_portal\}/g,  vars.link_portal)

  const attachments: { filename: string; content: Buffer; contentType: string }[] = []
  if (opts.nfBuffer     && opts.nfFilename)     attachments.push({ filename: opts.nfFilename,     content: opts.nfBuffer,     contentType: 'application/pdf' })
  if (opts.boletoBuffer && opts.boletoFilename) attachments.push({ filename: opts.boletoFilename, content: opts.boletoBuffer, contentType: 'application/pdf' })

  // Usa SMTP da org (com fallback para env vars via lib/mailer)
  await mailerSendEmail(opts.org, { to: opts.to, subject, html, text, attachments })
}

// ─── Main action ──────────────────────────────────────────────────────────────

import { DEFAULT_SUBJECT, DEFAULT_BODY } from './email-templates-defaults'

export async function enviarSendsAction(
  sendIds:         string[],
  templateId:      string | null = null,
  withAttachments: boolean = true,
): Promise<{ ok: boolean; error?: string; count?: number }> {
  const denied = await checkModuleAccess('cobranca', 'FULL')
  if (denied) return { ok: false, error: denied }
  const session = await auth()
  if (!session?.user?.orgId) return { ok: false, error: 'Não autenticado.' }
  if (!sendIds.length)        return { ok: false, error: 'Nenhum registro selecionado.' }

  // Fetch sends with campaign info
  const sends = await prisma.campaignSend.findMany({
    where: {
      id: { in: sendIds },
      campaign: { organization_id: session.user.orgId },
      status: { in: ['PENDING', 'FAILED'] },
    },
    include: {
      campaign: { select: { label: true, month_year: true, pdf_nf_key: true, pdf_boleto_key: true } },
    },
  })

  if (!sends.length) return { ok: false, error: 'Nenhum registro pendente encontrado.' }

  // Busca org (SMTP config) + template + portal tokens em paralelo
  const cnpjs = [...new Set(sends.map(s => s.client_cnpj))]
  type TokenRow = { cnpj: string; portal_token: string | null }

  const [org, templateRow, tokenRows] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.user.orgId } }),
    templateId
      ? prisma.emailTemplate.findFirst({ where: { id: templateId, organization_id: session.user.orgId } })
      : Promise.resolve(null),
    cnpjs.length > 0
      ? prisma.$queryRaw<TokenRow[]>`
          SELECT cnpj, portal_token FROM clients
          WHERE organization_id = ${session.user.orgId}
            AND cnpj = ANY(${cnpjs}::text[])
        `
      : Promise.resolve([]),
  ])

  if (!org) return { ok: false, error: 'Organização não encontrada.' }

  const templateSubject = templateRow?.subject ?? DEFAULT_SUBJECT
  const templateBody    = templateRow?.body    ?? DEFAULT_BODY
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://orgdesk.com.br'
  const portalTokenMap = new Map((tokenRows as TokenRow[]).map(r => [r.cnpj, r.portal_token]))

  // Group sends by campaign to fetch PDFs once per campaign (skip when no attachments)
  const campaignBuffers = new Map<string, { nf: Buffer; boleto?: Buffer }>()

  if (withAttachments) {
    for (const send of sends) {
      const campId = send.campaign_id
      if (!campaignBuffers.has(campId)) {
        const nfBuffer = send.campaign.pdf_nf_key
          ? await fetchPdfBuffer(send.campaign.pdf_nf_key)
          : null
        const boletoBuffer = send.campaign.pdf_boleto_key
          ? await fetchPdfBuffer(send.campaign.pdf_boleto_key).catch(() => undefined)
          : undefined
        if (nfBuffer) campaignBuffers.set(campId, { nf: nfBuffer, boleto: boletoBuffer })
      }
    }
  }

  let successCount = 0

  for (const send of sends) {
    const buffers = withAttachments ? campaignBuffers.get(send.campaign_id) : undefined
    if (withAttachments && !buffers) {
      await prisma.campaignSend.update({
        where: { id: send.id },
        data: { status: 'FAILED', error_msg: 'PDF da campanha não encontrado.' },
      })
      continue
    }

    if (send.emails.length === 0) {
      await prisma.campaignSend.update({
        where: { id: send.id },
        data: { status: 'NO_EMAIL' },
      })
      continue
    }

    try {
      // Extract client-specific PDF pages (only when attachments enabled)
      const nfBuffer = (withAttachments && buffers)
        ? (send.nf_pages.length > 0 ? await extractPages(buffers.nf, send.nf_pages) : buffers.nf)
        : undefined

      const boletoBuffer = (withAttachments && buffers && send.boleto_pages.length > 0 && buffers.boleto)
        ? await extractPages(buffers.boleto, send.boleto_pages)
        : undefined

      const mesAno  = send.campaign.label
      const mesSlug = send.campaign.month_year.replace('-', '')
      const pixelId = crypto.randomBytes(12).toString('base64url')
      const token   = portalTokenMap.get(send.client_cnpj)
      const portalUrl = token ? `${baseUrl}/c/${token}` : baseUrl

      await sendEmail({
        org,
        to:              send.emails,
        nome:            send.client_name,
        mesAno,
        portalUrl,
        templateSubject,
        templateBody,
        nfBuffer,
        nfFilename:      nfBuffer ? `NF_${send.client_cnpj}_${mesSlug}.pdf` : undefined,
        boletoBuffer,
        boletoFilename:  boletoBuffer ? `Boleto_${send.client_cnpj}_${mesSlug}.pdf` : undefined,
        pixelId,
      })

      await prisma.campaignSend.update({
        where: { id: send.id },
        data: { status: 'SENT', sent_at: new Date(), pixel_id: pixelId, error_msg: null },
      })
      successCount++
    } catch (err: any) {
      await prisma.campaignSend.update({
        where: { id: send.id },
        data: { status: 'FAILED', error_msg: String(err?.message ?? err).slice(0, 500) },
      })
    }
  }

  revalidatePath('/financeiro/enviar-cobranca')
  return { ok: true, count: successCount }
}
