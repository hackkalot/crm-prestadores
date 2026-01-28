/**
 * Standalone script for GitHub Actions to sync clients data
 *
 * This script:
 * 1. Runs Puppeteer scrapper to download Excel from backoffice
 * 2. Parses Excel file
 * 3. Upserts clients data directly to Supabase
 *
 * Environment variables required:
 * - BACKOFFICE_USERNAME
 * - BACKOFFICE_PASSWORD
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - PUPPETEER_EXECUTABLE_PATH (set by workflow)
 */

import { runClientsScrapper } from './export-clients-data'
import * as XLSX from 'xlsx'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:')
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
interface BackofficeClient {
  USER_ID: string
  NAME: string
  SURNAME: string
  EMAIL: string
  PHONE: string
  VAT: string
  FIRST_REQUEST: number | null
  LAST_REQUEST: number | null
  TOTAL_REQUESTS: number
  ACTIVE_REQUESTS: number
  CANCELLED_REQUESTS: number
  COMPLETED_REQUESTS: number
  EXPIRED_REQUESTS: number
  CUSTOMER_BALANCE: number
  TOTAL_PAYMENTS: number
  TOTAL_DISCOUNTS: number
  REGISTRATION: number | null
  LAST_UPDATE: number | null
  UPDATED_BY: string
  LAST_LOGIN: number | null
  MARKETING_CONSENT: boolean | string
  MARKETING_CONSENT_TIMESTAMP: number | null
  CLIENT_STATUS: string
  CANCELLATION_REASON: string
  STATUS_UPDATED_AT: number | null
  STATUS_UPDATED_BY: string
  AIRSHIP: string
  CURRENT_WALLET_AMOUNT: number
  WALLET_IS_ACTIVE: boolean | string
  TOTAL_WALLET_BENEFITS: number
  TOTAL_WALLET_PAYMENTS: number
  LAST_WALLET_PAYMENT: number | null
  NUMBER_OF_WALLET_PAYMENTS: number
  CLIENT_MGM_PROMOCODE: string
  'NUMBER_MGM_PROMOCODE _USAGE': number  // Note: has a space before USAGE in original column name
  TOTAL_MGM_BENEFITS: number
  TOTAL_OVERALL_RECURRENCIES: number
  ACTIVE_OVERALL_RECURRENCIES: number
  TOTAL_RECURRENT_SR: number
  TOTAL_RECURRENT_SR_ACTIVE: number
  WALLET_TOTAL_INJECTED_VALUE: number
  DEVICE_PLATFORM_CUSTOMER_REGISTRATION: string
  WALLET_REMOVED_VALUE: number
  SERVICE_ADDRESS_LINE_1: string
  SERVICE_ADDRESS_LINE_2: string
  ZIP_CODE: string
  CITY: string
  CONTACT_ID: string
  BO_GENERATED: boolean | string
}

// Convert Excel serial date to ISO string
function excelDateToISO(value: unknown): string | null {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === '') return null

  // Convert to number if it's a string
  const serial = typeof value === 'number' ? value : parseFloat(String(value))

  // Check if it's a valid number
  if (isNaN(serial) || !isFinite(serial)) return null
  if (serial < 1 || serial > 73051) return null // Between 1900 and 2100

  try {
    const utc_days = Math.floor(serial - 25569)
    const utc_value = utc_days * 86400
    const date = new Date(utc_value * 1000)

    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch {
    return null
  }
}

// Parse boolean values from Excel (can be "Sim"/"Não", "Yes"/"No", true/false, 1/0)
function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    return lower === 'sim' || lower === 'yes' || lower === 'true' || lower === '1'
  }
  return false
}

// Parse number safely
function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'))
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

