/**
 * Standalone script for GitHub Actions to sync recurrences data
 *
 * This script:
 * 1. Runs Puppeteer scrapper to download Excel from backoffice
 * 2. Parses Excel file
 * 3. Upserts recurrences data directly to Supabase
 *
 * Environment variables required:
 * - BACKOFFICE_USERNAME
 * - BACKOFFICE_PASSWORD
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - PUPPETEER_EXECUTABLE_PATH (set by workflow)
 */

import { runRecurrencesScrapper } from './export-recurrences-data'
import * as XLSX from 'xlsx'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:')
  if (!SUPABASE_URL) console.error('   - SUPABASE_URL')
  if (!SUPABASE_SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Types from backoffice export - matching the Excel columns exactly
interface BackofficeRecurrence {
  RECURRENCE_CODE: string
  RECURRENCE_TYPE: string
  RECURRENCE_STATUS: string
  SUBMISSION_DATE: string | number | null
  SERVICE: string
  USER_ID: string
  CLIENT_NAME: string
  ADRESS_TOWN: string  // Note: typo in original column name
  ADRESS_DISTRICT: string  // Note: typo in original column name
  ADDRESS_STREET: string
  SOURCE: string
  FLAG_EDIT_SCHEDULE: boolean | string | number
  FLAG_EDIT_PAYMENT: boolean | string | number
  INATIVATION_DATE: string | number | null
  INATIVATION_REASON: string
  INATIVATION_COMMENT: string
}

// Parse date string in various formats to ISO string
// Supports separators: - and /
// Formats: YYYY-MM-DD HH:mm:ss, DD-MM-YYYY HH:mm:ss, DD/MM/YYYY HH:mm:ss (and without seconds/time)
function parseDateString(value: string): string | null {
  // Normalize separators: replace / with - for uniform matching
  const normalized = value.replace(/\//g, '-')

  // Match YYYY-MM-DD HH:mm:ss or YYYY-MM-DD HH:mm or YYYY-MM-DD
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (isoMatch) {
    const [, year, month, day, hours, minutes, seconds] = isoMatch
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      hours ? parseInt(hours) : 0,
      minutes ? parseInt(minutes) : 0,
      seconds ? parseInt(seconds) : 0
    )
    if (!isNaN(date.getTime())) return date.toISOString()
  }

  // Match DD-MM-YYYY HH:mm:ss or DD-MM-YYYY HH:mm or DD-MM-YYYY
  const euMatch = normalized.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (euMatch) {
    const [, day, month, year, hours, minutes, seconds] = euMatch
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      hours ? parseInt(hours) : 0,
      minutes ? parseInt(minutes) : 0,
      seconds ? parseInt(seconds) : 0
    )
    if (!isNaN(date.getTime())) return date.toISOString()
  }

  return null
}

// Convert Excel serial date or date string to ISO string
function excelDateToISO(value: unknown): string | null {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === '') return null

  // If it's a string, try date string formats first
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const parsed = parseDateString(trimmed)
    if (parsed) return parsed
  }

  // Fall back to Excel serial number parsing
  const serial = typeof value === 'number' ? value : parseFloat(String(value))

  // Check if it's a valid number
  if (isNaN(serial) || !isFinite(serial)) return null
  if (serial < 36526 || serial > 73051) return null // Between 2000-01-01 and 2100

  try {
    const utc_days = Math.floor(serial - 25569)
    const utc_value = utc_days * 86400
    const date = new Date(utc_value * 1000)

    if (isNaN(date.getTime())) return null
    if (date.getFullYear() < 2000) return null // Extra safety: reject dates before 2000
    return date.toISOString()
  } catch {
    return null
  }
}

// Parse boolean values from Excel (can be "Sim"/"Nao", "Yes"/"No", true/false, 1/0)
function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    return lower === 'sim' || lower === 'yes' || lower === 'true' || lower === '1'
  }
  return false
}

