# PROMPT MASTER — OrgDesk SaaS Multi-Tenant
# Baseado no Syall NF Manager (código real de produção)
# Cole este prompt inteiro na Agent View do Antigravity

---

## CONTEXTO

Você vai transformar o **Syall NF Manager** — um sistema local Node.js que já existe e funciona em produção — em um **SaaS multi-tenant** chamado **OrgDesk**, mantendo 100% da lógica de negócio já validada e adicionando a camada de multi-tenancy, autenticação e infraestrutura para deploy no Coolify.

O sistema original já possui:
- Servidor Express (Node.js) com ~1050 linhas funcionando
- Extração de CNPJ de PDFs de NF-e (layout NFS-e Taubaté) com algoritmo de 3 prioridades
- Extração de CNPJ de boletos bancários com fallback
- Envio de email via Nodemailer (SMTP SSL porta 465)
- Rastreamento de abertura de email via pixel 1x1
- Sistema de campanhas (NF + Boleto por mês/ano) com PDFs armazenados por pasta
- Envio em lote com pausa/retomada, intervalo configurável, log em tempo real
- Persistência em JSON (campanhas.json, historico_envios.json, estado_sessao.json, rastreamento.json)
- Painel HTML/CSS/JS puro (sem framework) com sidebar, tabelas, upload drag-and-drop
- Gerenciamento de clientes via CSV com CRUD

---

## OBJETIVO

Transformar esse sistema em SaaS multi-tenant com:
- Cada empresa (tenant) tem seu próprio espaço isolado
- Autenticação JWT com roles: SUPER_ADMIN, ADMIN, OPERATOR
- Banco de dados PostgreSQL com Prisma (substituindo arquivos JSON)
- Storage S3/MinIO (substituindo arquivos locais)
- Deploy via Docker Compose no Coolify (VPS Hostinger Ubuntu 24.04)
- Frontend migrado de HTML puro para Next.js 14 (App Router) mantendo o design atual

---

## STACK FINAL

```
Frontend:  Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
Backend:   Next.js API Routes + Express adapter (ou Route Handlers)
Banco:     PostgreSQL 16 + Prisma ORM
Auth:      NextAuth.js v5 (JWT)
Storage:   MinIO (S3-compatible, self-hosted no mesmo Docker Compose)
Filas:     Bull + Redis (envio assíncrono em lote)
PDF:       pdf-lib + pdf-parse (mesma lógica já testada)
Email:     Nodemailer (mantém lógica existente, SMTP por tenant)
Deploy:    Docker Compose → Coolify → VPS Hostinger
```

---

## ARQUITETURA MULTI-TENANT

**Modelo: Row-Level Security (RLS) no PostgreSQL**
- Todos os dados ficam no mesmo banco
- Toda tabela tem coluna `tenant_id` obrigatória
- Middleware garante que toda query filtra por `tenant_id`
- Subdomínio identifica o tenant: `syall.orgdesk.com.br`, `cliente2.orgdesk.com.br`

```
Tabelas principais:
├── tenants          (id, slug, name, plan, smtp_config JSON, created_at)
├── users            (id, tenant_id, email, password_hash, role, name)
├── clients          (id, tenant_id, cnpj, name, email, email_nfe, active)
├── campaigns        (id, tenant_id, month_year, slug, status, pdf_nf_key, pdf_boleto_key, created_at)
├── campaign_sends   (id, campaign_id, client_cnpj, status, pixel_id, sent_at, opened_at, open_count)
├── email_logs       (id, campaign_send_id, type, message, created_at)
└── email_templates  (id, tenant_id, subject, body, updated_at)
```

---

## LÓGICA DE NEGÓCIO A PRESERVAR (código de referência)

