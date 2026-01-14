/**
 * Script para popular service_mapping e service_mapping_suggestions
 * com base nos resultados do fuzzy matching
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Match {
  providerService: string
  taxonomyId: string
  score: number
  matchType: string
}

async function populateServiceMapping() {
  console.log('🔄 Populando service_mapping e service_mapping_suggestions...\n')

  // Ler CSV de matches
  const csvPath = path.join(__dirname, '..', 'data', 'service-matches.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').slice(1) // Skip header

  const matches: Match[] = lines
    .filter(line => line.trim().length > 0)
    .map(line => {
      const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || []
      return {
        providerService: parts[0]?.replace(/"/g, '').trim() || '',
        taxonomyId: parts[3]?.replace(/"/g, '').trim() || '',
        score: parseInt(parts[4]?.trim() || '0'),
        matchType: parts[5]?.replace(/"/g, '').trim() || ''
      }
    })
    .filter(m => m.providerService && m.taxonomyId)

  console.log(`📊 Total de matches: ${matches.length}\n`)

  // Separar matches automáticos (exact + high) de sugestões (medium + low + none)
  const autoMatches = matches.filter(m => m.score >= 85)
  const suggestions = matches.filter(m => m.score < 85)

  console.log(`   🟢 Matches automáticos (≥85%): ${autoMatches.length}`)
  console.log(`   🟡 Sugestões (review manual): ${suggestions.length}\n`)

  // 1. Inserir matches automáticos
  if (autoMatches.length > 0) {
    console.log('📝 Inserindo matches automáticos...')

    const { data, error } = await supabase
      .from('service_mapping')
      .upsert(
        autoMatches.map(m => ({
          provider_service_name: m.providerService,
          taxonomy_service_id: m.taxonomyId,
          confidence_score: m.score,
          match_type: m.matchType,
          verified: m.score === 100 // Auto-verify exact matches
        })),
        { onConflict: 'provider_service_name,taxonomy_service_id' }
      )

    if (error) {
      console.error('❌ Erro ao inserir matches:', error)
    } else {
      console.log(`✅ ${autoMatches.length} matches inseridos\n`)
    }
  }

  // 2. Inserir sugestões para review
  if (suggestions.length > 0) {
    console.log('📝 Inserindo sugestões para review...')

    // Agrupar por provider service e pegar top 3 sugestões
    const suggestionMap = new Map<string, Match[]>()

    suggestions.forEach(m => {
      if (!suggestionMap.has(m.providerService)) {
        suggestionMap.set(m.providerService, [])
      }
      suggestionMap.get(m.providerService)!.push(m)
    })

    const suggestionRecords = Array.from(suggestionMap.entries()).map(([providerService, matches]) => {
      const sorted = matches.sort((a, b) => b.score - a.score).slice(0, 3)

      return {
        provider_service_name: providerService,
        suggested_taxonomy_id_1: sorted[0]?.taxonomyId || null,
        suggested_score_1: sorted[0]?.score || null,
        suggested_taxonomy_id_2: sorted[1]?.taxonomyId || null,
        suggested_score_2: sorted[1]?.score || null,
        suggested_taxonomy_id_3: sorted[2]?.taxonomyId || null,
        suggested_score_3: sorted[2]?.score || null,
        status: 'pending'
      }
    })

    const { data, error } = await supabase
      .from('service_mapping_suggestions')
      .upsert(suggestionRecords, { onConflict: 'provider_service_name' })

    if (error) {
      console.error('❌ Erro ao inserir sugestões:', error)
    } else {
      console.log(`✅ ${suggestionRecords.length} sugestões inseridas\n`)
    }
  }

  // 3. Verificar resultados
  const { count: mappingCount } = await supabase
    .from('service_mapping')
    .select('*', { count: 'exact', head: true })

  const { count: suggestionsCount } = await supabase
    .from('service_mapping_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  console.log('📊 Resumo Final:\n')
  console.log(`   ✅ Mapeamentos confirmados: ${mappingCount}`)
  console.log(`   ⏳ Sugestões pendentes: ${suggestionsCount}`)
  console.log(`   🎯 Taxa de auto-match: ${((autoMatches.length / matches.length) * 100).toFixed(1)}%\n`)
}

populateServiceMapping()
  .then(() => {
    console.log('✅ População concluída com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
