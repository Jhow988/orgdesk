import nodemailer from 'nodemailer'
import { decrypt } from './crypto'
import type { Organization } from '@prisma/client'

export function createTransporter(org: Organization) {
  if (!org.smtp_host || !org.smtp_user || !org.smtp_pass_enc) {
    throw new Error(`SMTP não configurado para o tenant ${org.slug}`)
  }

  const smtpPass = decrypt(org.smtp_pass_enc)

  return nodemailer.createTransport({
    host: org.smtp_host,
    port: org.smtp_port ?? 465,
    secure: org.smtp_use_tls,
    auth: {
      user: org.smtp_user,
      pass: smtpPass,
    },
  })
}

export async function sendEmail(
  org: Organization,
  options: {
    to: string | string[]
    subject: string
    html: string
    attachments?: { filename: string; content: Buffer; contentType: string }[]
  }
) {
  const transporter = createTransporter(org)

  return transporter.sendMail({
    from: org.smtp_from ?? org.smtp_user!,
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  })
}
