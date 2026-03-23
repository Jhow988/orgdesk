import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { adminPrisma } from '@/lib/prisma'

declare module 'next-auth' {
  interface User {
    role: string
    orgId: string | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      orgId: string | null
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    role: string
    orgId: string | null
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!
        token.role = user.role
        token.orgId = user.orgId ?? null
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.orgId = token.orgId as string | null
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await adminPrisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user || !user.is_active) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password_hash)
        if (!valid) return null

        await adminPrisma.user.update({
          where: { id: user.id },
          data: { last_login_at: new Date() },
        })

        let orgId: string | null = null
        if (user.role !== 'SUPER_ADMIN') {
          const membership = await adminPrisma.membership.findFirst({
            where: { user_id: user.id, is_active: true },
            select: { organization_id: true },
          })
          orgId = membership?.organization_id ?? null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId,
        }
      },
    }),
  ],
})
