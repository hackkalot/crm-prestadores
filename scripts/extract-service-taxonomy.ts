/**
 * Script para extrair taxonomia de serviços da tabela service_requests
 * Gera uma lista única de categorias + serviços para criar tabela de mapeamento
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ServiceTaxonomy {
  category: string
  service: string
  num_pedidos: number
}

async function extractServiceTaxonomy() {
  console.log('🔍 Extraindo taxonomia de serviços...\n')

  // Obter todos os service_requests
  const { data: requests, error } = await supabase
    .from('service_requests')
    .select('category, service')
    .not('category', 'is', null)
    .not('service', 'is', null)

  if (error) {
    console.error('❌ Erro ao obter service_requests:', error)
    process.exit(1)
  }

  // Agrupar por categoria + serviço e contar
  const taxonomyMap = new Map<string, ServiceTaxonomy>()

  requests.forEach((req) => {
    const key = `${req.category}|||${req.service}`

    if (taxonomyMap.has(key)) {
      const existing = taxonomyMap.get(key)!
      existing.num_pedidos++
    } else {
      taxonomyMap.set(key, {
        category: req.category,
        service: req.service,
        num_pedidos: 1
      })
    }
  })

  // Converter para array e ordenar
  const taxonomy = Array.from(taxonomyMap.values()).sort((a, b) => {
    // Ordenar por categoria, depois por número de pedidos (desc), depois por serviço
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }
    if (a.num_pedidos !== b.num_pedidos) {
      return b.num_pedidos - a.num_pedidos
    }
    return a.service.localeCompare(b.service)
  })

  console.log(`✅ Encontradas ${taxonomy.length} combinações únicas de categoria + serviço\n`)

  // Estatísticas
  const categorias = new Set(taxonomy.map(t => t.category))
  console.log(`📊 Estatísticas:`)
  console.log(`   - Categorias únicas: ${categorias.size}`)
  console.log(`   - Total de serviços: ${taxonomy.length}`)
  console.log(`   - Pedidos analisados: ${requests.length}\n`)

  // Mostrar top 10
  console.log(`🔝 Top 10 serviços mais pedidos:`)
  taxonomy
    .slice(0, 10)
    .forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.category} → ${t.service} (${t.num_pedidos} pedidos)`)
    })

  // Agrupar por categoria
  console.log(`\n📋 Serviços por categoria:\n`)
  categorias.forEach(cat => {
    const servicos = taxonomy.filter(t => t.category === cat)
    console.log(`${cat} (${servicos.length} serviços):`)
    servicos.forEach(s => {
      console.log(`  - ${s.service} (${s.num_pedidos})`)
    })
    console.log('')
  })

  // Gerar CSV
  const csvRows = [
    'categoria,servico,num_pedidos',
    ...taxonomy.map(t => `"${t.category}","${t.service}",${t.num_pedidos}`)
  ]
  const csvContent = csvRows.join('\n')

  const outputPath = path.join(__dirname, '..', 'data', 'service-taxonomy.csv')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, csvContent, 'utf-8')

  console.log(`\n💾 CSV guardado em: ${outputPath}`)

  // Gerar Markdown table
  const mdRows = [
    '| Categoria | Serviço | Nº Pedidos |',
    '|-----------|---------|------------|',
    ...taxonomy.map(t => `| ${t.category} | ${t.service} | ${t.num_pedidos} |`)
  ]
  const mdContent = `# Taxonomia de Serviços\n\n${mdRows.join('\n')}\n\n**Total:** ${taxonomy.length} serviços em ${categorias.size} categorias\n`

  const mdPath = path.join(__dirname, '..', 'data', 'service-taxonomy.md')
  fs.writeFileSync(mdPath, mdContent, 'utf-8')

  console.log(`📄 Markdown guardado em: ${mdPath}`)

  // Gerar SQL para criar tabela
  const sqlRows = taxonomy.map((t, i) => {
    const categoryEscaped = t.category.replace(/'/g, "''")
    const serviceEscaped = t.service.replace(/'/g, "''")
    return `  ('${categoryEscaped}', '${serviceEscaped}', ${t.num_pedidos})${i === taxonomy.length - 1 ? ';' : ','}`
  })

  const sqlContent = `-- Taxonomia de Serviços extraída de service_requests
-- Gerado automaticamente em ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS service_taxonomy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  service TEXT NOT NULL,
  num_historical_requests INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(category, service)
);

-- Inserir dados
INSERT INTO service_taxonomy (category, service, num_historical_requests)
VALUES
${sqlRows.join('\n')}
ON CONFLICT (category, service)
DO UPDATE SET
  num_historical_requests = EXCLUDED.num_historical_requests,
  updated_at = NOW();

-- Índices
CREATE INDEX IF NOT EXISTS idx_service_taxonomy_category ON service_taxonomy(category);
CREATE INDEX IF NOT EXISTS idx_service_taxonomy_active ON service_taxonomy(active);

-- Comentários
COMMENT ON TABLE service_taxonomy IS 'Taxonomia unificada de serviços baseada em service_requests históricos';
COMMENT ON COLUMN service_taxonomy.num_historical_requests IS 'Número de pedidos históricos com esta combinação categoria+serviço';
`

  const sqlPath = path.join(__dirname, '..', 'data', 'service-taxonomy.sql')
  fs.writeFileSync(sqlPath, sqlContent, 'utf-8')

  console.log(`🗄️  SQL guardado em: ${sqlPath}\n`)
}

extractServiceTaxonomy()
  .then(() => {
    console.log('✅ Extração concluída!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
