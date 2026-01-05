/**
 * Script para popular a base de dados com dados de teste
 * Executar com: npx tsx scripts/seed-dummy-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING')
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'OK' : 'MISSING')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Dados de referencia
const DISTRICTS = [
  'Lisboa', 'Porto', 'Braga', 'Aveiro', 'Coimbra', 'Setúbal',
  'Faro', 'Leiria', 'Santarém', 'Viseu', 'Viana do Castelo'
]

const SERVICES = [
  'Instalação Fibra', 'Instalação IPTV', 'Reparação Router',
  'Mudança de Equipamento', 'Ativação de Serviço', 'Suporte Técnico',
  'Instalação Empresarial', 'Configuração WiFi', 'Upgrade de Velocidade'
]

const FIRST_NAMES = [
  'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Sofia', 'Miguel', 'Inês',
  'António', 'Beatriz', 'Francisco', 'Margarida', 'Ricardo', 'Teresa', 'Rui'
]

const LAST_NAMES = [
  'Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues',
  'Martins', 'Jesus', 'Sousa', 'Fernandes', 'Gonçalves', 'Gomes', 'Lopes'
]

const COMPANY_SUFFIXES = ['Lda', 'SA', 'Unipessoal', '& Filhos', '& Associados']

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomElements<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function generateNIF(): string {
  const base = Math.floor(Math.random() * 900000000) + 100000000
  return base.toString()
}

function generatePhone(): string {
  const prefix = randomElement(['91', '92', '93', '96'])
  const number = Math.floor(Math.random() * 9000000) + 1000000
  return `+351${prefix}${number}`
}

function generateIBAN(): string {
  const bank = Math.floor(Math.random() * 9000) + 1000
  const account = Math.floor(Math.random() * 90000000000) + 10000000000
  return `PT50${bank}0000${account}00`
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function generateProviderName(entityType: string): string {
  if (entityType === 'tecnico') {
    return `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`
  } else if (entityType === 'eni') {
    return `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)} ENI`
  } else {
    const name = `${randomElement(LAST_NAMES)} ${randomElement(COMPANY_SUFFIXES)}`
    return name
  }
}

async function main() {
  console.log('🌱 A iniciar seed de dados de teste...\n')

  // 1. Verificar/criar utilizador de teste
  console.log('1️⃣ A verificar utilizadores...')
  const { data: existingUsers } = await supabase
    .from('users')
    .select('id, name, email')
    .limit(5)

  let users = existingUsers || []

  if (users.length === 0) {
    console.log('   A criar utilizadores de teste...')
    const newUsers = [
      { name: 'Admin FIXO', email: 'admin@fixo.pt', password_hash: 'dummy', email_verified: true },
      { name: 'João Gestor', email: 'joao@fixo.pt', password_hash: 'dummy', email_verified: true },
      { name: 'Maria Operações', email: 'maria@fixo.pt', password_hash: 'dummy', email_verified: true },
    ]

    const { data: createdUsers, error } = await supabase
      .from('users')
      .insert(newUsers)
      .select()

    if (error) {
      console.error('   ❌ Erro ao criar utilizadores:', error.message)
    } else {
      users = createdUsers || []
      console.log(`   ✅ ${users.length} utilizadores criados`)
    }
  } else {
    console.log(`   ✅ ${users.length} utilizadores existentes encontrados`)
  }

  // 2. Verificar etapas
  console.log('\n2️⃣ A verificar etapas de onboarding...')
  const { data: stages } = await supabase
    .from('stage_definitions')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (!stages || stages.length === 0) {
    console.log('   ⚠️ Sem etapas definidas. A criar etapas padrão...')
    const defaultStages = [
      { stage_number: 'E1', name: 'Documentação', display_order: 1 },
      { stage_number: 'E2', name: 'Formação', display_order: 2 },
      { stage_number: 'E3', name: 'Contrato', display_order: 3 },
      { stage_number: 'E4', name: 'Ativação', display_order: 4 },
    ]

    const { data: createdStages, error } = await supabase
      .from('stage_definitions')
      .insert(defaultStages)
      .select()

    if (error) {
      console.error('   ❌ Erro ao criar etapas:', error.message)
      return
    }
    console.log(`   ✅ ${createdStages?.length} etapas criadas`)
  } else {
    console.log(`   ✅ ${stages.length} etapas existentes`)
  }

  // Recarregar etapas
  const { data: allStages } = await supabase
    .from('stage_definitions')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  // 3. Verificar definições de tarefas
  console.log('\n3️⃣ A verificar definições de tarefas...')
  const { data: taskDefs } = await supabase
    .from('task_definitions')
    .select('*')
    .eq('is_active', true)

  if (!taskDefs || taskDefs.length === 0) {
    console.log('   ⚠️ Sem definições de tarefas. A criar tarefas padrão...')

    const defaultTasks: Array<{
      stage_id: string
      task_number: number
      name: string
      description: string
      default_deadline_hours_normal: number
      default_deadline_hours_urgent: number
      display_order: number
    }> = []

    if (allStages) {
      allStages.forEach((stage, stageIndex) => {
        const tasksPerStage = [
          ['Recolher documentos', 'Validar NIF', 'Verificar seguro'],
          ['Agendar formação', 'Realizar formação', 'Avaliar competências'],
          ['Preparar contrato', 'Enviar para assinatura', 'Arquivar contrato'],
          ['Criar conta sistema', 'Atribuir zonas', 'Primeiro trabalho'],
        ]

        tasksPerStage[stageIndex]?.forEach((taskName, taskIndex) => {
          defaultTasks.push({
            stage_id: stage.id,
            task_number: (stageIndex + 1) * 10 + taskIndex + 1,
            name: taskName,
            description: `Tarefa: ${taskName}`,
            default_deadline_hours_normal: 48 + taskIndex * 24,
            default_deadline_hours_urgent: 24 + taskIndex * 12,
            display_order: (stageIndex + 1) * 10 + taskIndex + 1,
          })
        })
      })
    }

    if (defaultTasks.length > 0) {
      const { error } = await supabase.from('task_definitions').insert(defaultTasks)
      if (error) {
        console.error('   ❌ Erro ao criar tarefas:', error.message)
      } else {
        console.log(`   ✅ ${defaultTasks.length} definições de tarefas criadas`)
      }
    }
  } else {
    console.log(`   ✅ ${taskDefs.length} definições de tarefas existentes`)
  }

  // 4. Criar categorias de serviços e serviços
  console.log('\n4️⃣ A verificar categorias e serviços...')
  const { data: existingCategories } = await supabase
    .from('service_categories')
    .select('id')

  if (!existingCategories || existingCategories.length === 0) {
    console.log('   A criar categorias de serviços...')
    const categories = [
      { name: 'Instalações Residenciais', cluster: 'Residencial', vat_rate: 23 },
      { name: 'Instalações Empresariais', cluster: 'Empresarial', vat_rate: 23 },
      { name: 'Manutenção e Reparação', cluster: 'Suporte', vat_rate: 23 },
      { name: 'Upgrades e Migrações', cluster: 'Comercial', vat_rate: 23 },
    ]

    const { data: createdCategories, error: catError } = await supabase
      .from('service_categories')
      .insert(categories)
      .select()

    if (catError) {
      console.error('   ❌ Erro ao criar categorias:', catError.message)
    } else if (createdCategories) {
      console.log(`   ✅ ${createdCategories.length} categorias criadas`)

      // Criar serviços
      const services = [
        // Residencial
        { category_id: createdCategories[0].id, name: 'Instalação Fibra 100Mbps', unit: 'un' },
        { category_id: createdCategories[0].id, name: 'Instalação Fibra 500Mbps', unit: 'un' },
        { category_id: createdCategories[0].id, name: 'Instalação Fibra 1Gbps', unit: 'un' },
        { category_id: createdCategories[0].id, name: 'Instalação IPTV', unit: 'un' },
        { category_id: createdCategories[0].id, name: 'Instalação Box Adicional', unit: 'un' },
        // Empresarial
        { category_id: createdCategories[1].id, name: 'Instalação Empresarial Standard', unit: 'un' },
        { category_id: createdCategories[1].id, name: 'Instalação Empresarial Premium', unit: 'un' },
        { category_id: createdCategories[1].id, name: 'Configuração VPN', unit: 'un' },
        // Manutenção
        { category_id: createdCategories[2].id, name: 'Reparação Router', unit: 'un' },
        { category_id: createdCategories[2].id, name: 'Substituição ONT', unit: 'un' },
        { category_id: createdCategories[2].id, name: 'Diagnóstico de Linha', unit: 'hora' },
        // Upgrades
        { category_id: createdCategories[3].id, name: 'Upgrade de Velocidade', unit: 'un' },
        { category_id: createdCategories[3].id, name: 'Migração de Tecnologia', unit: 'un' },
      ]

      const { data: createdServices, error: servError } = await supabase
        .from('services')
        .insert(services)
        .select()

      if (servError) {
        console.error('   ❌ Erro ao criar serviços:', servError.message)
      } else if (createdServices) {
        console.log(`   ✅ ${createdServices.length} serviços criados`)

        // Criar preços de referência
        const refPrices = createdServices.map(s => ({
          service_id: s.id,
          price_without_vat: Math.round((20 + Math.random() * 80) * 100) / 100,
          valid_from: new Date().toISOString(),
        }))

        const { error: priceError } = await supabase
          .from('reference_prices')
          .insert(refPrices)

        if (priceError) {
          console.error('   ❌ Erro ao criar preços de referência:', priceError.message)
        } else {
          console.log(`   ✅ ${refPrices.length} preços de referência criados`)
        }
      }
    }
  } else {
    console.log(`   ✅ ${existingCategories.length} categorias existentes`)
  }

  // 5. Criar prestadores
  console.log('\n5️⃣ A criar prestadores de teste...')

  const entityTypes = ['tecnico', 'eni', 'empresa'] as const
  const statuses = ['novo', 'em_onboarding', 'ativo', 'suspenso', 'abandonado'] as const

  const providers: Array<{
    name: string
    entity_type: string
    nif: string
    email: string
    phone: string
    districts: string[]
    services: string[]
    num_technicians: number | null
    has_admin_team: boolean
    has_own_transport: boolean
    working_hours: string
    status: string
    application_count: number
    first_application_at: string
    onboarding_started_at: string | null
    activated_at: string | null
    relationship_owner_id: string | null
    iban: string | null
  }> = []

  // Criar 30 prestadores variados
  for (let i = 0; i < 30; i++) {
    const entityType = randomElement(entityTypes)
    const name = generateProviderName(entityType)
    const status = randomElement(statuses)
    const applicationDate = randomDate(new Date('2024-06-01'), new Date())

    let onboardingDate: Date | null = null
    let activatedDate: Date | null = null

    if (status === 'em_onboarding' || status === 'ativo' || status === 'suspenso') {
      onboardingDate = randomDate(applicationDate, new Date())
    }
    if (status === 'ativo' || status === 'suspenso') {
      activatedDate = onboardingDate ? randomDate(onboardingDate, new Date()) : null
    }

    providers.push({
      name,
      entity_type: entityType,
      nif: generateNIF(),
      email: `${name.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@email.com`,
      phone: generatePhone(),
      districts: randomElements(DISTRICTS, 1, 4),
      services: randomElements(SERVICES, 2, 5),
      num_technicians: entityType === 'empresa' ? Math.floor(Math.random() * 10) + 2 : (entityType === 'eni' ? Math.floor(Math.random() * 3) + 1 : 1),
      has_admin_team: entityType === 'empresa' ? Math.random() > 0.3 : false,
      has_own_transport: Math.random() > 0.3,
      working_hours: randomElement(['9h-18h', '8h-17h', '9h-19h', '8h-20h', 'Flexível']),
      status,
      application_count: Math.floor(Math.random() * 3) + 1,
      first_application_at: applicationDate.toISOString(),
      onboarding_started_at: onboardingDate?.toISOString() || null,
      activated_at: activatedDate?.toISOString() || null,
      relationship_owner_id: users.length > 0 ? randomElement(users).id : null,
      iban: status === 'ativo' ? generateIBAN() : null,
    })
  }

  const { data: createdProviders, error: provError } = await supabase
    .from('providers')
    .insert(providers)
    .select()

  if (provError) {
    console.error('   ❌ Erro ao criar prestadores:', provError.message)
    return
  }
  console.log(`   ✅ ${createdProviders?.length || 0} prestadores criados`)

  // 6. Criar cards de onboarding
  console.log('\n6️⃣ A criar cards de onboarding...')

  const providersInOnboarding = createdProviders?.filter(p => p.status === 'em_onboarding') || []

  if (providersInOnboarding.length > 0 && allStages && allStages.length > 0 && users.length > 0) {
    const cards = providersInOnboarding.map(provider => ({
      provider_id: provider.id,
      onboarding_type: Math.random() > 0.7 ? 'urgente' : 'normal',
      current_stage_id: randomElement(allStages).id,
      owner_id: randomElement(users).id,
      started_at: provider.onboarding_started_at || new Date().toISOString(),
    }))

    const { data: createdCards, error: cardError } = await supabase
      .from('onboarding_cards')
      .insert(cards)
      .select()

    if (cardError) {
      console.error('   ❌ Erro ao criar cards:', cardError.message)
    } else {
      console.log(`   ✅ ${createdCards?.length || 0} cards de onboarding criados`)

      // 7. Criar tarefas para cada card
      console.log('\n7️⃣ A criar tarefas de onboarding...')

      const { data: allTaskDefs } = await supabase
        .from('task_definitions')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (createdCards && allTaskDefs && allTaskDefs.length > 0) {
        const tasks: Array<{
          card_id: string
          task_definition_id: string
          status: string
          owner_id: string
          deadline_at: string
          started_at: string | null
          completed_at: string | null
        }> = []

        for (const card of createdCards) {
          const cardTaskDefs = allTaskDefs.filter(td => {
            const taskStageIndex = allStages?.findIndex(s => s.id === td.stage_id) || 0
            const currentStageIndex = allStages?.findIndex(s => s.id === card.current_stage_id) || 0
            return taskStageIndex <= currentStageIndex
          })

          for (const taskDef of cardTaskDefs) {
            const isUrgent = card.onboarding_type === 'urgente'
            const deadlineHours = isUrgent
              ? (taskDef.default_deadline_hours_urgent || 24)
              : (taskDef.default_deadline_hours_normal || 48)

            const startDate = new Date(card.started_at)
            const deadline = new Date(startDate.getTime() + deadlineHours * 60 * 60 * 1000)

            // Determinar status da tarefa
            const taskStageIndex = allStages?.findIndex(s => s.id === taskDef.stage_id) || 0
            const currentStageIndex = allStages?.findIndex(s => s.id === card.current_stage_id) || 0

            let status: string
            let completedAt: string | null = null
            let startedAt: string | null = null

            if (taskStageIndex < currentStageIndex) {
              status = 'concluida'
              completedAt = randomDate(startDate, new Date()).toISOString()
              startedAt = startDate.toISOString()
            } else if (taskStageIndex === currentStageIndex) {
              const rand = Math.random()
              if (rand < 0.3) {
                status = 'concluida'
                completedAt = randomDate(startDate, new Date()).toISOString()
                startedAt = startDate.toISOString()
              } else if (rand < 0.6) {
                status = 'em_curso'
                startedAt = randomDate(startDate, new Date()).toISOString()
              } else {
                status = 'por_fazer'
              }
            } else {
              status = 'por_fazer'
            }

            tasks.push({
              card_id: card.id,
              task_definition_id: taskDef.id,
              status,
              owner_id: taskDef.default_owner_id || randomElement(users).id,
              deadline_at: deadline.toISOString(),
              started_at: startedAt,
              completed_at: completedAt,
            })
          }
        }

        if (tasks.length > 0) {
          const { error: taskError } = await supabase
            .from('onboarding_tasks')
            .insert(tasks)

          if (taskError) {
            console.error('   ❌ Erro ao criar tarefas:', taskError.message)
          } else {
            console.log(`   ✅ ${tasks.length} tarefas criadas`)
          }
        }
      }
    }
  } else {
    console.log('   ⚠️ Sem prestadores em onboarding para criar cards')
  }

  // 8. Criar algumas notas
  console.log('\n8️⃣ A criar notas de teste...')

  const activeProviders = createdProviders?.filter(p => ['ativo', 'em_onboarding'].includes(p.status)) || []

  if (activeProviders.length > 0 && users.length > 0) {
    const noteTypes = ['operacional', 'comercial', 'qualidade']
    const noteContents = [
      'Prestador muito cooperativo e profissional.',
      'Necessita de formação adicional em IPTV.',
      'Excelente feedback dos clientes.',
      'Dificuldades com horários ao fim de semana.',
      'Equipamento em bom estado.',
      'Contactar para proposta comercial.',
      'Aguarda resposta sobre nova zona.',
      'Reunião agendada para próxima semana.',
    ]

    const notes = activeProviders.slice(0, 10).map(provider => ({
      provider_id: provider.id,
      content: randomElement(noteContents),
      note_type: randomElement(noteTypes),
      created_by: randomElement(users).id,
    }))

    const { error: noteError } = await supabase.from('notes').insert(notes)

    if (noteError) {
      console.error('   ❌ Erro ao criar notas:', noteError.message)
    } else {
      console.log(`   ✅ ${notes.length} notas criadas`)
    }
  }

  // 9. Criar preços para prestadores ativos
  console.log('\n9️⃣ A criar preços de prestadores...')

  const { data: allServices } = await supabase
    .from('services')
    .select('id')
    .eq('is_active', true)

  const activePrestadores = createdProviders?.filter(p => p.status === 'ativo') || []

  if (activePrestadores.length > 0 && allServices && allServices.length > 0) {
    const providerPrices: Array<{
      provider_id: string
      service_id: string
      price_without_vat: number
      valid_from: string
    }> = []

    for (const provider of activePrestadores) {
      // Cada prestador tem preços para alguns serviços
      const servicesForProvider = randomElements(allServices, 3, allServices.length)

      for (const service of servicesForProvider) {
        // Preço com variação de +/- 30% do preço base
        const basePrice = 30 + Math.random() * 70
        const variation = (Math.random() - 0.5) * 0.6 // -30% a +30%
        const finalPrice = Math.round(basePrice * (1 + variation) * 100) / 100

        providerPrices.push({
          provider_id: provider.id,
          service_id: service.id,
          price_without_vat: finalPrice,
          valid_from: new Date().toISOString(),
        })
      }
    }

    if (providerPrices.length > 0) {
      const { error: priceError } = await supabase
        .from('provider_prices')
        .insert(providerPrices)

      if (priceError) {
        console.error('   ❌ Erro ao criar preços de prestadores:', priceError.message)
      } else {
        console.log(`   ✅ ${providerPrices.length} preços de prestadores criados`)
      }
    }
  }

  // 10. Criar histórico
  console.log('\n🔟 A criar histórico...')

  if (createdProviders && createdProviders.length > 0 && users.length > 0) {
    const historyEntries = createdProviders.slice(0, 15).map(provider => ({
      provider_id: provider.id,
      event_type: randomElement(['status_change', 'owner_change', 'note_added']),
      description: `Evento de teste para ${provider.name}`,
      created_by: randomElement(users).id,
    }))

    const { error: histError } = await supabase.from('history_log').insert(historyEntries)

    if (histError) {
      console.error('   ❌ Erro ao criar histórico:', histError.message)
    } else {
      console.log(`   ✅ ${historyEntries.length} entradas de histórico criadas`)
    }
  }

  // 11. Criar configurações
  console.log('\n1️⃣1️⃣ A verificar configurações...')

  const { data: existingSettings } = await supabase
    .from('settings')
    .select('key')

  if (!existingSettings || existingSettings.length === 0) {
    const settings = [
      { key: 'alert_hours_before_deadline', value: 24, description: 'Horas antes do prazo para gerar alerta' },
      { key: 'stalled_task_days', value: 3, description: 'Dias sem alterações para considerar tarefa parada' },
      { key: 'price_deviation_threshold', value: 0.20, description: 'Threshold de desvio de preços (20%)' },
    ]

    const { error: settingsError } = await supabase.from('settings').insert(settings)

    if (settingsError) {
      console.error('   ❌ Erro ao criar configurações:', settingsError.message)
    } else {
      console.log(`   ✅ ${settings.length} configurações criadas`)
    }
  } else {
    console.log(`   ✅ ${existingSettings.length} configurações existentes`)
  }

  console.log('\n✅ Seed concluído com sucesso!')
  console.log('\n📊 Resumo:')
  console.log(`   - Prestadores: ${createdProviders?.length || 0}`)
  console.log(`   - Em candidatura (novo): ${createdProviders?.filter(p => p.status === 'novo').length || 0}`)
  console.log(`   - Em onboarding: ${createdProviders?.filter(p => p.status === 'em_onboarding').length || 0}`)
  console.log(`   - Ativos: ${createdProviders?.filter(p => p.status === 'ativo').length || 0}`)
  console.log(`   - Abandonados: ${createdProviders?.filter(p => p.status === 'abandonado').length || 0}`)
}

main().catch(console.error)
