/**
 * Script para extrair serviços oferecidos pelos prestadores
 * Para análise e mapeamento com service_taxonomy
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

interface ProviderService {
  service: string
  provider_count: number
  provider_ids: string[]
}

async function extractProviderServices() {
  console.log('🔍 Extraindo serviços oferecidos pelos prestadores...\n')

  // Obter todos os prestadores ativos
  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, name, services, status')
    .eq('status', 'ativo')

  if (error) {
    console.error('❌ Erro ao obter providers:', error)
    process.exit(1)
  }

  console.log(`📊 Total de prestadores ativos: ${providers.length}\n`)

  // Extrair e normalizar serviços
  const serviceMap = new Map<string, ProviderService>()

  providers.forEach((provider) => {
    if (!provider.services) return

    // Os serviços podem estar separados por vírgula, ponto-vírgula, ou em array
    let serviceList: string[] = []

    if (typeof provider.services === 'string') {
      // Split por vírgula ou ponto-vírgula
      serviceList = provider.services
        .split(/[,;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
    } else if (Array.isArray(provider.services)) {
      serviceList = provider.services
    }

    serviceList.forEach(service => {
      // Normalizar: lowercase para comparação
      const normalizedService = service.trim()

      if (normalizedService.length === 0) return

      if (serviceMap.has(normalizedService)) {
        const existing = serviceMap.get(normalizedService)!
        existing.provider_count++
        existing.provider_ids.push(provider.id)
      } else {
        serviceMap.set(normalizedService, {
          service: normalizedService,
          provider_count: 1,
          provider_ids: [provider.id]
        })
      }
    })
  })

  // Converter para array e ordenar por provider_count (desc)
  const services = Array.from(serviceMap.values()).sort((a, b) =>
    b.provider_count - a.provider_count
  )

  console.log(`✅ Encontrados ${services.length} serviços únicos oferecidos pelos prestadores\n`)

  // Top 20 serviços mais oferecidos
  console.log(`🔝 Top 20 serviços mais oferecidos:\n`)
  services.slice(0, 20).forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.service} (${s.provider_count} prestadores)`)
  })

  // Estatísticas
  const totalProviderServiceCombinations = services.reduce((sum, s) => sum + s.provider_count, 0)
  const avgServicesPerProvider = (totalProviderServiceCombinations / providers.length).toFixed(1)

  console.log(`\n📈 Estatísticas:`)
  console.log(`   - Serviços únicos: ${services.length}`)
  console.log(`   - Total de combinações prestador-serviço: ${totalProviderServiceCombinations}`)
  console.log(`   - Média de serviços por prestador: ${avgServicesPerProvider}`)

  // Gerar CSV
  const csvRows = [
    'servico,num_prestadores,provider_ids',
    ...services.map(s => `"${s.service}",${s.provider_count},"${s.provider_ids.join(',')}"`)
  ]
  const csvContent = csvRows.join('\n')

  const outputPath = path.join(__dirname, '..', 'data', 'provider-services.csv')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, csvContent, 'utf-8')

  console.log(`\n💾 CSV guardado em: ${outputPath}`)

  // Gerar Markdown
  const mdRows = [
    '| Serviço | Nº Prestadores |',
    '|---------|----------------|',
    ...services.map(s => `| ${s.service} | ${s.provider_count} |`)
  ]
  const mdContent = `# Serviços Oferecidos pelos Prestadores\n\n${mdRows.join('\n')}\n\n**Total:** ${services.length} serviços únicos\n`

  const mdPath = path.join(__dirname, '..', 'data', 'provider-services.md')
  fs.writeFileSync(mdPath, mdContent, 'utf-8')

  console.log(`📄 Markdown guardado em: ${mdPath}\n`)

  return services
}

extractProviderServices()
  .then(() => {
    console.log('✅ Extração concluída!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