// Parse integer safely
function parseInt2(value: unknown): number {
  if (typeof value === 'number') return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
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

  console.log('═══════════════════════════════════════════════')
  console.log('🚀 GitHub Actions Clients Sync')
  console.log('═══════════════════════════════════════════════')

  try {
    // Use existing log if provided (user triggered via CRM), otherwise create new (scheduled/manual)
    if (existingLogId && existingLogId !== 'null') {
      logId = existingLogId
      console.log(`📝 Using existing sync log: ${logId}`)

      // Update status to in_progress
      await supabase
        .from('clients_sync_logs')
        .update({ status: 'in_progress' })
        .eq('id', logId)
    } else {
      // Create new sync log entry (for scheduled runs)
      const { data: logEntry, error: logError } = await supabase
        .from('clients_sync_logs')
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
        console.error('⚠️ Failed to create sync log:', logError.message)
      } else if (logEntry) {
        logId = logEntry.id
        console.log(`📝 Created sync log: ${logId}`)
      }
    }

    // Step 1: Run scrapper
    console.log('\n📥 Step 1/3: Running clients scrapper...')
    const scrapperResult = await runClientsScrapper({ headless: true })

    if (!scrapperResult.success || !scrapperResult.filePath) {
      throw new Error(scrapperResult.error || 'Scrapper failed without error message')
    }

    console.log(`✅ Excel downloaded: ${scrapperResult.filePath}`)

    // Step 2: Parse Excel
    console.log('\n📊 Step 2/3: Parsing Excel file...')

    if (!fs.existsSync(scrapperResult.filePath)) {
      throw new Error(`Excel file not found at: ${scrapperResult.filePath}`)
    }

    const fileBuffer = fs.readFileSync(scrapperResult.filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as BackofficeClient[]

    console.log(`✅ Parsed ${data.length} client records from Excel`)

    if (data.length === 0) {
      console.log('⚠️ No records to sync')

      if (logId) {
        await supabase
          .from('clients_sync_logs')
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
    console.log('\n💾 Step 3/3: Upserting clients to Supabase...')

    let inserted = 0
    let updated = 0
    let errors = 0
    const errorMessages: string[] = []

    // Get existing records by user_id for counting inserts vs updates
    const { data: existingRecords } = await supabase
      .from('clients')
      .select('user_id')

    const existingUserIds = new Set(existingRecords?.map(r => r.user_id) || [])
    console.log(`   Found ${existingUserIds.size} existing client records`)

    // Transform all data
    const allClientsData = data.map(row => ({
      user_id: String(row.USER_ID || ''),
      name: row.NAME || null,
      surname: row.SURNAME || null,
      email: row.EMAIL || null,
      phone: row.PHONE || null,
      vat: row.VAT || null,
      first_request: excelDateToISO(row.FIRST_REQUEST),
      last_request: excelDateToISO(row.LAST_REQUEST),
      total_requests: parseInt2(row.TOTAL_REQUESTS),
      active_requests: parseInt2(row.ACTIVE_REQUESTS),
      cancelled_requests: parseInt2(row.CANCELLED_REQUESTS),
      completed_requests: parseInt2(row.COMPLETED_REQUESTS),
      expired_requests: parseInt2(row.EXPIRED_REQUESTS),
      customer_balance: parseNumber(row.CUSTOMER_BALANCE),
      total_payments: parseNumber(row.TOTAL_PAYMENTS),
      total_discounts: parseNumber(row.TOTAL_DISCOUNTS),
      registration: excelDateToISO(row.REGISTRATION),
      last_update: excelDateToISO(row.LAST_UPDATE),
      updated_by: row.UPDATED_BY || null,
      last_login: excelDateToISO(row.LAST_LOGIN),
      marketing_consent: parseBoolean(row.MARKETING_CONSENT),
      marketing_consent_timestamp: excelDateToISO(row.MARKETING_CONSENT_TIMESTAMP),
      client_status: row.CLIENT_STATUS || null,
      cancellation_reason: row.CANCELLATION_REASON || null,
      status_updated_at: excelDateToISO(row.STATUS_UPDATED_AT),
      status_updated_by: row.STATUS_UPDATED_BY || null,
      airship: row.AIRSHIP || null,
      current_wallet_amount: parseNumber(row.CURRENT_WALLET_AMOUNT),
      wallet_is_active: parseBoolean(row.WALLET_IS_ACTIVE),
      total_wallet_benefits: parseNumber(row.TOTAL_WALLET_BENEFITS),
      total_wallet_payments: parseNumber(row.TOTAL_WALLET_PAYMENTS),
      last_wallet_payment: excelDateToISO(row.LAST_WALLET_PAYMENT),
      number_of_wallet_payments: parseInt2(row.NUMBER_OF_WALLET_PAYMENTS),
      wallet_total_injected_value: parseNumber(row.WALLET_TOTAL_INJECTED_VALUE),
      wallet_removed_value: parseNumber(row.WALLET_REMOVED_VALUE),
      client_mgm_promocode: row.CLIENT_MGM_PROMOCODE || null,
      number_mgm_promocode_usage: parseInt2(row['NUMBER_MGM_PROMOCODE _USAGE']),
      total_mgm_benefits: parseNumber(row.TOTAL_MGM_BENEFITS),
      total_overall_recurrencies: parseInt2(row.TOTAL_OVERALL_RECURRENCIES),
      active_overall_recurrencies: parseInt2(row.ACTIVE_OVERALL_RECURRENCIES),
      total_recurrent_sr: parseInt2(row.TOTAL_RECURRENT_SR),
      total_recurrent_sr_active: parseInt2(row.TOTAL_RECURRENT_SR_ACTIVE),
      device_platform_customer_registration: row.DEVICE_PLATFORM_CUSTOMER_REGISTRATION || null,
      service_address_line_1: row.SERVICE_ADDRESS_LINE_1 || null,
      service_address_line_2: row.SERVICE_ADDRESS_LINE_2 || null,
      zip_code: row.ZIP_CODE || null,
      city: row.CITY || null,
      contact_id: row.CONTACT_ID || null,
      bo_generated: parseBoolean(row.BO_GENERATED),
      synced_at: new Date().toISOString(),
    }))

    // Filter out records without user_id
    const validRecords = allClientsData.filter(r => r.user_id && r.user_id !== '')
    console.log(`   Valid records (with user_id): ${validRecords.length}/${allClientsData.length}`)

    // Count inserts vs updates
    for (const record of validRecords) {
      if (existingUserIds.has(record.user_id)) {
        updated++
      } else {
        inserted++
      }
    }

    // Process in batches using upsert
    const BATCH_SIZE = 500

    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE)

      console.log(`   Upserting batch ${batchNum}/${totalBatches} (${batch.length} records)...`)

      const { error: upsertError } = await supabase
        .from('clients')
        .upsert(batch, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error(`   ❌ Batch ${batchNum} error: ${upsertError.message}`)
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
        .from('clients_sync_logs')
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

    console.log('\n═══════════════════════════════════════════════')
    console.log('✅ CLIENTS SYNC COMPLETED!')
    console.log(`📊 Processed: ${totalProcessed}`)
    console.log(`   - Inserted: ${inserted}`)
    console.log(`   - Updated: ${updated}`)
    console.log(`   - Errors: ${errors}`)
    console.log(`⏱️  Duration: ${duration}s`)
    console.log('═══════════════════════════════════════════════')

    process.exit(errors > 0 && inserted + updated === 0 ? 1 : 0)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('\n❌ SYNC FAILED:', errorMessage)

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with error
    if (logId) {
      await supabase
        .from('clients_sync_logs')
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
