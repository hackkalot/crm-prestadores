import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nyrnjltpyedfoommmbhs.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cm5qbHRweWVkZm9vbW1tYmhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYxOTc2MywiZXhwIjoyMDgzMTk1NzYzfQ.E4dKY1mKSbbvsqHYs2pQvGTBpCRyYOVpEVHz-BDphdY'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createTestOnboarding() {
  console.log('A criar card de onboarding de teste...\n')

  // 1. Obter um prestador em_onboarding
  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .select('id, name, email')
    .eq('status', 'em_onboarding')
    .limit(1)
    .single()

  if (providerError || !provider) {
    console.log('Nenhum prestador em onboarding encontrado.')
    console.log('A atualizar Ana Costa para em_onboarding...')

    // Obter Ana Costa
    const { data: ana } = await supabase
      .from('providers')
      .select('id, name')
      .eq('email', 'ana.costa@exemplo.pt')
      .single()

    if (!ana) {
      console.error('Ana Costa nao encontrada')
      return
    }

    var targetProvider = ana
  } else {
    var targetProvider = provider
  }

  console.log(`Prestador: ${targetProvider.name} (${targetProvider.id})`)

  // 2. Obter primeira etapa
  const { data: firstStage } = await supabase
    .from('stage_definitions')
    .select('id, name')
    .eq('stage_number', '1')
    .single()

  if (!firstStage) {
    console.error('Etapa 1 nao encontrada')
    return
  }

  console.log(`Etapa inicial: ${firstStage.name}`)

  // 3. Obter primeiro utilizador
  const { data: user } = await supabase
    .from('users')
    .select('id, name')
    .limit(1)
    .single()

  if (!user) {
    console.error('Nenhum utilizador encontrado')
    return
  }

  console.log(`Owner: ${user.name}`)

  // 4. Verificar se ja existe card
  const { data: existingCard } = await supabase
    .from('onboarding_cards')
    .select('id')
    .eq('provider_id', targetProvider.id)
    .single()

  if (existingCard) {
    console.log('\nCard ja existe:', existingCard.id)
    return
  }

  // 5. Criar card de onboarding
  const { data: card, error: cardError } = await supabase
    .from('onboarding_cards')
    .insert({
      provider_id: targetProvider.id,
      onboarding_type: 'normal',
      current_stage_id: firstStage.id,
      owner_id: user.id,
    })
    .select('id')
    .single()

  if (cardError) {
    console.error('Erro ao criar card:', cardError)
    return
  }

  console.log(`\nCard criado: ${card.id}`)

  // 6. Obter todas as tarefas
  const { data: taskDefs } = await supabase
    .from('task_definitions')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (!taskDefs || taskDefs.length === 0) {
    console.error('Nenhuma tarefa encontrada')
    return
  }

  console.log(`Tarefas encontradas: ${taskDefs.length}`)

  // 7. Criar instancias de tarefas
  const tasks = taskDefs.map((def, index) => {
    const deadlineHours = def.default_deadline_hours_normal || 24
    const deadlineAt = new Date(Date.now() + deadlineHours * 60 * 60 * 1000).toISOString()

    // Marcar algumas tarefas como concluidas para teste
    let status = 'por_fazer'
    if (index < 3) status = 'concluida'
    else if (index < 5) status = 'em_curso'

    return {
      card_id: card.id,
      task_definition_id: def.id,
      owner_id: def.default_owner_id || user.id,
      deadline_at: deadlineAt,
      original_deadline_at: deadlineAt,
      status,
      started_at: status !== 'por_fazer' ? new Date().toISOString() : null,
      completed_at: status === 'concluida' ? new Date().toISOString() : null,
      completed_by: status === 'concluida' ? user.id : null,
    }
  })

  const { error: tasksError } = await supabase
    .from('onboarding_tasks')
    .insert(tasks)

  if (tasksError) {
    console.error('Erro ao criar tarefas:', tasksError)
    return
  }

  console.log(`Tarefas criadas: ${tasks.length}`)
  console.log('\n✓ Card de onboarding criado com sucesso!')
}

createTestOnboarding().catch(console.error)
