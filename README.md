# Conciliação Contábil

Aplicação web para **conciliação contábil automática** a partir de exportações do razão
contábil em Excel (.xlsx). Importa o razão, classifica e estrutura os lançamentos, executa
conciliação automática por regras e oferece **comparação entre duas contas distintas**
(Fornecedores × Banco, Clientes × Banco, Intercompany).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma ORM** + **PostgreSQL**
- **NextAuth** (credentials) para autenticação
- **xlsx (SheetJS)** para parsing do razão
- **Vitest** para testes

---

## Desenvolvimento local

### Pré-requisitos
- Node.js **20.x**
- PostgreSQL (local ou em container)

```bash
# Postgres em container (opcional)
docker run -d --name pg-conciliacao \
  -e POSTGRES_PASSWORD=password -e POSTGRES_DB=conciliacao_dev \
  -p 5432:5432 postgres:16
```

### Passos

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env        # edite DATABASE_URL e NEXTAUTH_SECRET

# 3. Banco: aplica as migrations
npx prisma migrate deploy

# 4. Usuário admin (default dev: admin@ncc.com.br / conciliacao123)
npx prisma db seed

# 5. Sobe a aplicação
npm run dev                 # http://localhost:3000
```

> **Fixture de testes:** os testes do parser leem `fixtures/razao_exemplo.xlsx`, que contém
> dados reais e **não é versionado** (está no `.gitignore`). Em um clone novo, coloque o
> arquivo nesse caminho para rodar a suíte completa.

### Testes

```bash
npm run test          # 45 testes
npm run typecheck     # tsc --noEmit
```

---

## Deploy no Vercel — passo a passo

### 1. Banco de dados gerenciado
Provisione um Postgres em **Neon**, **Supabase** ou **Vercel Postgres**. Por ser serverless,
use a **string de conexão com pooler** para não esgotar conexões:

- **Neon:** `postgresql://USER:PASS@HOST/db?sslmode=require&pgbouncer=true&connection_limit=1`
- **Supabase:** use o host/porta do **pooler** (porta `6543`), não a conexão direta.

### 2. Importar o projeto no Vercel
1. Vercel → **Add New… → Project** e selecione o repositório do GitHub.
2. Framework: **Next.js** (detectado automaticamente). Build/Output ficam no padrão — o
   `package.json` já roda `prisma generate` via `postinstall`, e o Node está fixado em `20.x`
   por `engines`.

### 3. Environment Variables (Project → Settings → Environment Variables)

| Variável | Valor |
|---|---|
| `DATABASE_URL` | string do Postgres gerenciado **com pooler** |
| `NEXTAUTH_SECRET` | segredo real — gere com `openssl rand -base64 32` |
| `NEXTAUTH_URL` | a URL pública do projeto (`https://seu-app.vercel.app`) |
| `ADMIN_EMAIL` | e-mail do admin inicial |
| `ADMIN_PASSWORD` | senha forte do admin (obrigatória em produção) |

`REDIS_URL` não é necessária (a aplicação não usa fila/Redis).

### 4. Deploy
Dispare o deploy (push na `main` ou botão **Deploy**). O build roda `prisma generate` +
`next build`.

### 5. Preparar o banco de produção (uma vez)
As migrations e o seed **não rodam no build**. Execute uma vez apontando para o banco de
produção (exemplo em PowerShell):

```powershell
$env:DATABASE_URL="<DATABASE_URL-de-producao>"
$env:NODE_ENV="production"
$env:ADMIN_EMAIL="voce@empresa.com"
$env:ADMIN_PASSWORD="<senha-forte>"

npx prisma migrate deploy   # aplica as migrations no banco limpo
npx prisma db seed          # cria o usuário admin (falha se ADMIN_PASSWORD vazio em produção)
```

Pronto: acesse a URL do Vercel e faça login com as credenciais do admin.

---

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção (após build) |
| `npm run test` | Suíte de testes (Vitest) |
| `npm run typecheck` | Checagem de tipos (`tsc --noEmit`) |
| `npx prisma migrate deploy` | Aplica migrations |
| `npx prisma db seed` | Cria/atualiza o usuário admin |

---

## Estrutura

```
src/
├── app/                      # rotas (App Router) + API routes
│   ├── (app)/                #   área autenticada: importação, lançamentos,
│   │                         #   conciliação, comparação, relatórios
│   ├── (auth)/login          #   login
│   └── api/                  #   upload, conciliacao, comparacao, pares, relatorios
├── components/               # UI por domínio
└── lib/
    ├── parser/               # parsing do razão Excel + tokens do complemento
    ├── engine/               # conciliação (matcher) e comparação entre contas (comparador)
    ├── conciliacao/          # orquestração/consulta de conciliação
    ├── comparacao/           # orquestração/consulta de comparação entre contas
    └── ...
prisma/
├── schema.prisma             # modelo de dados
├── migrations/               # migrations versionadas
└── seed.ts                   # usuário admin (parametrizado por env vars)
```
