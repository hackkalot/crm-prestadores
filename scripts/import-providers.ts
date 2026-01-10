import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Paths
const DATA_PATH = path.resolve(__dirname, '../data')
const PROVIDERS_OUTPUT_PATH = path.join(DATA_PATH, 'providers-outputs')
const LOG_FILE = path.join(DATA_PATH, `providers-import_${new Date().toISOString().split('T')[0]}.log`)

// Types
interface BackofficeProvider {
  USER_ID: number
  NAME: string
  EMAIL: string
  PHONE: string
  VAT: string
  PASSWORD_DEFINED: boolean
  LAST_LOGIN: number | null
  CATEGORIES: string
  SERVICES: string
  COUNTIES: string
  DISTRICTS: string
  TOTAL_REQUESTS: number
  ACTIVE_REQUESTS: number
  CANCELLED_REQUESTS: number
  COMPLETED_REQUESTS: number
  REQUESTS_RECEIVED: number
  REQUESTS_ACCEPTED: number
  'RESQUESTS_ EXPIRED': number  // Note: typo in backoffice export
  REQUESTS_REJECTED: number
  SERVICE_RATING: number
  TECHNICIAN_RATING: number
  CREATED_AT: number
  CREATED_BY: number
  LAST_UPDATE: number
  UPDATED_BY: number
  'IS_ACTIVE?': boolean
  STATUS_UPDATED_AT: number
  STATUS_UPDATED_BY: number
  PROVIDER_STATUS: string
  DO_RECURRENCE: boolean
}

export interface ImportResult {
  success: boolean
  totalProcessed: number
  inserted: number
  updated: number
  errors: number
  errorMessages: string[]
}

// Logger
function log(message: string, isError = false) {
  const timestamp = new Date().toLocaleTimeString()
  const formattedMessage = `[${timestamp}] ${message}`

  if (isError) {
    console.error(`X ${formattedMessage}`)
  } else {
    console.log(`> ${formattedMessage}`)
  }

  try {
    if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH, { recursive: true })
    fs.appendFileSync(LOG_FILE, formattedMessage + '\n')
  } catch (e) {
    // Ignore log errors
  }
}

// Convert Excel serial date to JS Date
function excelDateToJSDate(serial: number): Date | null {
  if (!serial || serial === 0) return null
  // Excel dates start from 1900-01-01 (serial = 1)
  // But Excel incorrectly considers 1900 a leap year, so we adjust
  const utc_days = Math.floor(serial - 25569)
  const utc_value = utc_days * 86400
  const date_info = new Date(utc_value * 1000)
  return date_info
}

// Parse semicolon-separated string to array
function parseToArray(value: string | null | undefined): string[] {
  if (!value || typeof value !== 'string') return []
  return value.split(';').map(s => s.trim()).filter(Boolean)
}

// Clean phone number
function cleanPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  // Remove quotes and clean
  return phone.replace(/^'+|'+$/g, '').trim() || null
}