### 1. Extração de CNPJ de NF (algoritmo de 3 prioridades — NÃO ALTERAR)
```javascript
// Do servidor.js original — preservar exatamente
function extrairCnpjDaPagina(texto, paginaNum) {
  const mTomador = texto.match(/TOMADOR\s+DE\s+SERVI[CÇ]OS/i);
  if (!mTomador) return null;
  const textoTomador = texto.slice(mTomador.index);
  const linhas = textoTomador.split('\n');

  // CNPJ na mesma linha que TOMADOR
  const rawsInline = linhas[0].match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g);
  if (rawsInline) return limparCnpj(rawsInline[rawsInline.length - 1]);

  for (let j = 1; j < Math.min(20, linhas.length); j++) {
    const l = linhas[j];
    if (/DISCRIMINA[CÇ][AÃ]O\s+DOS\s+SERVI[CÇ]OS|DEDU[CÇ][OÕ]ES|ISSQN\s+RETIDO|ALIQUOTA/i.test(l)) break;
    // Prioridade 1: campo CNPJ/CPF explícito — pega o último (direita = tomador)
    const matchesCampo = [...l.matchAll(/CNPJ\s*\/?>\s*CPF\s*[:\s]+(\d{2}[\. ]?\d{3}[\. ]?\d{3}[/ ]+\d{4}[\- ]+\d{2})\b/gi)];
    if (matchesCampo.length) {
      const cnpj = limparCnpj(matchesCampo[matchesCampo.length - 1][1]);
      if (cnpj.length === 14) return cnpj;
    }
    // Prioridade 2: XX.XXX.XXX/XXXX-XX
    const raws = l.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g);
    if (raws) { const cnpj = limparCnpj(raws[raws.length - 1]); if (cnpj.length === 14) return cnpj; }
    // Prioridade 3: XXXXXXXX/XXXX-XX
    const raws2 = l.match(/\d{8}\/\d{4}-\d{2}/g);
    if (raws2) { const cnpj = limparCnpj(raws2[raws2.length - 1]); if (cnpj.length === 14) return cnpj; }
  }
  return null;
}
```

### 2. Extração de CNPJ de Boleto (preservar)
- Localiza bloco "Pagador" via regex multiline
- Extrai até 400 chars, para antes de "Beneficiário"
- Fallback: varre todo texto, retorna primeiro CNPJ não ignorado

### 3. Rastreamento de abertura de email
- Pixel 1x1 GIF transparente em `/api/track/:pixelId`
- `crypto.randomBytes(12).toString('base64url')` para gerar pixel_id
- Registra: enviado_em, aberto_em, total de aberturas

### 4. Envio em lote com pausa
- Fila processada sequencialmente com `sleep()` entre envios
- Estado de `pausado: boolean` verificado em loop
- Intervalo padrão: 15 segundos entre envios

---

## ESTRUTURA DE PASTAS DO PROJETO

