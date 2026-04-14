import nodemailer from 'nodemailer'
import { decrypt } from './crypto'
import type { Organization } from '@prisma/client'

// ─── SMTP da organização (configurado no painel) ──────────────────────────────
export function createTransporter(org: Organization) {
  if (!org.smtp_host || !org.smtp_user || !org.smtp_pass_enc) {
    throw new Error(`SMTP não configurado para o tenant ${org.slug}`)
  }

  return nodemailer.createTransport({
    host:   org.smtp_host,
    port:   org.smtp_port ?? 465,
    secure: org.smtp_use_tls,
    auth:   { user: org.smtp_user, pass: decrypt(org.smtp_pass_enc) },
  })
}

// ─── SMTP com fallback para variáveis de ambiente ─────────────────────────────
// Usa SMTP da org se configurado; cai no SMTP global do sistema como fallback.
export function createTransporterWithFallback(org: Organization) {
  if (org.smtp_host && org.smtp_user && org.smtp_pass_enc) {
    return createTransporter(org)
  }

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) {
    throw new Error('SMTP não configurado — configure nas configurações da organização ou nas variáveis de ambiente.')
  }

  return nodemailer.createTransport({
    host,
    port:   parseInt(process.env.SMTP_PORT ?? '465'),
    secure: (process.env.SMTP_PORT ?? '465') === '465',
    auth:   { user, pass },
  })
}

// ─── Endereço "from" resolvido por prioridade ─────────────────────────────────
export function resolveFromAddress(org: Organization): string {
  // 1. smtp_from configurado na org (ex: "Empresa X <financeiro@empresa.com>")
  if (org.smtp_from) return org.smtp_from
  // 2. smtp_user da org
  if (org.smtp_user) return org.smtp_user
  // 3. fallback global
  return process.env.SMTP_USER ?? ''
}

// ─── Envio unificado com suporte a fallback ───────────────────────────────────
export async function sendEmail(
  org: Organization,
  options: {
    to:           string | string[]
    subject:      string
    html:         string
    text?:        string
    attachments?: { filename: string; content: Buffer; contentType: string }[]
  }
) {
  const transporter = createTransporterWithFallback(org)

  return transporter.sendMail({
    from:        resolveFromAddress(org),
    to:          Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject:     options.subject,
    html:        options.html,
    text:        options.text,
    attachments: options.attachments?.map(a => ({
      filename:    a.filename,
      content:     a.content,
      contentType: a.contentType,
    })),
  })
}
