import { createAdminClient } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

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

// Convert Excel serial date to JS Date
function excelDateToJSDate(serial: number | null | undefined | string | boolean): Date | null {
  // Guard against null, undefined, 0, empty string, or non-numeric values
  if (serial === null || serial === undefined || serial === 0 || serial === '') return null

  // Ensure we have a valid number
  const numValue = typeof serial === 'number' ? serial : parseFloat(String(serial))
  if (isNaN(numValue) || !isFinite(numValue)) return null

  // Excel serial dates are typically > 1 (days since 1900-01-01)
  // Reject values that don't look like valid Excel dates
  if (numValue < 1 || numValue > 2958465) return null // 2958465 is 9999-12-31 in Excel

  const utc_days = Math.floor(numValue - 25569)
  const utc_value = utc_days * 86400
  const date_info = new Date(utc_value * 1000)

  // Final validation - ensure the date is valid
  if (isNaN(date_info.getTime())) return null

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
  return phone.replace(/^'+|'+$/g, '').trim() || null
}

// Map backoffice status to CRM status
function mapBackofficeStatus(backofficeStatus: string): 'novo' | 'em_onboarding' | 'ativo' | 'suspenso' | 'abandonado' | 'arquivado' {
  switch (backofficeStatus?.toLowerCase()) {
    case 'ativo':
      return 'ativo'
    case 'inativo':
      return 'suspenso'
    case 'arquivado':
      return 'arquivado'
    default:
      return 'novo'
  }
}

// Main import function
export async function importProvidersFromExcel(excelPath?: string): Promise<ImportResult> {
  const DATA_PATH = path.join(process.cwd(), 'data')
  const PROVIDERS_OUTPUT_PATH = path.join(DATA_PATH, 'providers-outputs')
  const LOG_FILE = path.join(DATA_PATH, `providers-import_${new Date().toISOString().split('T')[0]}.log`)

  // Logger
  function log(message: string, isError = false): void {
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
    } catch {
      // Ignore log errors
    }
  }

  // Find latest Excel file
  function findLatestExcel(): string | null {
    if (!fs.existsSync(PROVIDERS_OUTPUT_PATH)) return null

    const files = fs.readdirSync(PROVIDERS_OUTPUT_PATH)
      .filter((f: string) => f.endsWith('.xlsx') && !f.startsWith('~'))
      .map((f: string) => ({
        name: f,
        path: path.join(PROVIDERS_OUTPUT_PATH, f),
        mtime: fs.statSync(path.join(PROVIDERS_OUTPUT_PATH, f)).mtime
      }))
      .sort((a: { mtime: Date }, b: { mtime: Date }) => b.mtime.getTime() - a.mtime.getTime())

    return files.length > 0 ? files[0].path : null
  }

  const result: ImportResult = {
    success: false,
    totalProcessed: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    errorMessages: []
  }

  const supabase = createAdminClient()

  try {
    // Find Excel file
    const filePath = excelPath || findLatestExcel()
    if (!filePath) {
      throw new Error('Nenhum ficheiro Excel encontrado em ' + PROVIDERS_OUTPUT_PATH)
    }

    log(`A processar ficheiro: ${filePath}`)

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Ficheiro nao encontrado: ${filePath}`)
    }

    const fileStats = fs.statSync(filePath)
    log(`Ficheiro encontrado: ${(fileStats.size / 1024).toFixed(2)} KB`)

    // Read Excel - use buffer for more reliable reading
    const fileBuffer = fs.readFileSync(filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<BackofficeProvider>(sheet)

    log(`Total de providers no ficheiro: ${data.length}`)

    // Transform all records first (like pedidos sync does)
    const transformedRecords = data
      .filter(row => {
        // Skip test/invalid entries
        if (!row.NAME || row.NAME.toLowerCase().includes('teste') || !row.EMAIL) {
          log(`  Ignorando: ${row.NAME || 'sem nome'} (teste ou sem email)`)
          return false
        }
        return true
      })
      .map(row => ({
        // Backoffice ID (used for upsert conflict resolution)
        backoffice_provider_id: row.USER_ID,

        // Basic info
        name: row.NAME,
        email: row.EMAIL,
        phone: cleanPhone(row.PHONE),
        nif: row.VAT || null,

        // Default fields for new providers
        entity_type: 'empresa' as const,
        status: mapBackofficeStatus(row.PROVIDER_STATUS),

        // Backoffice status fields
        backoffice_password_defined: row.PASSWORD_DEFINED === true,
        backoffice_last_login: excelDateToJSDate(row.LAST_LOGIN)?.toISOString() || null,
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
      }))

    result.totalProcessed = data.length
    log(`Registos validos para upsert: ${transformedRecords.length}`)

    // Count existing providers to calculate inserts vs updates
    const backofficeIds = transformedRecords.map(r => r.backoffice_provider_id)
    const { data: existingProviders } = await supabase
      .from('providers')
      .select('backoffice_provider_id')
      .in('backoffice_provider_id', backofficeIds)

    const existingCount = existingProviders?.length || 0
    log(`Providers existentes: ${existingCount}`)

    // Batch upsert (like pedidos sync)
    const { error: upsertError } = await supabase
      .from('providers')
      .upsert(transformedRecords, {
        onConflict: 'backoffice_provider_id',
        ignoreDuplicates: false,
      })

    if (upsertError) {
      log(`Erro no upsert: ${upsertError.message}`, true)
      result.errors = transformedRecords.length
      result.errorMessages.push(upsertError.message)
    } else {
      // Calculate based on how many existed before
      result.updated = existingCount
      result.inserted = transformedRecords.length - existingCount
      log(`Upsert concluido: ${result.inserted} inseridos, ${result.updated} atualizados`)
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
