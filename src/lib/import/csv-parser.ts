/**
 * CSV Parser para imports de prestadores do HubSpot
 *
 * O formulário HubSpot tem campos condicionais baseados no tipo de entidade:
 * - Empresa: "Nome da Empresa*", "E-mail*", "NIF*"
 * - ENI: "Nome do ENI ou Empresa*", "E-mail do ENI*", "NIF do ENI*"
 * - Técnico: "Nome do Técnico*", "E-mail do Técnico*", (sem NIF)
 */

export interface RawCSVRow {
  // Escolha de tipo de entidade
  'Escolha a opção que mais se adequa a si*': string

  // Campos de Empresa
  'Nome da Empresa*'?: string
  'E-mail*'?: string
  'Contacto telefónico*'?: string
  'Introduza o site da Empresa e/ou links das redes sociais da Empresa (opcional)'?: string
  'Qual o NIF associado à sua actividade?*'?: string
  'Liste os serviços que realiza*'?: string
  'Indique em que distrito presta os seus serviços (Portugal Continental)*'?: string

  // Campos de ENI
  'Nome do ENI ou Empresa*'?: string
  'E-mail do ENI*'?: string
  'Contacto telefónico do ENI*'?: string

  // Campos de Técnico
  'Nome do Técnico*'?: string
  'E-mail do Técnico*'?: string
  'Contacto telefónico do Técnico*'?: string
  'Liste os serviços que está habituado a realizar*'?: string
  'Indique em que distrito presta os seus serviços (Portugal Continental)'?: string

  // Campos específicos de Empresa/ENI
  'Quantos técnicos constituem a sua equipa?'?: string
  'Tem equipa administrativa?*'?: string
  'Tem meios de transporte próprios para deslocação para a prestação de serviços?*'?: string
  'Qual o seu horário laboral?'?: string

  // Metadata
  'Conversion Date'?: string

  [key: string]: string | undefined
}

export interface ParsedProvider {
  // Obrigatórios
  name: string
  email: string
  entity_type: 'tecnico' | 'eni' | 'empresa'

  // Opcionais
  phone?: string
  nif?: string
  website?: string
  services?: string[]
  districts?: string[]
  num_technicians?: number
  has_admin_team?: boolean
  has_own_transport?: boolean
  working_hours?: string

  // Metadata
  first_application_at?: string

  // Para tracking
  raw_row_index?: number
}

export interface ParseResult {
  success: ParsedProvider[]
  errors: Array<{
    row: number
    error: string
    raw_data?: Partial<RawCSVRow>
  }>
}

/**
 * Mapeia o valor do tipo de entidade do HubSpot para o enum do sistema
 */
function mapEntityType(hubspotValue: string | undefined): 'tecnico' | 'eni' | 'empresa' | null {
  if (!hubspotValue) return null

  const normalized = hubspotValue.toLowerCase().trim()

  // Técnico Qualificado
  if (normalized.includes('técnico') || normalized.includes('tecnico')) {
    return 'tecnico'
  }

  // ENI (Empresário em Nome Individual)
  if (normalized.includes('eni') || normalized.includes('empresário em nome individual') || normalized.includes('empresario em nome individual')) {
    return 'eni'
  }

  // Empresa LDA / Empresa
  if (normalized.includes('empresa')) {
    return 'empresa'
  }

  return null
}

/**
 * Converte string de serviços separados por vírgula/ponto-e-vírgula em array
 */
