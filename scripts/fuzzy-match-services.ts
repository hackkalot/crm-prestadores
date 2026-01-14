/**
 * Script para fazer fuzzy matching entre serviços dos prestadores e service_taxonomy
 * Gera sugestões de mapeamento baseadas em similaridade de strings
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import * as fuzz from 'fuzzball'

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TaxonomyService {
  id: string
  category: string
  service: string
}

interface ProviderService {
  service: string
  provider_count: number
}

interface Match {
  providerService: string
  taxonomyService: string
  taxonomyCategory: string
  taxonomyId: string
  score: number
  matchType: 'exact' | 'high' | 'medium' | 'low' | 'none'
}

// Thresholds para classificar matches
const EXACT_THRESHOLD = 100
const HIGH_THRESHOLD = 85
const MEDIUM_THRESHOLD = 70
const LOW_THRESHOLD = 60

async function fuzzyMatchServices() {
  console.log('🔍 Iniciando fuzzy matching entre serviços...\n')

  // 1. Obter service_taxonomy
  const { data: taxonomyData, error: taxonomyError } = await supabase
    .from('service_taxonomy')
    .select('id, category, service')
    .eq('active', true)

  if (taxonomyError || !taxonomyData) {
    console.error('❌ Erro ao obter service_taxonomy:', taxonomyError)
    process.exit(1)
  }

  console.log(`✅ Carregados ${taxonomyData.length} serviços da taxonomia\n`)

  // 2. Obter serviços dos prestadores
  const { data: providers, error: providersError } = await supabase
    .from('providers')
    .select('services, status')
    .eq('status', 'ativo')

  if (providersError || !providers) {
    console.error('❌ Erro ao obter providers:', providersError)
    process.exit(1)
  }

  // Processar serviços dos prestadores
  const providerServicesMap = new Map<string, number>()

  providers.forEach((provider) => {
    if (!provider.services) return

    let serviceList: string[] = []
    if (typeof provider.services === 'string') {
      serviceList = provider.services.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0)
    } else if (Array.isArray(provider.services)) {
      serviceList = provider.services
    }

    serviceList.forEach(service => {
      const count = providerServicesMap.get(service) || 0
      providerServicesMap.set(service, count + 1)
    })
  })

  const providerServices: ProviderService[] = Array.from(providerServicesMap.entries())
    .map(([service, count]) => ({ service, provider_count: count }))
    .sort((a, b) => b.provider_count - a.provider_count)

  console.log(`✅ Processados ${providerServices.length} serviços únicos dos prestadores\n`)

  // 3. Fazer fuzzy matching
  console.log('🔄 Calculando similaridade entre serviços...\n')

  const matches: Match[] = []

  providerServices.forEach((providerService, index) => {
    if ((index + 1) % 10 === 0) {
      process.stdout.write(`   Processando ${index + 1}/${providerServices.length}...\r`)
    }

    // Encontrar melhor match usando fuzzball
    let bestMatch: Match = {
      providerService: providerService.service,
      taxonomyService: '',
      taxonomyCategory: '',
      taxonomyId: '',
      score: 0,
      matchType: 'none'
    }

    taxonomyData.forEach((taxonomy) => {
      // Calcular score usando token_set_ratio (melhor para strings com palavras em ordens diferentes)
      const score = fuzz.token_set_ratio(
        providerService.service.toLowerCase(),
        taxonomy.service.toLowerCase()
      )

      if (score > bestMatch.score) {
        bestMatch = {
          providerService: providerService.service,
          taxonomyService: taxonomy.service,
          taxonomyCategory: taxonomy.category,
          taxonomyId: taxonomy.id,
          score,
          matchType: getMatchType(score)
        }
      }
    })

    matches.push(bestMatch)
  })

  console.log(`\n✅ Fuzzy matching concluído!\n`)

  // 4. Estatísticas
  const exactMatches = matches.filter(m => m.matchType === 'exact')
  const highMatches = matches.filter(m => m.matchType === 'high')
  const mediumMatches = matches.filter(m => m.matchType === 'medium')
  const lowMatches = matches.filter(m => m.matchType === 'low')
  const noMatches = matches.filter(m => m.matchType === 'none')

  console.log(`📊 Estatísticas de Matching:\n`)
  console.log(`   🟢 Exact (${EXACT_THRESHOLD}%):     ${exactMatches.length} matches`)
  console.log(`   🟢 High (${HIGH_THRESHOLD}-99%):    ${highMatches.length} matches`)
  console.log(`   🟡 Medium (${MEDIUM_THRESHOLD}-${HIGH_THRESHOLD - 1}%): ${mediumMatches.length} matches`)
  console.log(`   🟠 Low (${LOW_THRESHOLD}-${MEDIUM_THRESHOLD - 1}%):    ${lowMatches.length} matches`)
  console.log(`   🔴 None (<${LOW_THRESHOLD}%):      ${noMatches.length} matches`)
  console.log(`   ───────────────────────`)
  console.log(`   📦 Total:           ${matches.length} serviços\n`)

  // 5. Mostrar exemplos
  console.log(`🔝 Top 10 Exact Matches:\n`)
  exactMatches.slice(0, 10).forEach((m, i) => {
    console.log(`   ${i + 1}. "${m.providerService}" → "${m.taxonomyService}" (${m.taxonomyCategory})`)
  })

  if (highMatches.length > 0) {
    console.log(`\n🔝 Top 10 High Confidence Matches:\n`)
    highMatches.slice(0, 10).forEach((m, i) => {
      console.log(`   ${i + 1}. "${m.providerService}" → "${m.taxonomyService}" (${m.score}%)`)
    })
  }

  if (mediumMatches.length > 0) {
    console.log(`\n⚠️  Top 10 Medium Confidence Matches (requerer validação):\n`)
    mediumMatches.slice(0, 10).forEach((m, i) => {
      console.log(`   ${i + 1}. "${m.providerService}" → "${m.taxonomyService}" (${m.score}%)`)
    })
  }

  if (noMatches.length > 0) {
    console.log(`\n❌ Serviços sem match (<${LOW_THRESHOLD}%):\n`)
    noMatches.slice(0, 10).forEach((m, i) => {
      console.log(`   ${i + 1}. "${m.providerService}" (melhor: ${m.score}%)`)
    })
  }

  // 6. Gerar CSV com todos os matches
  const csvRows = [
    'servico_prestador,servico_taxonomia,categoria_taxonomia,taxonomy_id,score,match_type',
    ...matches.map(m =>
      `"${m.providerService}","${m.taxonomyService}","${m.taxonomyCategory}","${m.taxonomyId}",${m.score},${m.matchType}`
    )
  ]

  const csvContent = csvRows.join('\n')
  const csvPath = path.join(__dirname, '..', 'data', 'service-matches.csv')
  fs.writeFileSync(csvPath, csvContent, 'utf-8')

  console.log(`\n💾 CSV de matches guardado em: ${csvPath}`)

  // 7. Gerar SQL para inserir matches automáticos (exact + high)
  const autoMatches = [...exactMatches, ...highMatches]

  if (autoMatches.length > 0) {
    const sqlRows = autoMatches.map((m, i) => {
      const providerServiceEscaped = m.providerService.replace(/'/g, "''")
      const taxonomyIdEscaped = m.taxonomyId
      return `  ('${providerServiceEscaped}', '${taxonomyIdEscaped}', ${m.score}, '${m.matchType}')${i === autoMatches.length - 1 ? ';' : ','}`
    })

    const sqlContent = `-- Service Mapping gerado automaticamente via fuzzy matching
-- ${autoMatches.length} matches automáticos (exact + high confidence >= ${HIGH_THRESHOLD}%)
-- Gerado em ${new Date().toISOString()}

-- Criar tabela de mapeamento (se não existir)
CREATE TABLE IF NOT EXISTS service_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_service_name TEXT NOT NULL,
  taxonomy_service_id UUID NOT NULL REFERENCES service_taxonomy(id),
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  match_type TEXT CHECK (match_type IN ('exact', 'high', 'medium', 'low', 'manual')),
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider_service_name, taxonomy_service_id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_service_mapping_provider_service ON service_mapping(provider_service_name);
CREATE INDEX IF NOT EXISTS idx_service_mapping_taxonomy_service ON service_mapping(taxonomy_service_id);
CREATE INDEX IF NOT EXISTS idx_service_mapping_verified ON service_mapping(verified);

-- Inserir matches automáticos
INSERT INTO service_mapping (provider_service_name, taxonomy_service_id, confidence_score, match_type)
VALUES
${sqlRows.join('\n')}
ON CONFLICT (provider_service_name, taxonomy_service_id)
DO UPDATE SET
  confidence_score = EXCLUDED.confidence_score,
  match_type = EXCLUDED.match_type,
  updated_at = NOW();

-- Comentários
COMMENT ON TABLE service_mapping IS 'Mapeamento entre serviços dos prestadores e taxonomia unificada';
COMMENT ON COLUMN service_mapping.provider_service_name IS 'Nome do serviço como aparece nos prestadores';
COMMENT ON COLUMN service_mapping.taxonomy_service_id IS 'Referência para service_taxonomy';
COMMENT ON COLUMN service_mapping.confidence_score IS 'Score de confiança do match (0-100)';
COMMENT ON COLUMN service_mapping.match_type IS 'Tipo de match: exact, high, medium, low, manual';
COMMENT ON COLUMN service_mapping.verified IS 'Se o mapeamento foi verificado por um utilizador';
`

    const sqlPath = path.join(__dirname, '..', 'data', 'service-mapping-auto.sql')
    fs.writeFileSync(sqlPath, sqlContent, 'utf-8')

    console.log(`📝 SQL de mapeamento automático guardado em: ${sqlPath}`)
    console.log(`   (${autoMatches.length} matches prontos para inserir)\n`)
  }

  // 8. Gerar relatório markdown
  const mdContent = `# Relatório de Fuzzy Matching - Serviços

**Data:** ${new Date().toISOString()}

## Estatísticas

| Tipo | Threshold | Quantidade |
|------|-----------|------------|
| 🟢 Exact | ${EXACT_THRESHOLD}% | ${exactMatches.length} |
| 🟢 High | ${HIGH_THRESHOLD}-99% | ${highMatches.length} |
| 🟡 Medium | ${MEDIUM_THRESHOLD}-${HIGH_THRESHOLD - 1}% | ${mediumMatches.length} |
| 🟠 Low | ${LOW_THRESHOLD}-${MEDIUM_THRESHOLD - 1}% | ${lowMatches.length} |
| 🔴 None | <${LOW_THRESHOLD}% | ${noMatches.length} |
| **Total** | | **${matches.length}** |

## Matches Automáticos (${autoMatches.length})

Estes matches têm confiança alta (≥${HIGH_THRESHOLD}%) e podem ser inseridos automaticamente:

| Serviço Prestador | → | Serviço Taxonomia | Categoria | Score |
|-------------------|---|-------------------|-----------|-------|
${autoMatches.slice(0, 50).map(m =>
  `| ${m.providerService} | → | ${m.taxonomyService} | ${m.taxonomyCategory} | ${m.score}% |`
).join('\n')}

${autoMatches.length > 50 ? `\n*... e mais ${autoMatches.length - 50} matches*\n` : ''}

## Matches para Revisão (${mediumMatches.length + lowMatches.length})

Estes matches requerem validação manual:

| Serviço Prestador | → | Melhor Match | Score | Ação Sugerida |
|-------------------|---|--------------|-------|---------------|
${[...mediumMatches, ...lowMatches].slice(0, 30).map(m =>
  `| ${m.providerService} | → | ${m.taxonomyService} | ${m.score}% | ${m.matchType === 'medium' ? '⚠️ Validar' : '❌ Criar novo?'} |`
).join('\n')}

${(mediumMatches.length + lowMatches.length) > 30 ? `\n*... e mais ${(mediumMatches.length + lowMatches.length) - 30} matches*\n` : ''}

## Próximos Passos

1. ✅ Inserir matches automáticos (exact + high) usando \`service-mapping-auto.sql\`
2. ⚠️ Revisar matches medium/low manualmente
3. ❌ Criar novos serviços na taxonomia para matches sem correspondência
4. 🔄 Re-executar script após ajustes
`

  const mdPath = path.join(__dirname, '..', 'data', 'service-matches-report.md')
  fs.writeFileSync(mdPath, mdContent, 'utf-8')

  console.log(`📄 Relatório markdown guardado em: ${mdPath}\n`)
}

function getMatchType(score: number): 'exact' | 'high' | 'medium' | 'low' | 'none' {
  if (score >= EXACT_THRESHOLD) return 'exact'
  if (score >= HIGH_THRESHOLD) return 'high'
  if (score >= MEDIUM_THRESHOLD) return 'medium'
  if (score >= LOW_THRESHOLD) return 'low'
  return 'none'
}

fuzzyMatchServices()
  .then(() => {
    console.log('✅ Fuzzy matching concluído com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
