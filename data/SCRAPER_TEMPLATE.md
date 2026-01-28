# Template: Sistema de Scraping para Backoffice OutSystems

Este documento serve como guia para criar novos scrapers seguindo o padrão estabelecido no projeto.

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         CRM (Next.js)                           │
├─────────────────────────────────────────────────────────────────┤
│  /[pagina] (page)                                               │
│    ├── Sync[Nome]Dialog (botão sync)                           │
│    ├── [Nome]Stats (cards estatísticas)                        │
│    ├── [Nome]Filters (filtros)                                 │
│    └── [Nome]List (tabela paginada)                            │
│                                                                 │
│  /configuracoes/sync-logs                                       │
│    └── Tab "[Nome]" (logs de sincronização)                    │
├─────────────────────────────────────────────────────────────────┤
│                         API Routes                              │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/sync/[nome]              (localhost - Puppeteer)    │
│  POST /api/sync/[nome]-github-actions (produção - trigger GH) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions                             │
├─────────────────────────────────────────────────────────────────┤
│  sync-[nome].yml                                                │
│    ├── Triggers: cron / dispatch / repository_dispatch         │
│    ├── Instala Puppeteer + Chrome                              │
│    └── Executa sync-[nome]-github.ts                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Scripts                                  │
├─────────────────────────────────────────────────────────────────┤
│  export-[nome]-data.ts                                          │
│    └── Puppeteer: login → interagir → exportar Excel           │
│                                                                 │
│  sync-[nome]-github.ts                                          │
│    └── Ler Excel → transformar → upsert Supabase               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                 │
├─────────────────────────────────────────────────────────────────┤
│  [nome]_[entidade]      (dados principais)                     │
│  [nome]_sync_logs       (histórico de syncs)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Ficheiros a Criar

### 1. Scripts (scripts/)

| Ficheiro | Descrição |
|----------|-----------|
| `export-[nome]-data.ts` | Scraper Puppeteer |
| `sync-[nome]-github.ts` | Parser Excel + Upsert Supabase |

### 2. GitHub Actions (.github/workflows/)

| Ficheiro | Descrição |
|----------|-----------|
| `sync-[nome].yml` | Workflow com schedule, dispatch, repository_dispatch |

### 3. API Routes (src/app/api/sync/)

| Ficheiro | Descrição |
|----------|-----------|
| `[nome]/route.ts` | Endpoint local (localhost) |
| `[nome]-github-actions/route.ts` | Endpoint produção (trigger GH) |

### 4. UI Components (src/components/)

| Ficheiro | Descrição |
|----------|-----------|
| `sync/sync-[nome]-dialog.tsx` | Dialog para trigger manual |
| `[nome]/[nome]-stats.tsx` | Cards de estatísticas |
| `[nome]/[nome]-filters.tsx` | Filtros da página |
| `[nome]/[nome]-list.tsx` | Tabela paginada |

### 5. Server Actions (src/lib/)

| Ficheiro | Descrição |
|----------|-----------|
| `[nome]/actions.ts` | CRUD, filtros, stats |

### 6. Página (src/app/(dashboard)/)

| Ficheiro | Descrição |
|----------|-----------|
| `[nome]/page.tsx` | Página principal |

### 7. Database (supabase/migrations/)

| Ficheiro | Descrição |
|----------|-----------|
| `YYYYMMDDHHMMSS_[nome].sql` | Tabela de dados + tabela de logs |

### 8. Modificações Existentes

| Ficheiro | Modificação |
|----------|-------------|
| `src/components/layout/sidebar.tsx` | Adicionar link na navegação |
| `src/lib/sync/logs-actions.ts` | Adicionar funções de logs |
| `src/components/sync/sync-logs-tabs.tsx` | Adicionar tab de logs |
| `src/app/(dashboard)/configuracoes/sync-logs/page.tsx` | Fetch de logs |

---

## Estrutura dos Scripts

### export-[nome]-data.ts

```typescript
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'

const BACKOFFICE_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/[Pagina]'

export async function run[Nome]Scrapper(): Promise<string> {
  const outputDir = path.join(process.cwd(), 'data', '[nome]-outputs')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  })

  try {
    const page = await browser.newPage()

    // 1. Login
    await page.goto('https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/Login')
    await page.type('#Input_UsernameVal', process.env.BACKOFFICE_USERNAME!)
    await page.type('#Input_PasswordVal', process.env.BACKOFFICE_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForNavigation()

    // 2. Navegar para página
    await page.goto(BACKOFFICE_URL)
    await page.waitForSelector('[seletor-principal]')

    // 3. Interagir (filtros, dropdowns, etc.)
    await page.select('#dropdown-id', 'valor')

    // 4. Configurar download
    const client = await page.createCDPSession()
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: outputDir,
    })

    // 5. Clicar exportar e aguardar
    const exportBtn = await page.$('[seletor-botao-exportar]')
    await exportBtn?.click()

    // 6. Aguardar download
    const excelPath = await waitForDownload(outputDir, 60000)

    return excelPath
  } finally {
    await browser.close()
  }
}

async function waitForDownload(dir: string, timeout: number): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.includes('.crdownload'))
    if (files.length > 0) {
      return path.join(dir, files[files.length - 1])
    }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error('Download timeout')
}
```