function parseServices(servicesString?: string): string[] | undefined {
  if (!servicesString) return undefined

  return servicesString
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Converte string de distritos em array
 */
function parseDistricts(districtsString?: string): string[] | undefined {
  if (!districtsString) return undefined

  return districtsString
    .split(/[,;]/)
    .map(d => d.trim())
    .filter(d => d.length > 0)
}

/**
 * Converte resposta Sim/Não para boolean
 */
function parseBoolean(value?: string): boolean | undefined {
  if (!value) return undefined

  const normalized = value.toLowerCase().trim()
  if (normalized === 'sim') return true
  if (normalized === 'não' || normalized === 'nao') return false

  return undefined
}

/**
 * Parse de uma row do CSV para estrutura de provider
 */
export function parseProviderRow(row: RawCSVRow, rowIndex: number): ParsedProvider | { error: string } {
  // 1. Determinar tipo de entidade
  const entityTypeRaw = row['Escolha a opção que mais se adequa a si*']
  const entity_type = mapEntityType(entityTypeRaw)

  if (!entity_type) {
    return { error: `Tipo de entidade inválido: "${entityTypeRaw}"` }
  }

  // 2. Extrair campos usando abordagem universal (tenta todas as variações)
  // HubSpot exporta todas as colunas, mas só uma tem valor dependendo do tipo selecionado

  // Nome - tenta todas as variações
  const name = row['Nome da Empresa*'] ||
               row['Nome do ENI ou Empresa*'] ||
               row['Nome do Técnico*']

  // Email - tenta todas as variações
  const email = row['E-mail*'] ||
                row['E-mail do ENI*'] ||
                row['E-mail do Técnico*']

  // Telefone - tenta todas as variações
  const phone = row['Contacto telefónico*'] ||
                row['Contacto telefónico do ENI*'] ||
                row['Contacto telefónico do Técnico*']

  // NIF - campo comum para empresa/ENI (técnicos não têm)
  // HubSpot adiciona _1 para ENI
  const nif = row['Qual o NIF associado à sua actividade?*'] ||
              row['Qual o NIF associado à sua actividade?*_1']

  // Serviços - tenta todas as variações (empresa, ENI com _1, técnico)
  const services = parseServices(
    row['Liste os serviços que realiza*'] ||
    row['Liste os serviços que realiza*_1'] ||  // ENI version
    row['Liste os serviços que está habituado a realizar*']
  )

  // Distritos - tenta todas as variações (empresa, ENI com _1, técnico sem asterisco)
  const districts = parseDistricts(
    row['Indique em que distrito presta os seus serviços (Portugal Continental)*'] ||
    row['Indique em que distrito presta os seus serviços (Portugal Continental)*_1'] ||  // ENI version
    row['Indique em que distrito presta os seus serviços (Portugal Continental)']
  )

  // 3. Validar campos obrigatórios
  if (!name || !email) {
    return { error: `Campos obrigatórios em falta (nome: "${name}", email: "${email}")` }
  }

  // 4. Extrair campos opcionais (apenas para empresa/eni)
  // HubSpot adiciona _1 para ENI
  const website = row['Introduza o site da Empresa e/ou links das redes sociais da Empresa (opcional)'] ||
                  row['Introduza o site da Empresa e/ou links das redes sociais da Empresa (opcional)_1']
  const num_technicians = entity_type !== 'tecnico' && row['Quantos técnicos constituem a sua equipa?']
    ? parseInt(row['Quantos técnicos constituem a sua equipa?'])
    : undefined
  const has_admin_team = entity_type !== 'tecnico'
    ? parseBoolean(row['Tem equipa administrativa?*'])
    : undefined
  const has_own_transport = entity_type !== 'tecnico'
    ? parseBoolean(row['Tem meios de transporte próprios para deslocação para a prestação de serviços?*'])
    : undefined
  const working_hours = row['Qual o seu horário laboral?']

  // 5. Parse de data de conversão
  const first_application_at = row['Conversion Date']
    ? new Date(row['Conversion Date']).toISOString()
    : new Date().toISOString()

  // 6. Retornar provider parseado
  const provider: ParsedProvider = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    entity_type,
    phone: phone?.trim(),
    nif: nif?.trim(),
    website: website?.trim(),
    services,
    districts,
    num_technicians,
    has_admin_team,
    has_own_transport,
    working_hours: working_hours?.trim(),
    first_application_at,
    raw_row_index: rowIndex,
  }

  return provider
}

/**
 * Parse de múltiplas rows do CSV
 */
export function parseCSVRows(rows: RawCSVRow[]): ParseResult {
  const success: ParsedProvider[] = []
  const errors: ParseResult['errors'] = []

  rows.forEach((row, index) => {
    const result = parseProviderRow(row, index + 2) // +2 porque CSV tem header na linha 1

    if ('error' in result) {
      errors.push({
        row: index + 2,
        error: result.error,
        raw_data: row,
      })
    } else {
      success.push(result)
    }
  })

  return { success, errors }
}