// Main import function
export async function importProvidersFromExcel(excelPath?: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalProcessed: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    errorMessages: []
  }

  try {
    // Find Excel file
    const filePath = excelPath || findLatestExcel()
    if (!filePath) {
      throw new Error('Nenhum ficheiro Excel encontrado em ' + PROVIDERS_OUTPUT_PATH)
    }

    log(`A processar ficheiro: ${filePath}`)

    // Read Excel
    const workbook = XLSX.readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<BackofficeProvider>(sheet)

    log(`Total de providers no ficheiro: ${data.length}`)

    // Process each provider
    for (const row of data) {
      result.totalProcessed++

      try {
        // Skip test/invalid entries
        if (!row.NAME || row.NAME.toLowerCase().includes('teste') || !row.EMAIL) {
          log(`  Ignorando: ${row.NAME || 'sem nome'} (teste ou sem email)`)
          continue
        }

        // Check if provider exists by backoffice_provider_id
        const { data: existing } = await supabase
          .from('providers')
          .select('id, name')
          .eq('backoffice_provider_id', row.USER_ID)
          .single()

        const providerData = {
          // Backoffice ID
          backoffice_provider_id: row.USER_ID,

          // Basic info
          name: row.NAME,
          email: row.EMAIL,
          phone: cleanPhone(row.PHONE),
          nif: row.VAT || null,

          // Backoffice status fields
          backoffice_password_defined: row.PASSWORD_DEFINED === true,
          backoffice_last_login: excelDateToJSDate(row.LAST_LOGIN as number)?.toISOString() || null,
          backoffice_is_active: row['IS_ACTIVE?'] === true,
          backoffice_status: row.PROVIDER_STATUS || null,
          backoffice_status_updated_at: excelDateToJSDate(row.STATUS_UPDATED_AT)?.toISOString() || null,
          backoffice_status_updated_by: row.STATUS_UPDATED_BY || null,
          backoffice_do_recurrence: row.DO_RECURRENCE === true,

          // Coverage
          categories: parseToArray(row.CATEGORIES),
          services: parseToArray(row.SERVICES),
          counties: parseToArray(row.COUNTIES),
          districts: parseToArray(row.DISTRICTS),

          // Request statistics
          total_requests: row.TOTAL_REQUESTS || 0,
          active_requests: row.ACTIVE_REQUESTS || 0,
          cancelled_requests: row.CANCELLED_REQUESTS || 0,
          completed_requests: row.COMPLETED_REQUESTS || 0,
          requests_received: row.REQUESTS_RECEIVED || 0,
          requests_accepted: row.REQUESTS_ACCEPTED || 0,
          requests_expired: row['RESQUESTS_ EXPIRED'] || 0,
          requests_rejected: row.REQUESTS_REJECTED || 0,

          // Ratings
          service_rating: row.SERVICE_RATING || null,
          technician_rating: row.TECHNICIAN_RATING || null,

          // Backoffice audit
          backoffice_created_at: excelDateToJSDate(row.CREATED_AT)?.toISOString() || null,
          backoffice_created_by: row.CREATED_BY || null,
          backoffice_updated_at: excelDateToJSDate(row.LAST_UPDATE)?.toISOString() || null,
          backoffice_updated_by: row.UPDATED_BY || null,

          // Sync timestamp
          backoffice_synced_at: new Date().toISOString(),

          // Updated timestamp
          updated_at: new Date().toISOString()
        }

        if (existing) {
          // Update existing provider
          const { error } = await supabase
            .from('providers')
            .update(providerData)
            .eq('id', existing.id)

          if (error) throw error

          result.updated++
          log(`  Atualizado: ${row.NAME} (ID: ${existing.id})`)
        } else {
          // Check if exists by email (for linking existing CRM providers)
          const { data: existingByEmail } = await supabase
            .from('providers')
            .select('id, name')
            .eq('email', row.EMAIL)
            .single()

          if (existingByEmail) {
            // Link existing provider to backoffice
            const { error } = await supabase
              .from('providers')
              .update(providerData)
              .eq('id', existingByEmail.id)

            if (error) throw error

            result.updated++
            log(`  Associado por email: ${row.NAME} -> ${existingByEmail.name} (ID: ${existingByEmail.id})`)
          } else {
            // Insert new provider
            const { error } = await supabase
              .from('providers')
              .insert({
                ...providerData,
                entity_type: 'empresa', // Default type
                status: mapBackofficeStatus(row.PROVIDER_STATUS),
                created_at: excelDateToJSDate(row.CREATED_AT)?.toISOString() || new Date().toISOString()
              })

            if (error) throw error

            result.inserted++
            log(`  Inserido: ${row.NAME}`)
          }
        }
      } catch (err) {
        result.errors++
        const errMsg = `Erro ao processar ${row.NAME}: ${err}`
        result.errorMessages.push(errMsg)
        log(errMsg, true)
      }
    }

    result.success = result.errors === 0

    log('===============================================')
    log('IMPORT CONCLUIDO')
    log(`Total processados: ${result.totalProcessed}`)
    log(`Inseridos: ${result.inserted}`)
    log(`Atualizados: ${result.updated}`)
    log(`Erros: ${result.errors}`)
    log('===============================================')

    return result

  } catch (err) {
    const errMsg = `Erro fatal: ${err}`
    result.errorMessages.push(errMsg)
    log(errMsg, true)
    return result
  }
}

// Map backoffice status to CRM status
function mapBackofficeStatus(backofficeStatus: string): 'novo' | 'em_onboarding' | 'ativo' | 'suspenso' | 'abandonado' {
  switch (backofficeStatus?.toLowerCase()) {
    case 'ativo':
      return 'ativo'
    case 'inativo':
      return 'suspenso'
    case 'arquivado':
      return 'abandonado'
    default:
      return 'novo'
  }
}

// Find latest Excel file in providers-outputs
function findLatestExcel(): string | null {
  if (!fs.existsSync(PROVIDERS_OUTPUT_PATH)) return null

  const files = fs.readdirSync(PROVIDERS_OUTPUT_PATH)
    .filter(f => f.endsWith('.xlsx') && !f.startsWith('~'))
    .map(f => ({
      name: f,
      path: path.join(PROVIDERS_OUTPUT_PATH, f),
      mtime: fs.statSync(path.join(PROVIDERS_OUTPUT_PATH, f)).mtime
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

  return files.length > 0 ? files[0].path : null
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n IMPORT DE PROVIDERS DO BACKOFFICE\n')

  const excelPath = process.argv[2] // Optional: specific file path

  importProvidersFromExcel(excelPath).then(result => {
    if (result.success) {
      console.log('\nImport concluido com sucesso!')
      process.exit(0)
    } else {
      console.error('\nImport concluido com erros')
      process.exit(1)
    }
  })
}