### sync-[nome]-github.ts

```typescript
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import fs from 'fs'
import { run[Nome]Scrapper } from './export-[nome]-data'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapeamento Excel → DB
const columnMapping: Record<string, string> = {
  'Coluna Excel 1': 'coluna_db_1',
  'Coluna Excel 2': 'coluna_db_2',
  // ...
}

async function main() {
  const syncLogId = process.argv.find(a => a.startsWith('--sync-log-id='))?.split('=')[1]
  const startTime = Date.now()

  // Criar ou atualizar log
  let logId = syncLogId
  if (!logId) {
    const { data } = await supabase
      .from('[nome]_sync_logs')
      .insert({ status: 'in_progress', triggered_by_system: 'github-actions-scheduled' })
      .select('id')
      .single()
    logId = data?.id
  } else {
    await supabase
      .from('[nome]_sync_logs')
      .update({ status: 'in_progress' })
      .eq('id', logId)
  }

  try {
    // Executar scrapper
    const excelPath = await run[Nome]Scrapper()
    const fileSize = Math.round(fs.statSync(excelPath).size / 1024)

    // Ler Excel
    const workbook = XLSX.readFile(excelPath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]

    // Transformar dados
    const records = rows.map(row => {
      const record: Record<string, unknown> = {}
      for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
        record[dbCol] = transformValue(row[excelCol], dbCol)
      }
      record.synced_at = new Date().toISOString()
      return record
    })

    // Upsert em batches
    const BATCH_SIZE = 500
    let inserted = 0, updated = 0

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
      const { data, error } = await supabase
        .from('[nome]_[entidade]')
        .upsert(batch, { onConflict: '[chave_unica]' })
        .select('id')

      if (error) throw error
      // Contar inserted/updated...
    }

    // Atualizar log sucesso
    await supabase
      .from('[nome]_sync_logs')
      .update({
        status: 'success',
        duration_seconds: Math.round((Date.now() - startTime) / 1000),
        records_processed: records.length,
        records_inserted: inserted,
        records_updated: updated,
        excel_file_path: excelPath,
        excel_file_size_kb: fileSize,
      })
      .eq('id', logId)

  } catch (error) {
    // Atualizar log erro
    await supabase
      .from('[nome]_sync_logs')
      .update({
        status: 'error',
        duration_seconds: Math.round((Date.now() - startTime) / 1000),
        error_message: error.message,
        error_stack: error.stack,
      })
      .eq('id', logId)
    throw error
  }
}

function transformValue(value: unknown, column: string): unknown {
  if (value === null || value === undefined || value === '') return null

  // Datas
  if (column.includes('_at') || column.includes('_date')) {
    return parseDate(value as string)
  }
  // Números
  if (column.includes('_cost') || column.includes('_value') || column.includes('_amount')) {
    return parseNumber(value)
  }
  // Booleans
  if (column.startsWith('is_') || column.startsWith('has_')) {
    return value === 'Sim' || value === 'True' || value === true
  }

  return value
}

main().catch(console.error)
```

---

## Estrutura do Workflow GitHub Actions

### sync-[nome].yml

```yaml
name: Sync [Nome] Data

on:
  schedule:
    - cron: '0 4 * * *'  # Hora UTC

  workflow_dispatch:

  repository_dispatch:
    types: [sync-[nome]]

env:
  NODE_VERSION: '20'

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Chromium for Puppeteer
        run: |
          npx puppeteer browsers install chrome
          echo "PUPPETEER_EXECUTABLE_PATH=$(find $HOME/.cache/puppeteer -name 'chrome' -type f | head -1)" >> $GITHUB_ENV

      - name: Create output directories
        run: mkdir -p data/[nome]-outputs

      - name: Run scrapper and sync
        env:
          BACKOFFICE_USERNAME: ${{ secrets.BACKOFFICE_USERNAME }}
          BACKOFFICE_PASSWORD: ${{ secrets.BACKOFFICE_PASSWORD }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          SYNC_LOG_ID="${{ github.event.client_payload.sync_log_id }}"
          if [ -n "$SYNC_LOG_ID" ] && [ "$SYNC_LOG_ID" != "null" ]; then
            npx tsx scripts/sync-[nome]-github.ts --sync-log-id="$SYNC_LOG_ID"
          else
            npx tsx scripts/sync-[nome]-github.ts
          fi

      - name: Upload Excel artifact
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: [nome]-data-${{ github.run_id }}
          path: data/[nome]-outputs/*.xlsx
          retention-days: 7

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: [nome]-sync-logs-${{ github.run_id }}
          path: |
            data/*.log
            data/[nome]-outputs/*.png
          retention-days: 3
```

---

## Estrutura das API Routes

### /api/sync/[nome]/route.ts (Local)

