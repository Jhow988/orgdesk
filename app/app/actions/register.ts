'use server'

import { adminPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  org_name: z.string().min(2, 'Nome da empresa muito curto.'),
  cnpj: z.string().optional(),
  admin_name: z.string().min(2, 'Nome muito curto.'),
  email: z.string().email('Email inválido.'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
  password_confirm: z.string(),
}).refine(d => d.password === d.password_confirm, {
  message: 'As senhas não coincidem.',
  path: ['password_confirm'],
})

export type RegisterState = { error?: string; fieldErrors?: Record<string, string> } | undefined

export async function registerAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const raw = {
    org_name: formData.get('org_name') as string,
    cnpj: (formData.get('cnpj') as string)?.trim() || undefined,
    admin_name: formData.get('admin_name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    password_confirm: formData.get('password_confirm') as string,
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as string
      fieldErrors[key] = issue.message
    }
    return { fieldErrors }
  }

  const { org_name, cnpj, admin_name, email, password } = parsed.data

  // Generate slug from org name
  const slug = org_name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Check if email already exists
  const existingUser = await adminPrisma.user.findUnique({ where: { email } })
  if (existingUser) return { error: 'Este email já está cadastrado.' }

  // Check if slug already exists, append random suffix if needed
  let finalSlug = slug
  const slugExists = await adminPrisma.organization.findUnique({ where: { slug } })
  if (slugExists) {
    finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  const password_hash = await bcrypt.hash(password, 12)

  try {
    await adminPrisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: org_name, slug: finalSlug, cnpj: cnpj || null },
      })

      const user = await tx.user.create({
        data: {
          name: admin_name,
          email,
          password_hash,
          role: 'ORG_ADMIN',
          email_verified: false,
        },
      })

      await tx.membership.create({
        data: {
          user_id: user.id,
          organization_id: org.id,
          role: 'ORG_ADMIN',
        },
      })
    })
  } catch {
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  redirect('/login?registered=1')
}