```
orgdesk/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx        ← cadastro do tenant + admin
│   ├── (dashboard)/
│   │   ├── layout.tsx               ← sidebar + topbar (fiel ao design original)
│   │   ├── page.tsx                 ← dashboard com cards de resumo
│   │   ├── campanhas/
│   │   │   ├── page.tsx             ← grid de campanhas
│   │   │   └── [slug]/page.tsx      ← detalhes da campanha
│   │   ├── nfs/page.tsx             ← tabela de NFs da campanha ativa
│   │   ├── clientes/page.tsx        ← CRUD de clientes
│   │   ├── historico/page.tsx       ← histórico de envios
│   │   ├── rastreamento/page.tsx    ← rastreamento de aberturas
│   │   ├── log/page.tsx             ← log em tempo real
│   │   └── configuracoes/
│   │       ├── email/page.tsx       ← editor de template
│   │       └── smtp/page.tsx        ← config SMTP do tenant
│   ├── (superadmin)/
│   │   └── admin/page.tsx           ← painel do dono do SaaS
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── status/route.ts
│       ├── campanhas/
│       │   ├── route.ts             ← GET lista, POST criar
│       │   └── [slug]/
│       │       ├── route.ts
│       │       └── ativar/route.ts
│       ├── clientes/route.ts
│       ├── enviar/
│       │   ├── um/route.ts
│       │   └── lote/route.ts
│       ├── upload/
│       │   ├── nf/route.ts
│       │   └── boleto/route.ts
│       ├── download/
│       │   ├── nf/route.ts
│       │   └── boleto/route.ts
│       ├── template/route.ts
│       ├── historico/route.ts
│       ├── rastreamento/route.ts
│       └── track/[pixelId]/route.ts ← pixel de rastreamento
├── components/
│   ├── ui/                          ← shadcn components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── campanhas/
│   │   ├── CampanhaCard.tsx
│   │   ├── NovaCampanhaForm.tsx
│   │   └── TabelaNfs.tsx
│   ├── clientes/
│   │   └── TabelaClientes.tsx
│   └── shared/
│       ├── UploadDropzone.tsx
│       └── ProgressBar.tsx
├── lib/
│   ├── prisma.ts                    ← singleton do Prisma client
│   ├── auth.ts                      ← NextAuth config
│   ├── tenant.ts                    ← resolução de tenant por subdomínio/header
│   ├── pdf-extractor.ts             ← lógica de extração de CNPJ (portada do servidor.js)
│   ├── mailer.ts                    ← Nodemailer com config SMTP por tenant
│   ├── storage.ts                   ← MinIO/S3 client
│   └── queue.ts                     ← Bull queue para envios
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                      ← seed com tenant Syall Soluções
├── middleware.ts                    ← tenant resolution + auth guard
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

---

## DESIGN / UI

**Manter fidelidade máxima ao design original:**

Paleta de cores (do CSS original):
```css
:root {
  --bg: #080b12;
  --s1: #0e1220;
  --s2: #141926;
  --card: #1a2035;
  --border: #232b3e;
  --blue: #4f8eff;
  --teal: #00e5b0;
  --orange: #ff7340;
  --red: #ff3d6b;
  --yellow: #ffc940;
  --text: #dde4f5;
  --muted: #5a6480;
}
```

Fontes: `Sora` (sans-serif principal) + `DM Mono` (para labels, badges, código)

Componentes a recriar em React/Tailwind:
- Topbar com brand dot animado + pills de status
- Sidebar com nav-buttons, sb-count badges
- Cards de resumo (4 colunas)
- Tabelas com hover states, badges coloridos por status
- Drop zone para upload de PDF
- Barra de progresso de envio com botão pausar/retomar
- Modal de edição de cliente
- Log de envios com linhas coloridas por tipo (ok/err/warn/info)
- Editor de template de email com preview lado a lado
- Cards de campanha (camp-card) com indicador "ATIVA"

---

## PRISMA SCHEMA

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  SUPER_ADMIN
  ADMIN
  OPERATOR
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum SendStatus {
  PENDING
  SENT
  FAILED
  NO_EMAIL
  NO_CADASTRO
  SIMULATED
}

model Tenant {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  plan        String   @default("free")
  smtpHost    String?
  smtpPort    Int?     @default(465)
  smtpUser    String?
  smtpPass    String?
  smtpFrom    String?
  smtpUseTls  Boolean  @default(false)
  cnpjsIgnore String[] @default([])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users      User[]
  clients    Client[]
  campaigns  Campaign[]
  templates  EmailTemplate?
}

model User {
  id           String   @id @default(cuid())
  tenantId     String
  email        String
  passwordHash String
  name         String
  role         UserRole @default(OPERATOR)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, email])
}

model Client {
  id        String   @id @default(cuid())
  tenantId  String
  cnpj      String
  name      String
  email     String?
  emailNfe  String?
  phone     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, cnpj])
}

model Campaign {
  id           String         @id @default(cuid())
  tenantId     String
  slug         String
  monthYear    String
  label        String
  status       CampaignStatus @default(DRAFT)
  pdfNfKey     String?
  pdfBoletoKey String?
  kbNf         Float?
  kbBoleto     Float?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  tenant Tenant         @relation(fields: [tenantId], references: [id])
  sends  CampaignSend[]

  @@unique([tenantId, slug])
}

model CampaignSend {
  id          String     @id @default(cuid())
  campaignId  String
  clientCnpj  String
  clientName  String
  emails      String[]
  status      SendStatus @default(PENDING)
  pixelId     String?    @unique
  isSimulated Boolean    @default(false)
  sentAt      DateTime?
  openedAt    DateTime?
  openCount   Int        @default(0)
  errorMsg    String?
  createdAt   DateTime   @default(now())

  campaign Campaign   @relation(fields: [campaignId], references: [id])
  logs     EmailLog[]
}

model EmailLog {
  id         String   @id @default(cuid())
  sendId     String
  type       String
  message    String
  createdAt  DateTime @default(now())

  send CampaignSend @relation(fields: [sendId], references: [id])
}

model EmailTemplate {
  id        String   @id @default(cuid())
  tenantId  String   @unique
  subject   String
  body      String   @db.Text
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
}
```

---

## DOCKER COMPOSE

