/**
 * Standalone script for GitHub Actions to sync billing processes data
 *
 * This script:
 * 1. Runs Puppeteer scrapper to download Excel from backoffice
 * 2. Parses Excel file
 * 3. Upserts billing data directly to Supabase
 *
 * Environment variables required:
 * - BACKOFFICE_USERNAME
 * - BACKOFFICE_PASSWORD
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - PUPPETEER_EXECUTABLE_PATH (set by workflow)
 */

import { runBillingScrapper } from './export-billing-data'
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

// Types from backoffice export
interface BackofficeBilling {
  'Service Request Identifier': number
  REQUEST_CODE: string
  ASSIGNED_PROVIDER_NAME: string
  SERVICE: string
  SCHEDULED_TO: number | null
  DOCUMENT_DATE: number | null
  BO_VALIDATION_DATE: number | null
  INVOICES_NUMBER: number
  CREDIT_NOTE_NUMBER: number
  HAS_DUPLICATE: boolean
  'TOTAL_SERVICE_COST (€)': number
  'BASE_SERVICE_COST (€)': number
  'TOTAL_INVOICE_VALUE (€)': number
  PROCESS_STATUS: string
  PAYMENT_DATE: number | null
  TIMESTAMP_PROCESS_STATUS: number | null
  DOCUMENT_NUMBER: string
  PROVIDER_AUTOMATIC_COST: boolean
  CONCLUSION_RESPONSE: string
  SUM_TRANSACTIONS: number
  COMPLAINT: boolean
}

// Convert Excel serial date to ISO string
function excelDateToISO(serial: number | null | undefined): string | null {
  if (!serial || serial === 0 || typeof serial !== 'number') return null
  if (serial < 1 || serial > 2958465) return null

  const utc_days = Math.floor(serial - 25569)
  const utc_value = utc_days * 86400
  const date = new Date(utc_value * 1000)

  if (isNaN(date.getTime())) return null
  return date.toISOString()
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
  console.log('🚀 GitHub Actions Billing Processes Sync')
  console.log('═══════════════════════════════════════════════')

  try {
    // Use existing log if provided (user triggered via CRM), otherwise create new (scheduled/manual)
    if (existingLogId && existingLogId !== 'null') {
      logId = existingLogId
      console.log(`📝 Using existing sync log: ${logId}`)

      // Update status to in_progress
      await supabase
        .from('billing_sync_logs')
        .update({ status: 'in_progress' })
        .eq('id', logId)
    } else {
      // Create new sync log entry (for scheduled runs)
      const { data: logEntry, error: logError } = await supabase
        .from('billing_sync_logs')
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
    console.log('\n📥 Step 1/3: Running billing scrapper...')
    const scrapperResult = await runBillingScrapper({ headless: true })

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
    const data = XLSX.utils.sheet_to_json(worksheet) as BackofficeBilling[]

    console.log(`✅ Parsed ${data.length} billing records from Excel`)

    if (data.length === 0) {
      console.log('⚠️ No records to sync')

      if (logId) {
        await supabase
          .from('billing_sync_logs')
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
    console.log('\n💾 Step 3/3: Upserting billing processes to Supabase...')

    let inserted = 0
    let updated = 0
    let errors = 0
    const errorMessages: string[] = []

    // Get existing records by request_code for counting inserts vs updates
    const { data: existingRecords } = await supabase
      .from('billing_processes')
      .select('request_code')

    const existingCodes = new Set(existingRecords?.map(r => r.request_code) || [])
    console.log(`   Found ${existingCodes.size} existing billing records`)

    // Transform all data
    const allBillingData = data.map(row => ({
      request_code: row.REQUEST_CODE,
      service_request_identifier: row['Service Request Identifier'] || null,
      assigned_provider_name: row.ASSIGNED_PROVIDER_NAME || null,
      service: row.SERVICE || null,
      scheduled_to: excelDateToISO(row.SCHEDULED_TO),
      document_date: excelDateToISO(row.DOCUMENT_DATE),
      bo_validation_date: excelDateToISO(row.BO_VALIDATION_DATE),
      payment_date: excelDateToISO(row.PAYMENT_DATE),
      timestamp_process_status: excelDateToISO(row.TIMESTAMP_PROCESS_STATUS),
      invoices_number: row.INVOICES_NUMBER || 0,
      credit_note_number: row.CREDIT_NOTE_NUMBER || 0,
      has_duplicate: row.HAS_DUPLICATE || false,
      provider_automatic_cost: row.PROVIDER_AUTOMATIC_COST || false,
      complaint: row.COMPLAINT || false,
      total_service_cost: row['TOTAL_SERVICE_COST (€)'] || 0,
      base_service_cost: row['BASE_SERVICE_COST (€)'] || 0,
      total_invoice_value: row['TOTAL_INVOICE_VALUE (€)'] || 0,
      sum_transactions: row.SUM_TRANSACTIONS || 0,
      process_status: row.PROCESS_STATUS || null,
      document_number: row.DOCUMENT_NUMBER || null,
      conclusion_response: row.CONCLUSION_RESPONSE || null,
      synced_at: new Date().toISOString(),
    }))

    // Count inserts vs updates
    for (const record of allBillingData) {
      if (existingCodes.has(record.request_code)) {
        updated++
      } else {
        inserted++
      }
    }

    // Process in batches using upsert
    const BATCH_SIZE = 500

    for (let i = 0; i < allBillingData.length; i += BATCH_SIZE) {
      const batch = allBillingData.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(allBillingData.length / BATCH_SIZE)

      console.log(`   Upserting batch ${batchNum}/${totalBatches} (${batch.length} records)...`)

      const { error: upsertError } = await supabase
        .from('billing_processes')
        .upsert(batch, {
          onConflict: 'request_code',
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
        .from('billing_sync_logs')
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
    console.log('✅ BILLING SYNC COMPLETED!')
    console.log(`📊 Processed: ${totalProcessed}`)
    console.log(`   - Inserted: ${inserted}`)
    console.log(`   - Updated: ${updated}`)
    console.log(`   - Errors: ${errors}`)
    console.log(`⏱️  Duration: ${duration}s`)
    console.log('═══════════════════════════════════════════════')

    process.exit(errors > 0 && inserted + updated === 0 ? 1 : 0)
  } catch (error: any) {
    console.error('\n❌ SYNC FAILED:', error.message)

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with error
    if (logId) {
      await supabase
        .from('billing_sync_logs')
        .update({
          status: 'error',
          error_message: error.message || 'Unknown error',
          error_stack: error.stack,
          duration_seconds: duration,
        })
        .eq('id', logId)
    }

    process.exit(1)
  }
}

main()
