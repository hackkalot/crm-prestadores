import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nyrnjltpyedfoommmbhs.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cm5qbHRweWVkZm9vbW1tYmhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYxOTc2MywiZXhwIjoyMDgzMTk1NzYzfQ.E4dKY1mKSbbvsqHYs2pQvGTBpCRyYOVpEVHz-BDphdY'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const testProviders = [
  {
    name: 'Joao Silva',
    entity_type: 'tecnico',
    email: 'joao.silva@exemplo.pt',
    phone: '912345678',
    districts: ['Lisboa', 'Setubal'],
    services: ['Canalizacao', 'Aquecimento'],
    status: 'novo',
    first_application_at: new Date().toISOString(),
  },
  {
    name: 'Maria Santos',
    entity_type: 'tecnico',
    email: 'maria.santos@exemplo.pt',
    phone: '923456789',
    districts: ['Porto', 'Braga'],
    services: ['Electricidade', 'Ar Condicionado'],
    status: 'novo',
    first_application_at: new Date().toISOString(),
  },
  {
    name: 'ServiCasa Lda',
    entity_type: 'empresa',
    email: 'geral@servicasa.pt',
    phone: '214567890',
    nif: '123456789',
    website: 'https://servicasa.pt',
    districts: ['Lisboa', 'Setubal', 'Santarem'],
    services: ['Canalizacao', 'Electricidade', 'Pintura'],
    num_technicians: 5,
    has_admin_team: true,
    has_own_transport: true,
    working_hours: '08:00-18:00',
    status: 'novo',
    first_application_at: new Date().toISOString(),
  },
  {
    name: 'Pedro Ferreira ENI',
    entity_type: 'eni',
    email: 'pedro.ferreira@exemplo.pt',
    phone: '934567890',
    nif: '234567890',
    districts: ['Coimbra', 'Aveiro'],
    services: ['Mudancas', 'Montagem de Moveis'],
    num_technicians: 2,
    has_admin_team: false,
    has_own_transport: true,
    working_hours: '09:00-19:00',
    status: 'novo',
    first_application_at: new Date().toISOString(),
  },
  {
    name: 'Ana Costa',
    entity_type: 'tecnico',
    email: 'ana.costa@exemplo.pt',
    phone: '945678901',
    districts: ['Faro', 'Beja'],
    services: ['Limpezas', 'Jardinagem'],
    status: 'em_onboarding',
    first_application_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    onboarding_started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    name: 'Rui Oliveira',
    entity_type: 'tecnico',
    email: 'rui.oliveira@exemplo.pt',
    phone: '956789012',
    districts: ['Viseu'],
    services: ['Serralharia'],
    status: 'abandonado',
    abandonment_party: 'prestador',
    abandonment_reason: 'Mudanca de area',
    abandoned_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    first_application_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

async function seedProviders() {
  console.log('A inserir prestadores de teste...\n')

  for (const provider of testProviders) {
    const { data, error } = await supabase
      .from('providers')
      .insert(provider)
      .select('id, name, email, status')
      .single()

    if (error) {
      console.error(`Erro ao inserir ${provider.name}:`, error.message)
    } else {
      console.log(`✓ ${data.name} (${data.email}) - ${data.status}`)

      // Criar historico de candidatura
      await supabase.from('application_history').insert({
        provider_id: data.id,
        raw_data: { name: provider.name, email: provider.email },
        source: 'seed',
        applied_at: provider.first_application_at,
      })
    }
  }

  console.log('\n✓ Prestadores de teste criados com sucesso!')
}

seedProviders().catch(console.error)