// Parse command line arguments
function parseArgs() {
  const args: Record<string, string> = {}
  process.argv.slice(2).forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (match) {
      args[match[1]] = match[2]
    }
  })
  return args
}

/**
 * Main sync function
 */
async function main() {
  const startTime = Date.now()
  let logId: string | null = null

  // Check if a sync_log_id was passed (from CRM via repository_dispatch)
  const args = parseArgs()
  const existingLogId = args['sync-log-id'] || null

  console.log('===============================================')
  console.log('GitHub Actions Recurrences Sync')
  console.log('===============================================')

  try {
    // Use existing log if provided (user triggered via CRM), otherwise create new (scheduled/manual)
    if (existingLogId && existingLogId !== 'null') {
      logId = existingLogId
      console.log(`Using existing sync log: ${logId}`)

      // Update status to in_progress
      await supabase
        .from('recurrences_sync_logs')
        .update({ status: 'in_progress' })
        .eq('id', logId)
    } else {
      // Create new sync log entry (for scheduled runs)
      const { data: logEntry, error: logError } = await supabase
        .from('recurrences_sync_logs')
        .insert({
          triggered_by: null, // No user when triggered by schedule
          triggered_by_system: 'github-actions-scheduled',
          triggered_at: new Date().toISOString(),
          status: 'in_progress',
          records_processed: 0,
          records_inserted: 0,
          records_updated: 0,
        })
        .select('id')
        .single()

      if (logError) {
        console.error('Failed to create sync log:', logError.message)
      } else if (logEntry) {
        logId = logEntry.id
        console.log(`Created sync log: ${logId}`)
      }
    }

    // Step 1: Run scrapper
    console.log('\nStep 1/3: Running recurrences scrapper...')
    const scrapperResult = await runRecurrencesScrapper({ headless: true })

    if (!scrapperResult.success || !scrapperResult.filePath) {
      throw new Error(scrapperResult.error || 'Scrapper failed without error message')
    }

    console.log(`Excel downloaded: ${scrapperResult.filePath}`)

    // Step 2: Parse Excel
    console.log('\nStep 2/3: Parsing Excel file...')

    if (!fs.existsSync(scrapperResult.filePath)) {
      throw new Error(`Excel file not found at: ${scrapperResult.filePath}`)
    }

    const fileBuffer = fs.readFileSync(scrapperResult.filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as BackofficeRecurrence[]

    console.log(`Parsed ${data.length} recurrence records from Excel`)

    if (data.length === 0) {
      console.log('No records to sync')

      if (logId) {
        await supabase
          .from('recurrences_sync_logs')
          .update({
            status: 'success',
            duration_seconds: Math.round((Date.now() - startTime) / 1000),
            records_processed: 0,
            records_inserted: 0,
            records_updated: 0,
          })
          .eq('id', logId)
      }

      process.exit(0)
    }

    // Get file size
    const fileStats = fs.statSync(scrapperResult.filePath)
    const fileSizeKB = Math.round(fileStats.size / 1024)

    // Step 3: Transform and upsert to Supabase
    console.log('\nStep 3/3: Upserting recurrences to Supabase...')

    let inserted = 0
    let updated = 0
    let errors = 0
    const errorMessages: string[] = []

    // Get existing records by recurrence_code for counting inserts vs updates
    const { data: existingRecords } = await supabase
      .from('recurrences')
      .select('recurrence_code')

    const existingCodes = new Set(existingRecords?.map(r => r.recurrence_code) || [])
    console.log(`   Found ${existingCodes.size} existing recurrence records`)

    // Transform all data
    const allRecurrencesData = data.map(row => ({
      recurrence_code: String(row.RECURRENCE_CODE || ''),
      recurrence_type: row.RECURRENCE_TYPE || null,
      recurrence_status: row.RECURRENCE_STATUS || null,
      submission_date: excelDateToISO(row.SUBMISSION_DATE),
      service: row.SERVICE || null,
      user_id: row.USER_ID ? String(row.USER_ID) : null,
      client_name: row.CLIENT_NAME || null,
      address_town: row.ADRESS_TOWN || null, // Note: typo in Excel header
      address_district: row.ADRESS_DISTRICT || null, // Note: typo in Excel header
      address_street: row.ADDRESS_STREET || null,
      source: row.SOURCE || null,
      flag_edit_schedule: parseBoolean(row.FLAG_EDIT_SCHEDULE),
      flag_edit_payment: parseBoolean(row.FLAG_EDIT_PAYMENT),
      inactivation_date: excelDateToISO(row.INATIVATION_DATE),
      inactivation_reason: row.INATIVATION_REASON || null,
      inactivation_comment: row.INATIVATION_COMMENT || null,
      synced_at: new Date().toISOString(),
    }))

    // Filter out records without recurrence_code
    const validRecords = allRecurrencesData.filter(r => r.recurrence_code && r.recurrence_code !== '')
    console.log(`   Valid records (with recurrence_code): ${validRecords.length}/${allRecurrencesData.length}`)

    // Deduplicate by recurrence_code (keep the last occurrence)
    const deduplicatedRecords = Array.from(
      validRecords.reduce((map, record) => {
        map.set(record.recurrence_code, record)
        return map
      }, new Map<string, typeof validRecords[0]>()).values()
    )
    console.log(`   Deduplicated: ${validRecords.length} -> ${deduplicatedRecords.length} unique recurrences`)

    // Count inserts vs updates
    for (const record of deduplicatedRecords) {
      if (existingCodes.has(record.recurrence_code)) {
        updated++
      } else {
        inserted++
      }
    }

    // Process in batches using upsert
    const BATCH_SIZE = 500

    for (let i = 0; i < deduplicatedRecords.length; i += BATCH_SIZE) {
      const batch = deduplicatedRecords.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(deduplicatedRecords.length / BATCH_SIZE)

      console.log(`   Upserting batch ${batchNum}/${totalBatches} (${batch.length} records)...`)

      const { error: upsertError } = await supabase
        .from('recurrences')
        .upsert(batch, {
          onConflict: 'recurrence_code',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error(`   Batch ${batchNum} error: ${upsertError.message}`)
        errorMessages.push(`Batch ${batchNum}: ${upsertError.message}`)
        errors += batch.length
        // Reset counts since we don't know which succeeded
        inserted = 0
        updated = 0
      }
    }

    if (errors > 0) {
      console.error(`   Total errors: ${errors}`)
    }

    const totalProcessed = inserted + updated + errors
    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with success
    if (logId) {
      await supabase
        .from('recurrences_sync_logs')
        .update({
          status: errors > 0 && inserted + updated === 0 ? 'error' : 'success',
          duration_seconds: duration,
          records_processed: totalProcessed,
          records_inserted: inserted,
          records_updated: updated,
          excel_file_path: scrapperResult.filePath,
          excel_file_size_kb: fileSizeKB,
          error_message: errors > 0 ? `${errors} errors` : null,
          error_stack: errorMessages.length > 0 ? errorMessages.slice(0, 10).join('\n') : null,
        })
        .eq('id', logId)
    }

    console.log('\n===============================================')
    console.log('RECURRENCES SYNC COMPLETED!')
    console.log(`Processed: ${totalProcessed}`)
    console.log(`   - Inserted: ${inserted}`)
    console.log(`   - Updated: ${updated}`)
    console.log(`   - Errors: ${errors}`)
    console.log(`Duration: ${duration}s`)
    console.log('===============================================')

    process.exit(errors > 0 && inserted + updated === 0 ? 1 : 0)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('\nSYNC FAILED:', errorMessage)

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with error
    if (logId) {
      await supabase
        .from('recurrences_sync_logs')
        .update({
          status: 'error',
          error_message: errorMessage,
          error_stack: errorStack,
          duration_seconds: duration,
        })
        .eq('id', logId)
    }

    process.exit(1)
  }
}

main()