```yaml
version: '3.9'
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://orgdesk:orgdesk123@postgres:5432/orgdesk
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: orgdesk
      MINIO_SECRET_KEY: orgdesk123
      MINIO_BUCKET: orgdesk-pdfs
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
    depends_on: [postgres, redis, minio]
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: orgdesk
      POSTGRES_PASSWORD: orgdesk123
      POSTGRES_DB: orgdesk
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orgdesk"]
      interval: 10s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: orgdesk
      MINIO_ROOT_PASSWORD: orgdesk123
    volumes: [minio_data:/data]
    ports: ["9001:9001"]
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## TENANT SEED — SYALL SOLUÇÕES

Crie um seed em `prisma/seed.ts` com:
- Tenant: `{ slug: "syall", name: "Syall Soluções", smtpHost: "mail.syall.com.br", smtpPort: 465, smtpFrom: "financeiro@syall.com.br", cnpjsIgnore: ["24347456000190", "20538261000177"] }`
- Admin: `{ email: "financeiro@syall.com.br", name: "Jhonatan Oliveira", role: "ADMIN" }`
- Template padrão com o corpo de email original da Syall (com bloco PIX BANCO INTER, assinatura com WhatsApp (12) 98868-7056, pixel de rastreamento)

---

## FUNCIONALIDADES DE IMPORTAÇÃO

Criar script `scripts/migrar-dados-locais.ts` que:
1. Lê `campanhas.json` e importa campanhas para o banco
2. Lê `contato_cliente_syall.csv` e importa clientes
3. Lê `historico_envios.json` e importa histórico
4. Lê `rastreamento_aberturas.json` e importa rastreamentos

---

## ORDEM DE IMPLEMENTAÇÃO

Execute na seguinte ordem:

1. `npx create-next-app@latest orgdesk --typescript --tailwind --app --eslint`
2. Instalar deps: `npm install @prisma/client prisma next-auth @auth/prisma-adapter nodemailer pdf-lib pdf-parse csv-parse csv-stringify bull ioredis @aws-sdk/client-s3 zod react-hook-form @hookform/resolvers bcryptjs`
3. Configurar Prisma schema (acima) + rodar `npx prisma generate`
4. Criar `lib/prisma.ts`, `lib/tenant.ts`, `lib/auth.ts`
5. Criar middleware de tenant resolution
6. Implementar auth (login + registro de tenant)
7. Portar `extrairCnpjDaPagina()` e `extrairCnpjBoleto()` para `lib/pdf-extractor.ts`
8. Criar layout do dashboard (sidebar + topbar com design original)
9. Página e API de Campanhas
10. Upload de PDFs (NF + Boleto) → MinIO
11. Processamento de PDF (extração de CNPJs) → armazenar em estado do servidor/Redis
12. Tabela de NFs com status de envio
13. API de envio individual e em lote com Bull queue
14. Pixel de rastreamento `/api/track/[pixelId]`
15. Páginas: Clientes, Histórico, Rastreamento, Log, Template
16. Configurações de SMTP por tenant
17. Dockerfile + docker-compose.yml
18. Seed script
19. README com instruções de deploy no Coolify

---

## RESTRIÇÕES CRÍTICAS

- TODA query ao banco DEVE incluir `where: { tenantId }` — nunca buscar dados globais
- PDFs no MinIO armazenados em `/{tenantSlug}/campanhas/{campaignSlug}/nf.pdf` e `/boleto.pdf`
- Senhas hasheadas com bcrypt (salt rounds: 12)
- SMTP credentials do tenant armazenados criptografados no banco (use `crypto.createCipheriv`)
- Validação de inputs com Zod em todos os endpoints
- O algoritmo de extração de CNPJ do PDF NÃO deve ser alterado — é específico para o layout NFS-e do Município de Taubaté e já foi testado em produção
- O intervalo entre envios (15s) deve ser configurável por tenant nas configurações
- O painel deve funcionar igualmente bem para todos os tenants — sem hardcode de dados da Syall exceto no seed

---

## ENTREGÁVEL

Repositório Git completo com:
- `docker-compose up --build` funciona sem erros
- `npx prisma db seed` popula o banco com dados da Syall
- Dashboard acessível em `http://localhost:3000`
- README.md com: setup local, variáveis de ambiente, deploy no Coolify passo a passo

Comece pelo setup base e avance módulo a módulo. Ao terminar cada módulo, faça `git commit` com mensagem descritiva.
