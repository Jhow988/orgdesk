# OrgDesk SaaS — Documento de Arquitetura Técnica
> Versão 1.0 — Março 2026
> Este documento guia todo o desenvolvimento do sistema.

---

## ÍNDICE

1. [Overview](#1-overview)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Multi-Tenancy](#3-multi-tenancy)
4. [Schema do Banco de Dados](#4-schema-do-banco-de-dados)
5. [Plano de Segurança](#5-plano-de-segurança)
6. [Estrutura de Pastas](#6-estrutura-de-pastas)
7. [Plano de Deploy](#7-plano-de-deploy)
8. [Fluxos de Negócio](#8-fluxos-de-negócio)
9. [APIs — Endpoints Completos](#9-apis--endpoints-completos)

---

## 1. Overview

### 1.1 Descrição do Sistema

O **OrgDesk** é uma plataforma SaaS multi-tenant de gestão empresarial voltada para empresas que precisam centralizar operações financeiras, atendimento ao cliente e comunicação com seus clientes em um único sistema.

Cada empresa (tenant) contratante possui seu próprio espaço isolado dentro da plataforma, acessível via subdomínio personalizado (`empresa.orgdesk.com.br`). Seus clientes finais (empresas ou pessoas físicas) acessam um **portal separado** (`portal.empresa.orgdesk.com.br`) para consultar documentos e chamados de suporte.

### 1.2 Módulos Principais

#### Módulo Financeiro
- Registro, upload e envio de **boletos bancários** por email
- Registro, upload e envio de **notas fiscais (NF-e / NFS-e)** por email
- Campanhas de envio em lote com PDF processado por CNPJ
- Extração automática de CNPJ de PDFs de NFS-e (layout Taubaté, algoritmo validado em produção)
- Rastreamento de abertura de email por pixel 1x1
- Relatórios de adimplência, inadimplência e taxa de abertura
- Envio em lote com pausa/retomada, intervalo configurável, log em tempo real

#### Módulo de Chamados (Suporte)
- Abertura de tickets por funcionários ou pelo próprio cliente (via portal)
- Fluxo de status: `OPEN → IN_PROGRESS → WAITING_CLIENT → RESOLVED → CLOSED`
- Prioridades: LOW, MEDIUM, HIGH, CRITICAL
- SLA configurável por prioridade (prazo em horas)
- Fechamento automático após X horas em status RESOLVED
- Mensagens internas (notas privadas) e externas (visíveis ao cliente)
- Anexos de arquivos nos chamados
- Atribuição de agente responsável

#### Portal do Cliente
- Login separado para contatos de cada empresa cliente
- Consulta de boletos próprios (filtro por status, data)
- Download de PDFs de boletos e notas fiscais
- Abertura e acompanhamento de chamados
- Notificações de novas respostas e mudanças de status

#### Gestão de Clientes (CRM Básico)
- Cadastro de empresas clientes com CNPJ, razão social, email(s)
- Múltiplos contatos por cliente (portais individuais)
- Histórico unificado: boletos, NFs e chamados por cliente
- Importação em massa via CSV
- Convite de contatos para o portal por email

### 1.3 Usuários-Alvo

| Perfil | Descrição |
|--------|-----------|
| **Empresa SaaS** | Contrata o OrgDesk para gerenciar suas operações |
| **ORG_ADMIN** | Administrador da empresa — acesso total |
| **ORG_FINANCE** | Financeiro — gerencia boletos, NFs, campanhas |
| **ORG_SUPPORT** | Suporte — gerencia chamados |
| **CLIENT_PORTAL** | Cliente final — consulta documentos e chamados |
| **SUPER_ADMIN** | Dono do SaaS — acesso global para suporte |

### 1.4 Diagrama de Arquitetura (ASCII)

```
                        ┌─────────────────────────────────────────────────────┐
                        │                   INTERNET                          │
                        └───────────────────────┬─────────────────────────────┘
                                                │
                        ┌───────────────────────▼─────────────────────────────┐
                        │              NGINX (Reverse Proxy + SSL)            │
                        │   *.orgdesk.com.br → app:3000                       │
                        └───────────────────────┬─────────────────────────────┘
                                                │
                        ┌───────────────────────▼─────────────────────────────┐
                        │            NEXT.JS 14 APP (Docker)                  │
                        │                                                     │
                        │  ┌─────────────────┐  ┌──────────────────────────┐ │
                        │  │  App (Dashboard) │  │   App (Portal Cliente)   │ │
                        │  │ empresa.org...  │  │ portal.empresa.org...    │ │
                        │  └────────┬────────┘  └────────────┬─────────────┘ │
                        │           │                         │               │
                        │  ┌────────▼─────────────────────────▼─────────────┐│
                        │  │        middleware.ts (tenant resolution)        ││
                        │  │  → Resolve organization por subdomínio          ││
                        │  │  → Injeta headers: x-org-id, x-is-portal        ││
                        │  │  → Auth guard por role                          ││
                        │  └───────────────────┬─────────────────────────────┘│
                        │                      │                              │
                        │  ┌───────────────────▼─────────────────────────────┐│
                        │  │           API Routes (Route Handlers)           ││
                        │  │  /api/boletos  /api/tickets  /api/campaigns ...  ││
                        │  └──┬────────────┬──────────────────────────────────┘│
                        │     │            │                                  │
                        └─────┼────────────┼──────────────────────────────────┘
                              │            │
          ┌───────────────────▼──┐  ┌──────▼──────────────────────────────────┐
          │  PostgreSQL 16       │  │           Redis 7                        │
          │  (Prisma + RLS)      │  │  ┌──────────────────┐ ┌───────────────┐ │
          │                      │  │  │  Bull Queues     │ │  Pub/Sub SSE  │ │
          │  RLS Policy per table│  │  │  campaign-send   │ │  notifications│ │
          │  SET app.tenant_id   │  │  │  notifications   │ │  log stream   │ │
          └──────────────────────┘  │  └──────────────────┘ └───────────────┘ │
                                    └─────────────────────────────────────────┘
                                                │
                        ┌───────────────────────▼─────────────────────────────┐
                        │                   MinIO                             │
                        │  /{orgSlug}/boletos/{id}/boleto.pdf                 │
                        │  /{orgSlug}/invoices/{id}/danfe.pdf                 │
                        │  /{orgSlug}/tickets/{id}/attachment.pdf             │
                        └─────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológica

### 2.1 Tabela de Dependências

| Camada | Tecnologia | Versão | Justificativa |
|--------|-----------|--------|---------------|
| Framework | Next.js (App Router) | 14.x | SSR, RSC, Route Handlers nativos, ideal para SaaS com múltiplas views |
| Linguagem | TypeScript | 5.x | Tipagem estática elimina erros em runtime, essencial para sistema multi-tenant |
| ORM | Prisma | 5.x | Type-safety com PostgreSQL, migrations automáticas, middleware hooks |
| Banco | PostgreSQL | 16 | Row Level Security nativa, JSONB, arrays nativos, robustez enterprise |
| Auth | NextAuth.js | v5 (beta) | Suporte nativo ao App Router, JWT configurável, providers múltiplos |
| Cache/Filas | Redis + Bull | 7 / 4.x | TTL para sessões, pub/sub para SSE, filas de jobs com retry/backoff |
| Storage | MinIO | RELEASE.2024 | S3-compatible, self-hosted, sem custo de egress, controle total |
| UI | Tailwind CSS + shadcn/ui | 3.x / latest | Utilitário + componentes acessíveis, customização total via CSS vars |
| Validação | Zod | 3.x | Schema validation no servidor e cliente, type inference automática |
| Forms | React Hook Form + @hookform/resolvers | 7.x | Performance superior, integração nativa com Zod |
| Email | Nodemailer | 6.x | SMTP por tenant, SSL/TLS, attachments, HTML templates |
| PDF | pdf-lib + pdf-parse | latest | Extração de texto + manipulação de PDFs |
| CSV | csv-parse + csv-stringify | latest | Import/export de clientes |
| Crypto | Node.js crypto (nativo) | — | AES-256-GCM para credenciais SMTP |
| HTTP Client | ky | latest | Fetch wrapper com retry automático para webhooks |
| Containers | Docker + Compose | 24.x / 2.x | Deploy reproduzível, isolamento de serviços |
| Reverse Proxy | Nginx | 1.25 | SSL termination, wildcard subdomains, proxy_buffering off para SSE |
| CI/CD | GitHub Actions | — | Build, test, push de imagem, deploy via Coolify webhook |

### 2.2 Dependências npm

```bash
# Core
npm install next react react-dom typescript

# Database
npm install @prisma/client prisma

# Auth
npm install next-auth@beta @auth/prisma-adapter

# Validation
npm install zod react-hook-form @hookform/resolvers

# Email
npm install nodemailer
npm install -D @types/nodemailer

# PDF
npm install pdf-lib pdf-parse
npm install -D @types/pdf-parse

# CSV
npm install csv-parse csv-stringify

# Storage (MinIO/S3)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Queue
npm install bull ioredis
npm install -D @types/bull

# UI
npm install tailwindcss postcss autoprefixer
npx shadcn-ui@latest init

# Security
npm install bcryptjs
npm install -D @types/bcryptjs

# Utils
npm install ky clsx tailwind-merge date-fns
```

---

## 3. Multi-Tenancy

### 3.1 Estratégia de Isolamento

**Modelo: Row-Level Security (RLS) com `organization_id`**

Toda tabela de dados possui a coluna `organization_id` obrigatória. O isolamento ocorre em duas camadas:

1. **Camada de Aplicação**: Prisma middleware injeta `organization_id` automaticamente em `create` e `where` de queries
2. **Camada de Banco**: PostgreSQL RLS policies bloqueiam acesso a linhas de outros tenants mesmo que a query de aplicação falhe

```
Request → Nginx → Next.js Middleware
                      ↓
              Resolve tenant por subdomínio
                      ↓
              Injeta x-org-id no header
                      ↓
              API Route Handler
                      ↓
              getTenantContext(req) → { orgId, userId, role }
                      ↓
              Prisma Client com middleware de tenant
                      ↓
              PostgreSQL SET LOCAL app.current_tenant_id = '{orgId}'
                      ↓
              RLS Policy: WHERE organization_id = current_setting('app.current_tenant_id')
```

### 3.2 Resolução de Subdomínio

```
empresa.orgdesk.com.br        → painel interno
portal.empresa.orgdesk.com.br → portal do cliente
orgdesk.com.br                → landing/marketing
admin.orgdesk.com.br          → painel SUPER_ADMIN
```

**Lógica no middleware.ts:**

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const parts = hostname.split('.')

  // portal.empresa.orgdesk.com.br → ['portal', 'empresa', 'orgdesk', 'com', 'br']
  const isPortal = parts[0] === 'portal'
  const slug = isPortal ? parts[1] : parts[0]

  // Ignorar domínios reservados
  if (['www', 'orgdesk', 'admin'].includes(slug)) return NextResponse.next()

  // Busca o tenant no cache Redis ou banco
  const org = await resolveOrganization(slug) // cache-first
  if (!org) return NextResponse.rewrite(new URL('/404', request.url))
  if (!org.is_active) return NextResponse.rewrite(new URL('/suspended', request.url))

  // Injeta contexto nos headers
  const headers = new Headers(request.headers)
  headers.set('x-org-id', org.id)
  headers.set('x-org-slug', org.slug)
  headers.set('x-is-portal', isPortal ? '1' : '0')

  // Redireciona rotas do portal para o namespace correto
  if (isPortal && !request.nextUrl.pathname.startsWith('/portal')) {
    return NextResponse.rewrite(
      new URL(`/portal${request.nextUrl.pathname}`, request.url),
      { headers }
    )
  }

  return NextResponse.next({ headers })
}
```

### 3.3 Resolução de Tenant com Cache Redis

```typescript
// lib/tenant.ts
export async function resolveOrganization(slug: string) {
  const cacheKey = `org:slug:${slug}`

  // 1. Tenta cache Redis (TTL: 5 minutos)
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // 2. Busca no banco (sem RLS — usa connection admin)
  const org = await adminPrisma.organization.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, plan: true, is_active: true }
  })

  if (org) await redis.setex(cacheKey, 300, JSON.stringify(org))
  return org
}
```

### 3.4 Prisma Middleware de Tenant

```typescript
// lib/prisma.ts
const prismaClientSingleton = () => {
  const client = new PrismaClient()

  // Middleware injeta organization_id em todas as queries mutáveis
  client.$use(async (params, next) => {
    const orgId = AsyncLocalStorage.getStore()?.orgId
    if (!orgId) return next(params)

    // SET da variável de sessão para RLS
    await client.$executeRaw`SELECT set_config('app.current_tenant_id', ${orgId}, true)`

    // Injeta organization_id em creates
    if (params.action === 'create' && params.model !== 'Organization' && params.model !== 'User') {
      params.args.data = { ...params.args.data, organization_id: orgId }
    }

    // Injeta filtro em findMany, findFirst, update, delete
    if (['findMany', 'findFirst', 'count', 'update', 'delete', 'deleteMany', 'updateMany'].includes(params.action)) {
      params.args.where = { ...params.args.where, organization_id: orgId }
    }

    return next(params)
  })

  return client
}
```

### 3.5 RLS Policies no PostgreSQL

```sql
-- Habilita RLS em todas as tabelas de dados
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policy padrão: acesso apenas ao próprio tenant
CREATE POLICY tenant_isolation ON clients
  USING (organization_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON boletos
  USING (organization_id = current_setting('app.current_tenant_id', true)::uuid);

-- SUPER_ADMIN bypass: conecta com role que tem BYPASSRLS
-- Criar role separada para operações administrativas
CREATE ROLE orgdesk_admin BYPASSRLS;
CREATE ROLE orgdesk_app LOGIN PASSWORD '...' IN ROLE orgdesk_admin;
```

---

## 4. Schema do Banco de Dados

### 4.1 Enums

```prisma
enum UserRole {
  SUPER_ADMIN      // Dono do SaaS — acesso global
  ORG_ADMIN        // Administrador do tenant — acesso total
  ORG_FINANCE      // Financeiro — boletos, NFs, campanhas
  ORG_SUPPORT      // Suporte — chamados
  CLIENT_PORTAL    // Cliente final — acesso ao portal
}

enum TicketStatus {
  OPEN             // Aberto, aguardando primeira resposta
  IN_PROGRESS      // Em atendimento por um agente
  WAITING_CLIENT   // Aguardando resposta do cliente
  RESOLVED         // Resolvido, aguardando confirmação
  CLOSED           // Encerrado definitivamente
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum BoletoStatus {
  PENDING          // Aguardando pagamento
  PAID             // Pago
  OVERDUE          // Vencido e não pago
  CANCELLED        // Cancelado
}

enum InvoiceType {
  NFE              // Nota Fiscal Eletrônica (produto)
  NFSE             // Nota Fiscal de Serviços Eletrônica
}

enum InvoiceStatus {
  PENDING          // Emissão pendente
  ISSUED           // Emitida
  CANCELLED        // Cancelada
}

enum CampaignStatus {
  DRAFT            // Rascunho — PDFs não enviados
  ACTIVE           // Em envio
  PAUSED           // Pausado pelo usuário
  COMPLETED        // Todos os envios concluídos
  ARCHIVED         // Arquivado
}

enum SendStatus {
  PENDING          // Aguardando envio
  SENT             // Enviado com sucesso
  FAILED           // Falha no envio (erro SMTP)
  NO_EMAIL         // Cliente sem email cadastrado
  NO_CADASTRO      // CNPJ não encontrado na base
  SIMULATED        // Simulado (modo teste)
}

enum NotificationType {
  TICKET_NEW           // Novo chamado criado
  TICKET_REPLY         // Nova mensagem em chamado
  TICKET_STATUS_CHANGE // Status do chamado alterado
  TICKET_ASSIGNED      // Chamado atribuído ao usuário
  BOLETO_DUE           // Boleto a vencer em X dias
  BOLETO_OVERDUE       // Boleto vencido
  BOLETO_PAID          // Boleto pago
  INVOICE_ISSUED       // Nova NF emitida
  CAMPAIGN_COMPLETED   // Campanha de envio finalizada
  PORTAL_INVITE        // Convite de acesso ao portal
}
```

### 4.2 Prisma Schema Completo

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// ORGANIZAÇÕES (TENANTS)
// ─────────────────────────────────────────────

model Organization {
  id          String   @id @default(cuid())
  slug        String   @unique                    // subdomain: empresa → empresa.orgdesk.com.br
  name        String                              // "Syall Soluções"
  cnpj        String?                             // CNPJ da própria empresa
  logo_url    String?                             // URL da logo no MinIO
  plan        String   @default("free")           // "free" | "starter" | "pro" | "enterprise"
  is_active   Boolean  @default(true)             // false = suspenso

  // Configurações SMTP (por tenant)
  smtp_host     String?
  smtp_port     Int?     @default(465)
  smtp_user     String?
  smtp_pass_enc String?  // AES-256-GCM encrypted
  smtp_from     String?
  smtp_use_tls  Boolean  @default(true)
  smtp_verified Boolean  @default(false)

  // Configurações de envio em lote
  send_interval_sec Int @default(15)             // Intervalo entre emails na fila
  cnpjs_ignore      String[] @default([])        // CNPJs a ignorar na extração de PDF

  // Configurações de SLA (horas para resposta por prioridade)
  sla_low      Int @default(72)
  sla_medium   Int @default(24)
  sla_high     Int @default(8)
  sla_critical Int @default(2)
  sla_auto_close_hours Int @default(72)          // Fechar automaticamente após X h em RESOLVED

  // Webhook
  webhook_url    String?
  webhook_secret String?                         // HMAC-SHA256 secret

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  memberships      Membership[]
  clients          Client[]
  campaigns        Campaign[]
  boletos          Boleto[]
  invoices         Invoice[]
  tickets          Ticket[]
  notifications    Notification[]
  activity_log     ActivityLog[]
  email_templates  EmailTemplate?
  webhook_events   WebhookEvent[]

  @@map("organizations")
}

// ─────────────────────────────────────────────
// USUÁRIOS (GLOBAIS — TODOS OS TIPOS)
// ─────────────────────────────────────────────

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  password_hash  String
  name           String
  avatar_url     String?
  role           UserRole @default(ORG_ADMIN)    // Role global (SUPER_ADMIN) ou default para memberships
  email_verified Boolean  @default(false)
  is_active      Boolean  @default(true)
  last_login_at  DateTime?
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  memberships        Membership[]
  client_contacts    ClientContact[]              // Se for CLIENT_PORTAL
  assigned_tickets   Ticket[]      @relation("AssignedTickets")
  ticket_messages    TicketMessage[]
  notifications      Notification[]
  activity_log       ActivityLog[]

  @@map("users")
}

// ─────────────────────────────────────────────
// MEMBERSHIPS (USER <-> ORGANIZATION)
// ─────────────────────────────────────────────

model Membership {
  id              String   @id @default(cuid())
  user_id         String
  organization_id String
  role            UserRole                        // ORG_ADMIN | ORG_FINANCE | ORG_SUPPORT
  is_active       Boolean  @default(true)
  invited_by      String?                         // user_id de quem convidou
  invited_at      DateTime?
  accepted_at     DateTime?
  created_at      DateTime @default(now())

  user         User         @relation(fields: [user_id], references: [id])
  organization Organization @relation(fields: [organization_id], references: [id])

  @@unique([user_id, organization_id])
  @@index([organization_id])
  @@map("memberships")
}

// ─────────────────────────────────────────────
// CLIENTES (EMPRESAS/PESSOAS ATENDIDAS)
// ─────────────────────────────────────────────

model Client {
  id              String   @id @default(cuid())
  organization_id String
  cnpj            String                          // 14 dígitos sem formatação
  name            String                          // Razão social
  trade_name      String?                         // Nome fantasia
  email           String?                         // Email principal
  email_nfe       String?                         // Email para receber NFs
  email_boleto    String?                         // Email para receber boletos
  phone           String?
  address         String?
  notes           String?                         // Observações internas
  is_active       Boolean  @default(true)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  organization Organization    @relation(fields: [organization_id], references: [id])
  contacts     ClientContact[]
  boletos      Boleto[]
  invoices     Invoice[]
  tickets      Ticket[]

  @@unique([organization_id, cnpj])
  @@index([organization_id])
  @@index([organization_id, cnpj])
  @@map("clients")
}

// ─────────────────────────────────────────────
// CONTATOS DO PORTAL (CLIENTES COM LOGIN)
// ─────────────────────────────────────────────

model ClientContact {
  id              String   @id @default(cuid())
  client_id       String
  user_id         String                          // Referência ao User com role=CLIENT_PORTAL
  is_primary      Boolean  @default(false)        // Contato principal do cliente
  invite_token    String?  @unique                // Token de convite (null = aceito)
  invite_expires  DateTime?
  created_at      DateTime @default(now())

  client Client @relation(fields: [client_id], references: [id])
  user   User   @relation(fields: [user_id], references: [id])

  @@unique([client_id, user_id])
  @@index([client_id])
  @@map("client_contacts")
}

// ─────────────────────────────────────────────
// BOLETOS
// ─────────────────────────────────────────────

model Boleto {
  id              String      @id @default(cuid())
  organization_id String
  client_id       String
  number          String?                         // Número do boleto
  description     String?                         // Descrição / referência
  amount          Decimal     @db.Decimal(12, 2)
  due_date        DateTime
  status          BoletoStatus @default(PENDING)
  paid_at         DateTime?
  paid_amount     Decimal?    @db.Decimal(12, 2)
  barcode         String?                         // Linha digitável
  pdf_key         String?                         // Chave no MinIO
  pdf_size_kb     Float?
  campaign_send_id String?                        // Vínculo com envio de campanha
  notes           String?
  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt

  organization Organization  @relation(fields: [organization_id], references: [id])
  client       Client        @relation(fields: [client_id], references: [id])
  campaign_send CampaignSend? @relation(fields: [campaign_send_id], references: [id])

  @@index([organization_id])
  @@index([organization_id, client_id])
  @@index([organization_id, status])
  @@index([organization_id, due_date])
  @@map("boletos")
}

// ─────────────────────────────────────────────
// NOTAS FISCAIS
// ─────────────────────────────────────────────

model Invoice {
  id              String        @id @default(cuid())
  organization_id String
  client_id       String
  type            InvoiceType   @default(NFSE)
  status          InvoiceStatus @default(ISSUED)
  number          String?                         // Número da NF
  series          String?                         // Série da NF
  issue_date      DateTime
  amount          Decimal       @db.Decimal(12, 2)
  description     String?                         // Descrição dos serviços
  pdf_key         String?                         // DANFE ou NFS-e PDF no MinIO
  xml_key         String?                         // XML da NF no MinIO
  pdf_size_kb     Float?
  campaign_send_id String?                        // Vínculo com envio de campanha
  notes           String?
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt

  organization Organization  @relation(fields: [organization_id], references: [id])
  client       Client        @relation(fields: [client_id], references: [id])
  campaign_send CampaignSend? @relation(fields: [campaign_send_id], references: [id])

  @@index([organization_id])
  @@index([organization_id, client_id])
  @@index([organization_id, status])
  @@index([organization_id, issue_date])
  @@map("invoices")
}

// ─────────────────────────────────────────────
// CAMPANHAS DE ENVIO EM LOTE
// ─────────────────────────────────────────────

model Campaign {
  id              String         @id @default(cuid())
  organization_id String
  slug            String                          // "mar-2026"
  month_year      String                          // "03/2026"
  label           String                          // "Março 2026"
  status          CampaignStatus @default(DRAFT)
  pdf_nf_key      String?                         // NF PDF no MinIO
  pdf_boleto_key  String?                         // Boleto PDF no MinIO
  kb_nf           Float?
  kb_boleto       Float?
  started_at      DateTime?
  completed_at    DateTime?
  created_at      DateTime       @default(now())
  updated_at      DateTime       @updatedAt

  organization Organization   @relation(fields: [organization_id], references: [id])
  sends        CampaignSend[]

  @@unique([organization_id, slug])
  @@index([organization_id])
  @@map("campaigns")
}

// ─────────────────────────────────────────────
// ENVIOS DE CAMPANHA (POR CNPJ)
// ─────────────────────────────────────────────

model CampaignSend {
  id           String     @id @default(cuid())
  campaign_id  String
  client_cnpj  String
  client_name  String
  emails       String[]                           // Lista de emails do cliente
  status       SendStatus @default(PENDING)
  pixel_id     String?    @unique                 // Token de rastreamento único
  is_simulated Boolean    @default(false)
  sent_at      DateTime?
  opened_at    DateTime?                          // Primeira abertura
  open_count   Int        @default(0)
  error_msg    String?
  created_at   DateTime   @default(now())

  campaign Campaign    @relation(fields: [campaign_id], references: [id])
  logs     EmailLog[]
  boleto   Boleto?
  invoice  Invoice?

  @@index([campaign_id])
  @@index([pixel_id])
  @@map("campaign_sends")
}

// ─────────────────────────────────────────────
// LOGS DE EMAIL (POR ENVIO)
// ─────────────────────────────────────────────

model EmailLog {
  id         String   @id @default(cuid())
  send_id    String
  type       String                               // "ok" | "err" | "warn" | "info"
  message    String
  created_at DateTime @default(now())

  send CampaignSend @relation(fields: [send_id], references: [id])

  @@index([send_id])
  @@map("email_logs")
}

// ─────────────────────────────────────────────
// TICKETS (CHAMADOS DE SUPORTE)
// ─────────────────────────────────────────────

model Ticket {
  id              String         @id @default(cuid())
  organization_id String
  number          Int                             // Sequencial por organização
  client_id       String
  assigned_to     String?                         // user_id do agente responsável
  opened_by       String                          // user_id ou client_contact user_id
  opened_by_type  String                          // "user" | "client"
  title           String
  category        String?                         // "financeiro" | "técnico" | "comercial" etc
  status          TicketStatus   @default(OPEN)
  priority        TicketPriority @default(MEDIUM)
  sla_deadline    DateTime?                       // Calculado no create com base na prioridade
  resolved_at     DateTime?
  closed_at       DateTime?
  auto_close_at   DateTime?                       // Set quando status = RESOLVED
  created_at      DateTime       @default(now())
  updated_at      DateTime       @updatedAt

  organization Organization   @relation(fields: [organization_id], references: [id])
  client       Client         @relation(fields: [client_id], references: [id])
  assignee     User?          @relation("AssignedTickets", fields: [assigned_to], references: [id])
  messages     TicketMessage[]
  attachments  TicketAttachment[]

  @@unique([organization_id, number])
  @@index([organization_id])
  @@index([organization_id, client_id])
  @@index([organization_id, status])
  @@index([organization_id, assigned_to])
  @@map("tickets")
}

// ─────────────────────────────────────────────
// MENSAGENS DE TICKET
// ─────────────────────────────────────────────

model TicketMessage {
  id              String   @id @default(cuid())
  ticket_id       String
  author_id       String                          // user_id
  author_type     String                          // "user" | "client" | "system"
  body            String   @db.Text
  is_internal     Boolean  @default(false)        // Nota interna — não visível ao cliente
  is_auto         Boolean  @default(false)        // Mensagem automática do sistema
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  ticket      Ticket            @relation(fields: [ticket_id], references: [id])
  author      User              @relation(fields: [author_id], references: [id])
  attachments TicketAttachment[]

  @@index([ticket_id])
  @@map("ticket_messages")
}

// ─────────────────────────────────────────────
// ANEXOS DE TICKET
// ─────────────────────────────────────────────

model TicketAttachment {
  id         String   @id @default(cuid())
  ticket_id  String
  message_id String?                              // Null = anexo avulso
  file_key   String                               // Chave no MinIO
  file_name  String
  mime_type  String
  size_kb    Float
  created_at DateTime @default(now())

  ticket  Ticket         @relation(fields: [ticket_id], references: [id])
  message TicketMessage? @relation(fields: [message_id], references: [id])

  @@index([ticket_id])
  @@map("ticket_attachments")
}

// ─────────────────────────────────────────────
// NOTIFICAÇÕES IN-APP
// ─────────────────────────────────────────────

model Notification {
  id              String           @id @default(cuid())
  organization_id String
  user_id         String
  type            NotificationType
  title           String
  body            String
  link            String?                         // URL de redirecionamento
  is_read         Boolean          @default(false)
  read_at         DateTime?
  metadata        Json?                           // dados extras (ticket_id, boleto_id, etc)
  created_at      DateTime         @default(now())

  organization Organization @relation(fields: [organization_id], references: [id])
  user         User         @relation(fields: [user_id], references: [id])

  @@index([organization_id, user_id])
  @@index([organization_id, user_id, is_read])
  @@map("notifications")
}

// ─────────────────────────────────────────────
// LOG DE AUDITORIA
// ─────────────────────────────────────────────

model ActivityLog {
  id              String   @id @default(cuid())
  organization_id String?                         // Null = ação SUPER_ADMIN global
  user_id         String?
  action          String                          // "ticket.created" | "boleto.paid" | etc
  entity          String?                         // "ticket" | "boleto" | "user"
  entity_id       String?
  payload         Json?                           // Snapshot dos dados alterados
  ip_address      String?
  user_agent      String?
  created_at      DateTime @default(now())

  organization Organization? @relation(fields: [organization_id], references: [id])
  user         User?         @relation(fields: [user_id], references: [id])

  @@index([organization_id])
  @@index([organization_id, entity, entity_id])
  @@index([organization_id, user_id])
  @@index([created_at])
  @@map("activity_log")
}

// ─────────────────────────────────────────────
// TEMPLATE DE EMAIL (POR TENANT)
// ─────────────────────────────────────────────

model EmailTemplate {
  id              String   @id @default(cuid())
  organization_id String   @unique
  subject         String   @default("Segue em anexo sua NF e Boleto referente a {{month_year}}")
  body            String   @db.Text
  updated_at      DateTime @updatedAt

  organization Organization @relation(fields: [organization_id], references: [id])

  @@map("email_templates")
}

// ─────────────────────────────────────────────
// EVENTOS DE WEBHOOK
// ─────────────────────────────────────────────

model WebhookEvent {
  id              String   @id @default(cuid())
  organization_id String
  event_type      String                          // "ticket.created" | "boleto.paid" | etc
  payload         Json
  status          String   @default("pending")   // "pending" | "delivered" | "failed"
  attempts        Int      @default(0)
  last_attempt_at DateTime?
  delivered_at    DateTime?
  error_msg       String?
  created_at      DateTime @default(now())

  organization Organization @relation(fields: [organization_id], references: [id])

  @@index([organization_id])
  @@index([organization_id, status])
  @@map("webhook_events")
}
```

---

## 5. Plano de Segurança

### 5.1 Fluxo de Autenticação

```
PAINEL INTERNO (empresa.orgdesk.com.br)
═══════════════════════════════════════
Usuário → /login
  → POST /api/auth/callback/credentials
  → NextAuth verifica email+senha (bcrypt, salt=12)
  → Valida membership para organization_id do subdomínio
  → JWT payload: { userId, orgId, role: ORG_ADMIN|ORG_FINANCE|ORG_SUPPORT }
  → Cookie: next-auth.session-token (httpOnly, sameSite=lax)
  → Redirect para /dashboard

PORTAL DO CLIENTE (portal.empresa.orgdesk.com.br)
══════════════════════════════════════════════════
Cliente → /portal/login
  → POST /api/auth/callback/credentials
  → Verifica email+senha do User com role=CLIENT_PORTAL
  → Valida que client_contact.client.organization_id == orgId do subdomínio
  → JWT payload: { userId, orgId, clientId, role: CLIENT_PORTAL }
  → Cookie separado: next-auth.portal-session-token
  → Redirect para /portal/dashboard
```

### 5.2 Sessões e JWT

```typescript
// lib/auth.ts — Configuração NextAuth v5
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 horas
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.orgId = user.orgId
        token.clientId = user.clientId
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.userId = token.userId
      session.user.orgId = token.orgId
      session.user.clientId = token.clientId
      session.user.role = token.role
      return session
    },
    // Valida que o token pertence ao tenant do subdomínio atual
    authorized({ auth, request }) {
      const orgId = request.headers.get('x-org-id')
      if (auth?.user.orgId !== orgId) return false
      return !!auth?.user
    }
  }
}
```

### 5.3 Matriz de Permissões (RBAC)

| Ação | SUPER_ADMIN | ORG_ADMIN | ORG_FINANCE | ORG_SUPPORT | CLIENT_PORTAL |
|------|:-----------:|:---------:|:-----------:|:-----------:|:-------------:|
| **Organizações** | | | | | |
| Ver/editar configurações | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver/editar SMTP | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gerenciar membros | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Clientes** | | | | | |
| Ver lista de clientes | ✅ | ✅ | ✅ | ✅* | ❌ |
| Criar/editar clientes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Excluir clientes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Convidar para portal | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Boletos** | | | | | |
| Ver boletos | ✅ | ✅ | ✅ | ❌ | ✅** |
| Criar/editar boletos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Marcar como pago | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cancelar boleto | ✅ | ✅ | ❌ | ❌ | ❌ |
| Download PDF boleto | ✅ | ✅ | ✅ | ❌ | ✅** |
| **Notas Fiscais** | | | | | |
| Ver NFs | ✅ | ✅ | ✅ | ❌ | ✅** |
| Criar/editar NFs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Download PDF/XML NF | ✅ | ✅ | ✅ | ❌ | ✅** |
| **Campanhas** | | | | | |
| Ver campanhas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Criar campanha | ✅ | ✅ | ✅ | ❌ | ❌ |
| Upload PDF | ✅ | ✅ | ✅ | ❌ | ❌ |
| Disparar envio | ✅ | ✅ | ✅ | ❌ | ❌ |
| Pausar/retomar envio | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Chamados** | | | | | |
| Ver chamados | ✅ | ✅ | ✅*** | ✅ | ✅** |
| Criar chamado | ✅ | ✅ | ✅ | ✅ | ✅** |
| Editar chamado | ✅ | ✅ | ❌ | ✅ | ❌ |
| Responder chamado | ✅ | ✅ | ✅ | ✅ | ✅** |
| Fechar chamado | ✅ | ✅ | ❌ | ✅ | ❌ |
| Atribuir agente | ✅ | ✅ | ❌ | ✅ | ❌ |
| Nota interna | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Relatórios** | | | | | |
| Relatório financeiro | ✅ | ✅ | ✅ | ❌ | ❌ |
| Relatório de chamados | ✅ | ✅ | ❌ | ✅ | ❌ |
| Log de auditoria | ✅ | ✅ | ❌ | ❌ | ❌ |

> *ORG_SUPPORT: apenas nome e contato do cliente, sem dados financeiros
> **CLIENT_PORTAL: apenas dados do próprio client_id
> ***ORG_FINANCE: visualização apenas, sem editar

### 5.4 Utilitário de Verificação de Permissão

```typescript
// lib/permissions.ts
export function can(role: UserRole, action: string): boolean {
  const PERMISSIONS: Record<string, UserRole[]> = {
    'boletos:read':    ['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_FINANCE', 'CLIENT_PORTAL'],
    'boletos:write':   ['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_FINANCE'],
    'boletos:delete':  ['SUPER_ADMIN', 'ORG_ADMIN'],
    'invoices:read':   ['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_FINANCE', 'CLIENT_PORTAL'],
    'tickets:read':    ['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_FINANCE', 'ORG_SUPPORT', 'CLIENT_PORTAL'],
    'tickets:write':   ['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_SUPPORT'],
    'tickets:assign':  ['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_SUPPORT'],
    'clients:write':   ['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_FINANCE'],
    'campaigns:write': ['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_FINANCE'],
    'settings:write':  ['SUPER_ADMIN', 'ORG_ADMIN'],
    'members:manage':  ['SUPER_ADMIN', 'ORG_ADMIN'],
    // ...
  }
  return PERMISSIONS[action]?.includes(role) ?? false
}

// Uso em Route Handler:
export async function GET(req: NextRequest) {
  const ctx = await getTenantContext(req) // { orgId, userId, role }
  if (!can(ctx.role, 'boletos:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ...
}
```

### 5.5 Rate Limiting

```typescript
// lib/rate-limit.ts — via Upstash Redis ou ioredis sliding window
const LIMITS = {
  auth:     { max: 10, window: '15m' },  // Login: 10 tentativas/15 min por IP
  api:      { max: 300, window: '1m' },  // APIs gerais: 300 req/min por tenant
  upload:   { max: 20, window: '5m' },   // Upload: 20 uploads/5 min por usuário
  invite:   { max: 5, window: '1h' },    // Convites: 5/hora por usuário
}
```

### 5.6 Criptografia de Credenciais SMTP

```typescript
// lib/crypto.ts
const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex') // 32 bytes hex

export function encryptSmtp(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Formato: iv(24):tag(32):encrypted(base64)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('base64')}`
}

export function decryptSmtp(ciphertext: string): string {
  const [ivHex, tagHex, encBase64] = ciphertext.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encBase64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
```

### 5.7 Validação de Inputs (Zod)

```typescript
// lib/schemas/boleto.schema.ts
export const createBoletoSchema = z.object({
  client_id:   z.string().cuid(),
  amount:      z.number().positive().max(9_999_999.99),
  due_date:    z.string().datetime(),
  description: z.string().max(500).optional(),
  number:      z.string().max(50).optional(),
  barcode:     z.string().max(200).optional(),
})

// Uso em Route Handler:
const body = await req.json()
const result = createBoletoSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json(
    { error: 'Validation failed', issues: result.error.issues },
    { status: 422 }
  )
}
```

---

## 6. Estrutura de Pastas

```
orgdesk/
├── app/
│   ├── (auth)/                          ← Layout sem sidebar (login/register interno)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx            ← Cadastro de novo tenant + ORG_ADMIN
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (dashboard)/                     ← Painel interno da empresa
│   │   ├── layout.tsx                   ← Sidebar + Topbar
│   │   ├── page.tsx                     ← Dashboard com cards de resumo
│   │   ├── clientes/
│   │   │   ├── page.tsx                 ← Lista de clientes (tabela + busca)
│   │   │   └── [id]/page.tsx            ← Detalhe do cliente (histórico unificado)
│   │   ├── financeiro/
│   │   │   ├── page.tsx                 ← Overview financeiro (cards + gráfico)
│   │   │   ├── boletos/
│   │   │   │   ├── page.tsx             ← Lista de boletos
│   │   │   │   └── [id]/page.tsx        ← Detalhe do boleto
│   │   │   ├── notas-fiscais/
│   │   │   │   ├── page.tsx             ← Lista de NFs
│   │   │   │   └── [id]/page.tsx        ← Detalhe da NF
│   │   │   └── campanhas/
│   │   │       ├── page.tsx             ← Grid de campanhas
│   │   │       └── [slug]/page.tsx      ← Detalhe da campanha + envio
│   │   ├── chamados/
│   │   │   ├── page.tsx                 ← Kanban/lista de tickets
│   │   │   └── [id]/page.tsx            ← Detalhe do chamado + mensagens
│   │   ├── rastreamento/
│   │   │   └── page.tsx                 ← Dashboard de abertura de emails
│   │   ├── relatorios/
│   │   │   ├── financeiro/page.tsx
│   │   │   └── chamados/page.tsx
│   │   └── configuracoes/
│   │       ├── page.tsx                 ← Overview das configurações
│   │       ├── smtp/page.tsx            ← Config SMTP com teste
│   │       ├── template/page.tsx        ← Editor de template de email
│   │       ├── sla/page.tsx             ← Config de SLA por prioridade
│   │       ├── membros/page.tsx         ← Gerenciamento de usuários
│   │       └── webhooks/page.tsx        ← Config de webhooks
│   │
│   ├── (portal)/                        ← Portal do cliente
│   │   ├── layout.tsx                   ← Header simplificado
│   │   ├── login/page.tsx               ← Login do portal
│   │   ├── page.tsx                     ← Dashboard do portal
│   │   ├── boletos/page.tsx             ← Meus boletos
│   │   ├── notas-fiscais/page.tsx       ← Minhas NFs
│   │   └── chamados/
│   │       ├── page.tsx                 ← Meus chamados
│   │       ├── novo/page.tsx            ← Abrir novo chamado
│   │       └── [id]/page.tsx            ← Detalhe do chamado
│   │
│   ├── (superadmin)/                    ← Painel SUPER_ADMIN
│   │   ├── layout.tsx
│   │   └── admin/
│   │       ├── page.tsx                 ← Lista de tenants
│   │       ├── [orgId]/page.tsx         ← Detalhe de um tenant
│   │       └── logs/page.tsx            ← Auditoria global
│   │
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts   ← NextAuth handler
│       │   ├── register/route.ts        ← POST novo tenant
│       │   ├── verify-email/route.ts
│       │   ├── forgot-password/route.ts
│       │   ├── reset-password/route.ts
│       │   └── accept-invite/route.ts
│       ├── organizations/
│       │   ├── route.ts
│       │   └── me/route.ts
│       ├── memberships/
│       │   ├── route.ts
│       │   ├── invite/route.ts
│       │   └── [id]/route.ts
│       ├── clients/
│       │   ├── route.ts
│       │   ├── import/route.ts
│       │   ├── export/route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── contacts/route.ts
│       │       ├── history/route.ts
│       │       └── invite-portal/route.ts
│       ├── boletos/
│       │   ├── route.ts
│       │   ├── bulk-update/route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── pay/route.ts
│       │       ├── cancel/route.ts
│       │       ├── download/route.ts
│       │       └── upload-pdf/route.ts
│       ├── invoices/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── cancel/route.ts
│       │       ├── download/route.ts
│       │       ├── upload-pdf/route.ts
│       │       └── upload-xml/route.ts
│       ├── campaigns/
│       │   ├── route.ts
│       │   └── [slug]/
│       │       ├── route.ts
│       │       ├── upload-nf/route.ts
│       │       ├── upload-boleto/route.ts
│       │       ├── process/route.ts
│       │       ├── send/route.ts
│       │       ├── pause/route.ts
│       │       ├── resume/route.ts
│       │       ├── log/route.ts            ← SSE stream
│       │       ├── stats/route.ts
│       │       └── sends/
│       │           ├── route.ts
│       │           └── [sendId]/
│       │               ├── route.ts
│       │               └── resend/route.ts
│       ├── tickets/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── status/route.ts
│       │       ├── assign/route.ts
│       │       ├── priority/route.ts
│       │       ├── messages/
│       │       │   ├── route.ts
│       │       │   └── [mid]/route.ts
│       │       └── attachments/
│       │           ├── route.ts
│       │           └── [aid]/
│       │               ├── route.ts
│       │               └── download/route.ts
│       ├── notifications/
│       │   ├── route.ts
│       │   ├── stream/route.ts             ← SSE de notificações
│       │   ├── unread-count/route.ts
│       │   ├── read-all/route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── read/route.ts
│       ├── settings/
│       │   ├── smtp/
│       │   │   ├── route.ts
│       │   │   └── test/route.ts
│       │   ├── email-template/
│       │   │   ├── route.ts
│       │   │   └── preview/route.ts
│       │   ├── sla/route.ts
│       │   └── webhooks/
│       │       ├── route.ts
│       │       ├── rotate-secret/route.ts
│       │       └── test/route.ts
│       ├── reports/
│       │   ├── financial/route.ts
│       │   ├── adimplencia/route.ts
│       │   ├── tickets/route.ts
│       │   └── campaigns/route.ts
│       ├── activity-log/route.ts
│       ├── track/[pixelId]/route.ts        ← Pixel de rastreamento (público)
│       ├── upload/route.ts
│       ├── admin/                          ← Rotas SUPER_ADMIN
│       │   ├── organizations/route.ts
│       │   └── activity-log/route.ts
│       └── health/route.ts                 ← Health check
│
├── components/
│   ├── ui/                                ← shadcn/ui components gerados
│   ├── layout/
│   │   ├── Sidebar.tsx                    ← Sidebar dinâmica por role
│   │   ├── Topbar.tsx                     ← Brand dot animado + status pills
│   │   ├── PortalHeader.tsx               ← Header simplificado do portal
│   │   └── NotificationBell.tsx           ← Badge com contagem de não lidas
│   ├── financeiro/
│   │   ├── BoletoTable.tsx
│   │   ├── InvoiceTable.tsx
│   │   ├── CampanhaCard.tsx
│   │   ├── NovaCampanhaForm.tsx
│   │   ├── NfTable.tsx                    ← Tabela de CNPJs extraídos + status
│   │   ├── SendProgressBar.tsx            ← Barra de progresso + botão pausar
│   │   ├── SendLogViewer.tsx              ← Log em tempo real (SSE)
│   │   └── EmailTrackingDashboard.tsx
│   ├── chamados/
│   │   ├── TicketKanban.tsx               ← Board Kanban por status
│   │   ├── TicketCard.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── TicketMessages.tsx
│   │   ├── TicketMessageForm.tsx
│   │   └── NovoTicketForm.tsx
│   ├── clientes/
│   │   ├── ClientTable.tsx
│   │   ├── ClientForm.tsx
│   │   ├── ClientHistory.tsx
│   │   └── PortalInviteDialog.tsx
│   ├── portal/
│   │   ├── PortalBoletoList.tsx
│   │   ├── PortalInvoiceList.tsx
│   │   └── PortalTicketList.tsx
│   └── shared/
│       ├── UploadDropzone.tsx
│       ├── DataTable.tsx                  ← Tabela genérica com paginação
│       ├── StatusBadge.tsx
│       ├── ConfirmDialog.tsx
│       ├── PaginationControls.tsx
│       └── EmptyState.tsx
│
├── lib/
│   ├── prisma.ts                          ← Singleton + middleware de tenant
│   ├── auth.ts                            ← NextAuth config (painel + portal)
│   ├── tenant.ts                          ← Resolução de org por subdomínio
│   ├── permissions.ts                     ← Matriz RBAC + helper can()
│   ├── crypto.ts                          ← AES-256-GCM para SMTP
│   ├── storage.ts                         ← MinIO client + presigned URLs
│   ├── mailer.ts                          ← Nodemailer com SMTP por tenant
│   ├── queue.ts                           ← Bull queues (campaign-send, notifications)
│   ├── pdf-extractor.ts                   ← Algoritmo de CNPJ NFS-e Taubaté (NÃO ALTERAR)
│   ├── rate-limit.ts                      ← Sliding window rate limiting
│   └── schemas/                           ← Zod schemas por entidade
│       ├── boleto.schema.ts
│       ├── invoice.schema.ts
│       ├── ticket.schema.ts
│       ├── client.schema.ts
│       └── campaign.schema.ts
│
├── workers/
│   ├── campaign-send.worker.ts            ← Consumer Bull para envio de campanhas
│   ├── notification.worker.ts             ← Consumer Bull para notificações
│   └── sla-check.worker.ts               ← Cron job SLA (a cada hora)
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                            ← Seed com tenant Syall Soluções
│
├── scripts/
│   └── migrate-local-data.ts             ← Importa dados do sistema legado
│
├── middleware.ts                          ← Tenant resolution + auth guard
├── next.config.ts
├── tailwind.config.ts
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 7. Plano de Deploy

### 7.1 Dockerfile Multi-Stage

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ── Stage: deps ──────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage: builder ───────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npx prisma generate
RUN npm run build

# ── Stage: runner ────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/workers ./workers

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 7.2 Docker Compose

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://orgdesk:${DB_PASSWORD}@postgres:5432/orgdesk
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: "9000"
      MINIO_USE_SSL: "false"
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      MINIO_BUCKET: orgdesk-files
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      APP_BASE_DOMAIN: orgdesk.com.br
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
      minio:
        condition: service_started
    restart: unless-stopped
    networks:
      - orgdesk_net

  worker:
    build:
      context: .
      dockerfile: Dockerfile
    command: node workers/campaign-send.worker.js
    environment:
      DATABASE_URL: postgresql://orgdesk:${DB_PASSWORD}@postgres:5432/orgdesk
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: "9000"
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      MINIO_BUCKET: orgdesk-files
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    networks:
      - orgdesk_net

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: orgdesk
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: orgdesk
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./prisma/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orgdesk"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - orgdesk_net

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - orgdesk_net

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "9001:9001"                   # Console MinIO (apenas local)
    restart: unless-stopped
    networks:
      - orgdesk_net

  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot_certs:/etc/letsencrypt:ro
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - orgdesk_net

volumes:
  postgres_data:
  redis_data:
  minio_data:
  certbot_certs:

networks:
  orgdesk_net:
    driver: bridge
```

### 7.3 Configuração Nginx (Wildcard SSL)

```nginx
# nginx/conf.d/orgdesk.conf
server {
    listen 80;
    server_name *.orgdesk.com.br orgdesk.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name *.orgdesk.com.br orgdesk.com.br;

    ssl_certificate     /etc/letsencrypt/live/orgdesk.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/orgdesk.com.br/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }

    # Desabilita buffering para SSE (log em tempo real, notificações)
    location ~* ^/api/(campaigns/.+/log|notifications/stream)$ {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        chunked_transfer_encoding on;
    }
}
```

### 7.4 Variáveis de Ambiente (.env.example)

```bash
# ── Database ─────────────────────────────────
DATABASE_URL=postgresql://orgdesk:CHANGE_ME@postgres:5432/orgdesk
DB_PASSWORD=CHANGE_ME_32_CHARS

# ── Auth ─────────────────────────────────────
NEXTAUTH_SECRET=CHANGE_ME_64_CHARS_RANDOM
NEXTAUTH_URL=https://orgdesk.com.br

# ── Encryption (SMTP passwords) ──────────────
# Gerar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=CHANGE_ME_64_CHARS_HEX

# ── MinIO ─────────────────────────────────────
MINIO_ACCESS_KEY=CHANGE_ME
MINIO_SECRET_KEY=CHANGE_ME_LONG_SECRET
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET=orgdesk-files

# ── Redis ─────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── App ────────────────────────────────────────
APP_BASE_DOMAIN=orgdesk.com.br
NODE_ENV=production
```

### 7.5 GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy OrgDesk

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx prisma generate
      - run: npm run type-check
      - run: npm run lint

  build-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Coolify Deploy
        run: |
          curl -X POST ${{ secrets.COOLIFY_WEBHOOK_URL }} \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN }}"
```

### 7.6 SSL Wildcard com Let's Encrypt (Certbot)

```bash
# Na VPS Hostinger antes do primeiro deploy
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.cloudflare.ini \
  -d "orgdesk.com.br" \
  -d "*.orgdesk.com.br" \
  --email admin@orgdesk.com.br \
  --agree-tos

# Renovação automática via cron
0 2 * * * certbot renew --quiet && nginx -s reload
```

---

## 8. Fluxos de Negócio

### 8.1 Empresa Cadastra Cliente → Gera Boleto → Cliente Acessa Portal

```
[ORG_FINANCE] POST /api/clients
  → Valida CNPJ (dígitos verificadores)
  → Cria client com organization_id injetado pelo middleware Prisma
  → Registra activity_log: client.created

[ORG_FINANCE] POST /api/boletos
  → Vincula ao client_id
  → Upload PDF via POST /api/boletos/{id}/upload-pdf
    → Multipart para MinIO: /{orgSlug}/boletos/{id}/boleto.pdf
    → Atualiza boleto.pdf_key e pdf_size_kb

[ORG_FINANCE] POST /api/clients/{id}/invite-portal
  → Cria User com role=CLIENT_PORTAL (se não existir)
  → Cria ClientContact com invite_token = crypto.randomBytes(32).toString('hex')
  → invite_expires = now() + 7 dias
  → Envia email: "Acesse seu portal: portal.empresa.orgdesk.com.br/aceitar-convite?token={token}"

[CLIENTE] GET /portal/aceitar-convite?token={token}
  → Valida token + não expirado
  → Formulário: definir senha
  → POST /api/auth/accept-invite
    → Atualiza password_hash, email_verified=true, accepted_at=now()
    → Invalida token
    → Cria sessão → redirect portal.empresa.orgdesk.com.br/boletos

[CLIENTE] GET /api/boletos (contexto CLIENT_PORTAL)
  → Middleware detecta x-is-portal=1
  → Verifica token.clientId
  → WHERE organization_id = orgId AND client_id = clientId
  → Retorna apenas boletos próprios

[CLIENTE] GET /api/boletos/{id}/download
  → Verifica boleto.client_id == token.clientId
  → Gera presigned URL MinIO (15 min)
  → 302 Redirect → download do PDF
```

### 8.2 Cliente Abre Chamado pelo Portal → Suporte Responde → Notificação

```
[CLIENTE NO PORTAL] POST /api/tickets
  → body: { title, category, body (primeira mensagem) }
  → Cria ticket: organization_id, client_id=token.clientId,
                 opened_by=token.userId, opened_by_type="client"
  → number = next sequence por organização
  → Calcula sla_deadline com base na priority padrão (MEDIUM)
  → Cria TicketMessage com body da mensagem inicial
  → Cria Notification para todos ORG_SUPPORT + ORG_ADMIN:
      type=TICKET_NEW, link=/chamados/{id}
  → Publica Redis pub/sub "org:{orgId}:notifications"
  → Dispara webhook: event=ticket.created

[ORG_SUPPORT] Recebe notificação em tempo real via SSE
  → Clica → /chamados/{id}
  → PATCH /api/tickets/{id}/assign: { user_id: me }
  → PATCH /api/tickets/{id}/status: WAITING_CLIENT → IN_PROGRESS
  → POST /api/tickets/{id}/messages: { body: "...", is_internal: false }
  → Cria Notification para token.clientId (CLIENT_PORTAL):
      type=TICKET_REPLY, link=/portal/chamados/{id}

[CLIENTE] Recebe notificação de resposta
  → Acessa portal.empresa.orgdesk.com.br/chamados/{id}
  → POST /api/tickets/{id}/messages: { body: "..." }
  → Status: ticket volta automaticamente para IN_PROGRESS
      (webhook: WAITING_CLIENT → ação do cliente → IN_PROGRESS)

[SISTEMA — Bull Cron Job, a cada hora]
  → Busca tickets WHERE status=RESOLVED AND auto_close_at <= now()
  → PATCH status=CLOSED, closed_at=now()
  → Cria TicketMessage is_auto=true: "Chamado encerrado automaticamente"
  → Notifica cliente: type=TICKET_STATUS_CHANGE
```

### 8.3 Empresa Emite NF em Lote → Clientes Recebem → Veem no Portal

```
[ORG_FINANCE] POST /api/campaigns
  → { month_year: "03/2026", label: "Março 2026" }
  → Cria campanha: slug="mar-2026", status=DRAFT

[ORG_FINANCE] POST /api/campaigns/mar-2026/upload-nf (multipart)
  → Valida: mime=application/pdf, tamanho < 100MB
  → Upload MinIO: /{orgSlug}/campaigns/mar-2026/nf.pdf
  → Atualiza campaign.pdf_nf_key + kb_nf

[ORG_FINANCE] POST /api/campaigns/mar-2026/process
  → Baixa PDF do MinIO
  → Para cada página: extrairCnpjDaPagina(texto, paginaNum) ← ALGORITMO ORIGINAL NÃO MODIFICADO
  → Para cada CNPJ encontrado:
      → Ignora se está em organization.cnpjs_ignore
      → Busca client WHERE organization_id AND cnpj
      → Se encontrado: cria CampaignSend { status=PENDING, emails=[client.email_nfe || client.email] }
      → Se não encontrado: cria CampaignSend { status=NO_CADASTRO }

[ORG_FINANCE] POST /api/campaigns/mar-2026/send
  → Valida: status != COMPLETED, pdf_nf_key != null
  → Para cada send com status=PENDING:
      → Cria job Bull "campaign-send" com dados do envio
  → Atualiza campaign.status=ACTIVE, started_at=now()

[WORKER campaign-send.worker.ts — por job]
  → Baixa PDF do MinIO
  → Renderiza template (subject + body) com variáveis do tenant
  → Gera pixel_id = crypto.randomBytes(12).toString('base64url')
  → Embarca pixel no HTML: <img src="https://{slug}.orgdesk.com.br/api/track/{pixelId}">
  → Envia via Nodemailer com SMTP descriptografado do tenant
  → Atualiza send: status=SENT, sent_at=now(), pixel_id
  → Publica Redis pub/sub "campaign:{id}:log" (SSE para frontend)
  → Aguarda send_interval_sec (default 15s)
  → Verifica Redis GET "campaign:{id}:paused" antes de próximo envio

[CLIENTE] Abre email → pixel carregado
  → GET /api/track/{pixelId}
  → Atualiza send.opened_at (se primeira abertura), open_count++
  → Retorna GIF 1x1 transparente (304 se possível)

[CLIENTE NO PORTAL] GET /api/invoices (contexto CLIENT_PORTAL)
  → WHERE organization_id = orgId AND client_id = clientId
  → Exibe NFs do próprio CNPJ com botão de download

[CLIENTE] GET /api/invoices/{id}/download
  → Presigned URL MinIO → download do PDF/XML
```

### 8.4 Onboarding de Novo Tenant

```
[NOVO CLIENTE] POST /api/auth/register
  → { org_slug, org_name, user_name, user_email, user_password }
  → Valida slug: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/
  → Verifica slug único
  → Transação Prisma:
      → cria Organization { slug, name, plan="free" }
      → cria User { email, password_hash=bcrypt(pass,12), role=ORG_ADMIN }
      → cria Membership { user_id, organization_id, role=ORG_ADMIN }
      → cria EmailTemplate padrão
  → Envia email de verificação (SMTP do sistema)
  → activity_log: organization.created

[NOVO ADMIN] Verifica email → Login em {slug}.orgdesk.com.br/login
  → Primeira vez: exibe wizard de onboarding (flag no Redis)
  → Passo 1: Configurar SMTP → POST /api/settings/smtp → POST /api/settings/smtp/test
  → Passo 2: Configurar CNPJs a ignorar → PATCH /api/organizations/me
  → Passo 3: Importar clientes CSV → POST /api/clients/import
  → Passo 4: Criar primeira campanha → /financeiro/campanhas/nova
  → Marca wizard como concluído: Redis SET "onboarding:{orgId}" "done"
```

---

## 9. APIs — Endpoints Completos

### 9.1 Autenticação

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/callback/credentials` | Público | Login com email e senha |
| POST | `/api/auth/signout` | Autenticado | Logout e invalidação de sessão |
| POST | `/api/auth/register` | Público | Registro de novo tenant + ORG_ADMIN |
| GET | `/api/auth/verify-email` | Público | Verificação de email via token |
| POST | `/api/auth/forgot-password` | Público | Solicita reset de senha |
| POST | `/api/auth/reset-password` | Público | Redefine senha via token |
| POST | `/api/auth/accept-invite` | Público | Aceita convite de portal com token |
| GET | `/api/auth/session` | Autenticado | Retorna dados da sessão atual |

### 9.2 Organizações

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/organizations/me` | ORG_ADMIN | Dados da organização atual |
| PATCH | `/api/organizations/me` | ORG_ADMIN | Atualiza nome, logo, CNPJ |
| GET | `/api/admin/organizations` | SUPER_ADMIN | Lista todos os tenants |
| PATCH | `/api/admin/organizations/{id}` | SUPER_ADMIN | Edita tenant (plano, ativo) |
| POST | `/api/admin/organizations/{id}/suspend` | SUPER_ADMIN | Suspende tenant |

### 9.3 Usuários e Memberships

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/users/me` | Autenticado | Perfil do usuário logado |
| PATCH | `/api/users/me` | Autenticado | Atualiza nome, avatar, senha |
| GET | `/api/memberships` | ORG_ADMIN | Lista membros da organização |
| POST | `/api/memberships/invite` | ORG_ADMIN | Convida usuário por email com role |
| PATCH | `/api/memberships/{id}` | ORG_ADMIN | Altera role de um membro |
| DELETE | `/api/memberships/{id}` | ORG_ADMIN | Remove membro da organização |

### 9.4 Clientes

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/clients` | ORG_ADMIN, ORG_FINANCE, ORG_SUPPORT* | Lista com paginação e busca |
| POST | `/api/clients` | ORG_ADMIN, ORG_FINANCE | Cria novo cliente |
| GET | `/api/clients/{id}` | ORG_ADMIN, ORG_FINANCE, ORG_SUPPORT* | Detalhes do cliente |
| PATCH | `/api/clients/{id}` | ORG_ADMIN, ORG_FINANCE | Atualiza dados do cliente |
| DELETE | `/api/clients/{id}` | ORG_ADMIN | Desativa cliente (soft delete) |
| POST | `/api/clients/import` | ORG_ADMIN, ORG_FINANCE | Import em massa via CSV |
| GET | `/api/clients/export` | ORG_ADMIN, ORG_FINANCE | Export CSV |
| POST | `/api/clients/{id}/invite-portal` | ORG_ADMIN, ORG_FINANCE | Envia convite para portal |
| GET | `/api/clients/{id}/contacts` | ORG_ADMIN, ORG_FINANCE | Lista contatos do cliente |
| POST | `/api/clients/{id}/contacts` | ORG_ADMIN, ORG_FINANCE | Adiciona contato |
| GET | `/api/clients/{id}/history` | ORG_ADMIN, ORG_FINANCE | Histórico unificado |

*ORG_SUPPORT: apenas campos básicos, sem dados financeiros

### 9.5 Boletos

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/boletos` | ORG_ADMIN, ORG_FINANCE, CLIENT_PORTAL** | Lista com filtros |
| POST | `/api/boletos` | ORG_ADMIN, ORG_FINANCE | Cria novo boleto |
| GET | `/api/boletos/{id}` | ORG_ADMIN, ORG_FINANCE, CLIENT_PORTAL** | Detalhes |
| PATCH | `/api/boletos/{id}` | ORG_ADMIN, ORG_FINANCE | Edita (apenas PENDING) |
| PATCH | `/api/boletos/{id}/pay` | ORG_ADMIN, ORG_FINANCE | Marca como pago |
| PATCH | `/api/boletos/{id}/cancel` | ORG_ADMIN, ORG_FINANCE | Cancela |
| GET | `/api/boletos/{id}/download` | ORG_ADMIN, ORG_FINANCE, CLIENT_PORTAL** | Presigned URL para PDF |
| POST | `/api/boletos/{id}/upload-pdf` | ORG_ADMIN, ORG_FINANCE | Upload do PDF |
| POST | `/api/boletos/bulk-update` | ORG_ADMIN, ORG_FINANCE | Atualização em massa de status |

**CLIENT_PORTAL: apenas boletos do próprio client_id

### 9.6 Notas Fiscais

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/invoices` | ORG_ADMIN, ORG_FINANCE, CLIENT_PORTAL** | Lista com filtros |
| POST | `/api/invoices` | ORG_ADMIN, ORG_FINANCE | Registra nova NF |
| GET | `/api/invoices/{id}` | ORG_ADMIN, ORG_FINANCE, CLIENT_PORTAL** | Detalhes |
| PATCH | `/api/invoices/{id}/cancel` | ORG_ADMIN, ORG_FINANCE | Cancela NF |
| GET | `/api/invoices/{id}/download` | ORG_ADMIN, ORG_FINANCE, CLIENT_PORTAL** | Presigned URL para PDF/XML |
| POST | `/api/invoices/{id}/upload-pdf` | ORG_ADMIN, ORG_FINANCE | Upload PDF DANFE/NFS-e |
| POST | `/api/invoices/{id}/upload-xml` | ORG_ADMIN, ORG_FINANCE | Upload XML da NF |

### 9.7 Campanhas de Envio

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/campaigns` | ORG_ADMIN, ORG_FINANCE | Lista campanhas |
| POST | `/api/campaigns` | ORG_ADMIN, ORG_FINANCE | Cria nova campanha |
| GET | `/api/campaigns/{slug}` | ORG_ADMIN, ORG_FINANCE | Detalhes + lista de envios |
| POST | `/api/campaigns/{slug}/upload-nf` | ORG_ADMIN, ORG_FINANCE | Upload PDF NF → MinIO |
| POST | `/api/campaigns/{slug}/upload-boleto` | ORG_ADMIN, ORG_FINANCE | Upload PDF boleto → MinIO |
| POST | `/api/campaigns/{slug}/process` | ORG_ADMIN, ORG_FINANCE | Extrai CNPJs, cruza clientes |
| POST | `/api/campaigns/{slug}/send` | ORG_ADMIN, ORG_FINANCE | Inicia envio em lote |
| PATCH | `/api/campaigns/{slug}/pause` | ORG_ADMIN, ORG_FINANCE | Pausa envio |
| PATCH | `/api/campaigns/{slug}/resume` | ORG_ADMIN, ORG_FINANCE | Retoma envio pausado |
| GET | `/api/campaigns/{slug}/log` | ORG_ADMIN, ORG_FINANCE | SSE stream de log em tempo real |
| GET | `/api/campaigns/{slug}/stats` | ORG_ADMIN, ORG_FINANCE | Estatísticas de envio |

### 9.8 Rastreamento de Email

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/track/{pixelId}` | Público | GIF 1x1 — registra abertura |
| GET | `/api/tracking` | ORG_ADMIN, ORG_FINANCE | Dashboard de rastreamento |
| GET | `/api/tracking/{campaignSlug}` | ORG_ADMIN, ORG_FINANCE | Rastreamento por campanha |

### 9.9 Tickets (Chamados)

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/tickets` | Todos* | Lista com filtros |
| POST | `/api/tickets` | Todos autenticados | Cria novo ticket |
| GET | `/api/tickets/{id}` | Todos* | Detalhes + mensagens |
| PATCH | `/api/tickets/{id}` | ORG_ADMIN, ORG_SUPPORT | Edita título, prioridade, categoria |
| PATCH | `/api/tickets/{id}/status` | ORG_ADMIN, ORG_SUPPORT | Muda status |
| PATCH | `/api/tickets/{id}/assign` | ORG_ADMIN, ORG_SUPPORT | Atribui a agente |
| PATCH | `/api/tickets/{id}/priority` | ORG_ADMIN, ORG_SUPPORT | Altera prioridade |
| GET | `/api/tickets/{id}/messages` | Todos* | Lista mensagens |
| POST | `/api/tickets/{id}/messages` | Todos autenticados | Adiciona mensagem |
| GET | `/api/tickets/{id}/attachments` | Todos* | Lista anexos |
| POST | `/api/tickets/{id}/attachments` | Todos autenticados | Upload de anexo |
| GET | `/api/tickets/{id}/attachments/{aid}/download` | Todos* | Presigned URL do anexo |

*com restrição de escopo por role

### 9.10 Notificações

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/notifications` | Autenticado | Lista notificações paginadas |
| GET | `/api/notifications/stream` | Autenticado | SSE de notificações em tempo real |
| GET | `/api/notifications/unread-count` | Autenticado | Contagem de não lidas |
| PATCH | `/api/notifications/{id}/read` | Autenticado | Marca como lida |
| PATCH | `/api/notifications/read-all` | Autenticado | Marca todas como lidas |

### 9.11 Configurações

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/settings/smtp` | ORG_ADMIN | Lê config SMTP (senha mascarada) |
| PATCH | `/api/settings/smtp` | ORG_ADMIN | Atualiza SMTP |
| POST | `/api/settings/smtp/test` | ORG_ADMIN | Teste de conexão SMTP |
| GET | `/api/settings/email-template` | ORG_ADMIN, ORG_FINANCE | Lê template atual |
| PATCH | `/api/settings/email-template` | ORG_ADMIN, ORG_FINANCE | Atualiza template |
| POST | `/api/settings/email-template/preview` | ORG_ADMIN, ORG_FINANCE | Preview renderizado |
| GET | `/api/settings/sla` | ORG_ADMIN | Lê config de SLA |
| PATCH | `/api/settings/sla` | ORG_ADMIN | Atualiza SLA por prioridade |
| GET | `/api/settings/webhooks` | ORG_ADMIN | Lê webhook URL e secret mascarado |
| PATCH | `/api/settings/webhooks` | ORG_ADMIN | Atualiza webhook URL |
| POST | `/api/settings/webhooks/rotate-secret` | ORG_ADMIN | Gera novo webhook secret |
| POST | `/api/settings/webhooks/test` | ORG_ADMIN | Dispara webhook de teste |

### 9.12 Relatórios e Auditoria

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/api/reports/financial` | ORG_ADMIN, ORG_FINANCE | Resumo financeiro (pendente, pago, vencido) |
| GET | `/api/reports/adimplencia` | ORG_ADMIN, ORG_FINANCE | Adimplência por cliente |
| GET | `/api/reports/tickets` | ORG_ADMIN, ORG_SUPPORT | Métricas de chamados (SLA, tempo médio) |
| GET | `/api/reports/campaigns` | ORG_ADMIN, ORG_FINANCE | Taxa de abertura por campanha |
| GET | `/api/activity-log` | ORG_ADMIN | Log de auditoria paginado |
| GET | `/api/admin/activity-log` | SUPER_ADMIN | Log global (todos os tenants) |

---

## Apêndice A — Decisões Arquiteturais

### Numeração Sequencial de Tickets por Organização

Para exibir `#1042` em vez de um CUID opaco, o número do ticket é calculado via transação serializable:

```sql
-- Dentro de BEGIN SERIALIZABLE ... COMMIT
SELECT COALESCE(MAX(number), 0) + 1
FROM tickets
WHERE organization_id = $1
```

Isso garante sequencialidade sem race conditions.

### SSE em Vez de WebSocket

Server-Sent Events são escolhidos por simplicidade de infraestrutura: funcionam com Nginx padrão (com `proxy_buffering off`), não requerem handshake de upgrade e são unidirecionais (suficiente para log de envio e notificações). WebSocket seria necessário apenas para chat em tempo real — não é o caso.

### Separação Completa Dashboard vs Portal

O painel interno e o portal do cliente usam:
- URLs distintos (subdomínios diferentes)
- Cookies de sessão distintos (`next-auth.session-token` vs `next-auth.portal-session-token`)
- JWT payloads distintos (`role: ORG_*` vs `role: CLIENT_PORTAL` com `clientId` extra)
- Layouts distintos em App Router (`(dashboard)` vs `(portal)`)

Isso impede que uma sessão de portal acesse acidentalmente rotas do painel interno.

### Presigned URLs para Todos os Arquivos

Nenhum arquivo do MinIO é acessível publicamente. Toda leitura passa pela API que verifica permissão antes de gerar uma URL com validade de 15 minutos. Isso impede que URLs de download sejam compartilhadas indefinidamente e garante o isolamento de tenant.

---

*Documento gerado em 2026-03-19. Guia para toda a implementação do OrgDesk.*
