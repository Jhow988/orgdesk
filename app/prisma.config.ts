import { defineConfig } from 'prisma/config'
import path from 'node:path'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://orgdesk:orgdesk123@localhost:5432/orgdesk',
  },
})