```typescript
import { NextResponse } from 'next/server'
import { run[Nome]Scrapper } from '@/scripts/export-[nome]-data'

export async function POST() {
  try {
    const result = await run[Nome]Scrapper()
    return NextResponse.json({ success: true, file: result })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### /api/sync/[nome]-github-actions/route.ts (Produção)

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Criar log
    const admin = createAdminClient()
    const { data: log } = await admin
      .from('[nome]_sync_logs')
      .insert({
        status: 'pending',
        triggered_by: user?.id || null,
      })
      .select('id')
      .single()

    // Disparar GitHub Actions
    const token = process.env.GITHUB_ACTIONS_TOKEN
    const repo = process.env.GITHUB_REPO

    await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        event_type: 'sync-[nome]',
        client_payload: { sync_log_id: log?.id }
      })
    })

    return NextResponse.json({ success: true, logId: log?.id })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

## Estrutura da Migração SQL

```sql
-- Tabela de dados
CREATE TABLE [nome]_[entidade] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  [chave_unica] TEXT UNIQUE NOT NULL,
  -- colunas específicas...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_[nome]_[coluna] ON [nome]_[entidade]([coluna]);

-- Trigger updated_at
CREATE TRIGGER update_[nome]_[entidade]_updated_at
  BEFORE UPDATE ON [nome]_[entidade]
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de logs
CREATE TABLE [nome]_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by UUID REFERENCES users(id),
  triggered_by_system TEXT,
  status TEXT DEFAULT 'pending',
  duration_seconds INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  excel_file_path TEXT,
  excel_file_size_kb INTEGER,
  error_message TEXT,
  error_stack TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE [nome]_[entidade] ENABLE ROW LEVEL SECURITY;
ALTER TABLE [nome]_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON [nome]_[entidade]
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated" ON [nome]_sync_logs
  FOR SELECT TO authenticated USING (true);
```

---

## Estrutura do Dialog de Sync

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { [Icon], Loader2 } from 'lucide-react'

export function Sync[Nome]Dialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSync = async () => {
    setLoading(true)
    setOpen(false)

    const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
    const apiEndpoint = isProduction ? '/api/sync/[nome]-github-actions' : '/api/sync/[nome]'

    fetch(apiEndpoint, { method: 'POST' })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) alert(`Erro: ${data.error}`)
      })
      .catch((err) => alert('Erro ao iniciar sincronização'))
      .finally(() => setLoading(false))

    router.push('/configuracoes/sync-logs?tab=[nome]')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <[Icon] className="h-4 w-4 mr-2" />
          Sincronizar [Nome]
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sincronizar [Nome]</DialogTitle>
          <DialogDescription>
            Descrição do que será sincronizado...
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSync} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <[Icon] />}
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Secrets Necessários

### GitHub Repository Secrets
- `BACKOFFICE_USERNAME` - Email de login
- `BACKOFFICE_PASSWORD` - Password
- `SUPABASE_URL` - URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

### Vercel Environment Variables
- `GITHUB_ACTIONS_TOKEN` - Fine-grained PAT (Contents read/write)
- `GITHUB_REPO` - ex: `hackkalot/crm-prestadores`

---

## Ordem de Execução

1. **Criar scraper** (`export-[nome]-data.ts`)
2. **Testar localmente** e verificar Excel
3. **Analisar Excel** e definir schema
4. **Criar migração SQL** + aplicar (`npm run db:push`)
5. **Regenerar tipos** (`npm run db:generate`)
6. **Criar script sync** (`sync-[nome]-github.ts`)
7. **Criar workflow** (`sync-[nome].yml`)
8. **Criar API routes** (local + github-actions)
9. **Criar UI dialog**
10. **Criar página** (stats, filters, list)
11. **Adicionar ao sidebar**
12. **Adicionar tab de logs**
13. **Testar end-to-end**
14. **Commit e push**

---

## Exemplo Completo: Faturação (Billing)

| Componente | Ficheiro |
|------------|----------|
| Scraper | `scripts/export-billing-data.ts` |
| Sync Script | `scripts/sync-billing-github.ts` |
| Workflow | `.github/workflows/sync-billing.yml` |
| API Local | `src/app/api/sync/billing/route.ts` |
| API Prod | `src/app/api/sync/billing-github-actions/route.ts` |
| Dialog | `src/components/sync/sync-billing-dialog.tsx` |
| Stats | `src/components/faturacao/faturacao-stats.tsx` |
| Filters | `src/components/faturacao/faturacao-filters.tsx` |
| List | `src/components/faturacao/faturacao-list.tsx` |
| Page | `src/app/(dashboard)/faturacao/page.tsx` |
| Actions | `src/lib/billing/actions.ts` |
| Migration | `supabase/migrations/20260113100000_billing_processes.sql` |
| Logs Actions | `src/lib/sync/logs-actions.ts` (modificado) |
| Logs Tabs | `src/components/sync/sync-logs-tabs.tsx` (modificado) |
| Sidebar | `src/components/layout/sidebar.tsx` (modificado) |

---

*Última atualização: 13 Janeiro 2026*