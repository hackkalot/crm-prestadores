# CRM Prestadores - Documentação Técnica

Sistema interno para gestão do ciclo de vida de prestadores de serviços — desde a candidatura inicial até à operação activa, incluindo onboarding, definição de preços e cobertura geográfica.

---

## Quick Start

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd crm-prestadores

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.local.example .env.local
# Preencher as variáveis (ver secção "Variáveis de Ambiente")

# 4. Iniciar servidor de desenvolvimento
npm run dev

# 5. Abrir no browser
open http://localhost:3000
```

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Framework | Next.js (App Router) | 16.x |
| Runtime | React | 19.x |
| Linguagem | TypeScript | 5.x (strict mode) |
| Base de Dados | Supabase (PostgreSQL) | - |
| Estilos | Tailwind CSS | 4.x |
| Componentes UI | Radix UI + shadcn/ui | - |
| Validação | Zod | 4.x |
| Gráficos | Recharts | 3.x |
| Mapas | Mapbox GL + react-map-gl | 3.x |
| Drag & Drop | dnd-kit | 6.x |

---

## Variáveis de Ambiente

Criar ficheiro `.env.local` com:

```env
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# HubSpot (opcional - para webhooks de candidaturas)
HUBSPOT_WEBHOOK_SECRET=xxx

# Mapbox (obrigatório - para mapa de cobertura)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx

# GitHub Actions (produção - para sync com backoffice)
GITHUB_ACTIONS_TOKEN=ghp_xxx
GITHUB_REPO=org/repo-name

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Onde obter:**
- Supabase: [Dashboard](https://supabase.com/dashboard) → Project Settings → API
- Mapbox: [Account](https://account.mapbox.com/) → Access tokens
- GitHub: Settings → Developer settings → Personal access tokens (fine-grained)

---

## Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (hot reload) |
| `npm run build` | Build de produção |
| `npm run start` | Iniciar build de produção |
| `npm run lint` | Verificar código com ESLint |
| `npm run db:generate` | Gerar tipos TypeScript do schema Supabase |
| `npm run db:push` | Aplicar migrações pendentes |
| `npm run db:reset` | Reset da base de dados local |

---

## Estrutura do Projeto

```
crm-prestadores/
├── src/
│   ├── app/                    # Rotas (Next.js App Router)
│   │   ├── (auth)/             # Login, autenticação
│   │   ├── (dashboard)/        # Área protegida
│   │   │   ├── candidaturas/   # Gestão de candidaturas
│   │   │   ├── onboarding/     # Pipeline Kanban
│   │   │   ├── prestadores/    # Lista de prestadores
│   │   │   ├── providers/[id]/ # Detalhe de prestador
│   │   │   ├── pedidos/        # Pedidos de serviço
│   │   │   ├── rede/           # Mapa de cobertura
│   │   │   ├── kpis/           # Dashboard métricas
│   │   │   ├── agenda/         # Calendário tarefas
│   │   │   └── configuracoes/  # Definições sistema
│   │   └── api/                # API Routes
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Base (shadcn/ui)
│   │   └── [domínio]/          # Por funcionalidade
│   ├── lib/                    # Lógica de negócio
│   │   ├── supabase/           # Clientes DB
│   │   └── [domínio]/          # Server Actions
│   └── types/                  # Tipos TypeScript
├── public/                     # Assets estáticos
├── scripts/                    # Scripts de sync/import
├── supabase/                   # Migrações DB
└── docs/                       # Esta documentação
```

---

## Mapa da Documentação

| Preciso de... | Ver ficheiro |
|---------------|--------------|
| Entender a arquitectura e decisões técnicas | [01-ARQUITETURA.md](./01-ARQUITETURA.md) |
| Ver fluxos de negócio e estados | [02-FLUXOS-NEGOCIO.md](./02-FLUXOS-NEGOCIO.md) |
| Conhecer o schema da base de dados | [03-BASE-DADOS.md](./03-BASE-DADOS.md) |
| Perceber integrações externas (Backoffice, GitHub Actions, Mapbox) | [04-INTEGRACOES.md](./04-INTEGRACOES.md) |

---

## Glossário de Termos de Negócio

| Termo | Significado |
|-------|-------------|
| **Prestador** | Empresa ou profissional que presta serviços aos clientes finais |
| **Candidatura** | Registo inicial de um potencial prestador (pode vir do HubSpot ou ser criado manualmente) |
| **Onboarding** | Processo de integração do prestador com tarefas obrigatórias por etapa |
| **Card** | Representação visual do prestador no Kanban de onboarding |
| **Etapa** | Fase do onboarding (1-6), cada uma com tarefas específicas |
| **Backoffice FIXO** | Sistema externo legado de onde são importados pedidos de serviço |
| **Backoffice** | Sistema interno usado pelos users do crm |
| **Pedido de Serviço** | Trabalho atribuído a um prestador (importado do backoffice) |
| **Cobertura** | Concelhos/distritos onde um prestador pode operar |
| **Preços de Referência** | Tabela base de preços por serviço/categoria |
| **Preços do Prestador** | Preços acordados com cada prestador (podem diferir da referência) |

---

## Principais Funcionalidades

### 1. Gestão de Candidaturas
- Criação manual ou via webhook HubSpot
- Detecção de duplicados (email, NIF, nome fuzzy)
- Merge automático ou manual de registos

### 2. Pipeline de Onboarding (Kanban)
- 6 etapas com tarefas configuráveis
- Drag & drop entre etapas
- Progresso por conclusão de tarefas
- Tipos: normal vs urgente

### 3. Gestão de Prestadores Activos
- Listagem com filtros avançados
- Detalhe com tabs (perfil, preços, histórico, documentos)
- Definição de cobertura geográfica
- Gestão de preços por serviço

### 4. Mapa de Cobertura da Rede
- Visualização choropleth de Portugal (308 concelhos)
- Filtro por tipo de serviço
- Cores por nível de cobertura

### 5. Sincronização com Backoffice
- Import de pedidos de serviço via Puppeteer
- Execução via GitHub Actions (produção)
- Logs e tracking de sincronizações

### 6. Dashboard de KPIs
- Métricas de performance
- Gráficos temporais
- Indicadores por estado

---

## Convenções de Código

### Imports
```typescript
// 1. Bibliotecas externas
import { useState } from 'react'

// 2. Componentes UI
import { Button } from '@/components/ui/button'

// 3. Lib/utils
import { cn } from '@/lib/utils'

// 4. Types
import type { Provider } from '@/types/database'
```

### Nomenclatura
- **Ficheiros**: kebab-case (`provider-detail.tsx`)
- **Componentes**: PascalCase (`ProviderDetail`)
- **Funções**: camelCase (`getProviders`)
- **Constantes**: SCREAMING_SNAKE_CASE (`MAX_ITEMS`)

### Server Actions
Todas as operações de dados usam Server Actions (`'use server'`), nunca API routes para mutações.

---

## Contactos e Recursos

- **Repositório**: [GitHub](https://github.com/org/crm-prestadores)
- **Supabase Dashboard**: [Link](https://supabase.com/dashboard)
- **Vercel Dashboard**: [Link](https://vercel.com/dashboard)

---

*Última actualização: Janeiro 2026*
