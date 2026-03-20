import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Tenant: Syall Soluções
  const syall = await prisma.organization.upsert({
    where: { slug: 'syall' },
    update: {},
    create: {
      slug: 'syall',
      name: 'Syall Soluções',
      plan: 'pro',
      smtp_host: 'mail.syall.com.br',
      smtp_port: 465,
      smtp_user: 'financeiro@syall.com.br',
      smtp_from: 'financeiro@syall.com.br',
      smtp_use_tls: true,
      cnpjs_ignore: ['24347456000190', '20538261000177'],
      send_interval_sec: 15,
    },
  })

  // Admin: Jhonatan Oliveira
  const adminUser = await prisma.user.upsert({
    where: { email: 'financeiro@syall.com.br' },
    update: {},
    create: {
      email: 'financeiro@syall.com.br',
      name: 'Jhonatan Oliveira',
      password_hash: await bcrypt.hash('OrgDesk@2026', 12),
      role: UserRole.ORG_ADMIN,
      email_verified: true,
    },
  })

  // Membership
  await prisma.membership.upsert({
    where: {
      user_id_organization_id: {
        user_id: adminUser.id,
        organization_id: syall.id,
      },
    },
    update: {},
    create: {
      user_id: adminUser.id,
      organization_id: syall.id,
      role: UserRole.ORG_ADMIN,
      accepted_at: new Date(),
    },
  })

  // Template de email padrão
  await prisma.emailTemplate.upsert({
    where: { organization_id: syall.id },
    update: {},
    create: {
      organization_id: syall.id,
      subject: 'Syall Soluções — NF e Boleto referente a {{month_year}}',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Prezado(a) {{client_name}},</h2>
  <p>Segue em anexo sua <strong>Nota Fiscal</strong> e <strong>Boleto</strong> referente ao mês de <strong>{{month_year}}</strong>.</p>
  <p>Em caso de dúvidas, entre em contato conosco.</p>
  <hr style="border: 1px solid #eee; margin: 20px 0;" />
  <p><strong>PIX — Banco Inter:</strong><br/>
  Chave: financeiro@syall.com.br</p>
  <hr style="border: 1px solid #eee; margin: 20px 0;" />
  <p>Atenciosamente,<br/>
  <strong>Equipe Syall Soluções</strong><br/>
  WhatsApp: (12) 98868-7056</p>
  <img src="{{pixel_url}}" width="1" height="1" style="display:none;" alt="" />
</div>`,
    },
  })

  console.log('✅ Seed concluído!')
  console.log(`   Tenant: ${syall.slug} (${syall.name})`)
  console.log(`   Admin:  ${adminUser.email}`)
  console.log(`   Senha:  OrgDesk@2026`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
