/**
 * Standalone script for GitHub Actions to sync backoffice data
 *
 * This script:
 * 1. Runs Puppeteer scrapper to download Excel from backoffice
 * 2. Parses Excel file
 * 3. Upserts data directly to Supabase
 *
 * Environment variables required:
 * - BACKOFFICE_USERNAME
 * - BACKOFFICE_PASSWORD
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { runScrapper } from './export-backoffice-data'
import * as XLSX from 'xlsx'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Parse CLI arguments
const args = process.argv.slice(2)
const fromArg = args.find(a => a.startsWith('--from='))?.split('=')[1]
const toArg = args.find(a => a.startsWith('--to='))?.split('=')[1]
const syncLogIdArg = args.find(a => a.startsWith('--sync-log-id='))?.split('=')[1]

if (!fromArg || !toArg) {
  console.error('❌ Missing required arguments: --from=dd-mm-yyyy --to=dd-mm-yyyy')
  process.exit(1)
}

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

/**
 * Convert dd-mm-yyyy to ISO date (yyyy-mm-dd)
 */
function convertToISODate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split('-')
  return `${year}-${month}-${day}`
}

/**
 * Convert Excel serial date to ISO string
 */
function excelDateToISO(excelDate: number | string): string | null {
  if (!excelDate) return null

  // If it's already a string date, try to parse it
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
    return null
  }

  // Excel serial date conversion
  const excelEpoch = new Date(1900, 0, 1)
  const days = Math.floor(excelDate) - 2 // Excel bug: treats 1900 as leap year
  const milliseconds = (excelDate - Math.floor(excelDate)) * 24 * 60 * 60 * 1000

  const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000 + milliseconds)
  return date.toISOString()
}

/**
 * Main sync function
 */
async function main() {
  const startTime = Date.now()
  let logId: string | null = null

  console.log('═══════════════════════════════════════════════')
  console.log('🚀 GitHub Actions Backoffice Sync')
  console.log(`📅 Period: ${fromArg} to ${toArg}`)
  console.log('═══════════════════════════════════════════════')

  try {
    // Use existing log if provided (user triggered via CRM), otherwise create new (scheduled/manual)
    if (syncLogIdArg && syncLogIdArg !== 'null') {
      logId = syncLogIdArg
      console.log(`📝 Using existing sync log: ${logId}`)

      // Update status to in_progress
      await supabase
        .from('sync_logs')
        .update({ status: 'in_progress' })
        .eq('id', logId)
    } else {
      // Create new sync log entry (for scheduled runs)
      const { data: logEntry, error: logError } = await supabase
        .from('sync_logs')
        .insert({
          triggered_by: null, // No user when triggered by schedule
          date_from: convertToISODate(fromArg),
          date_to: convertToISODate(toArg),
          status: 'in_progress',
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
    console.log('\n📥 Step 1/3: Running scrapper...')
    const scrapperResult = await runScrapper({
      dateFrom: fromArg,
      dateTo: toArg,
      headless: true,
    })

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
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    console.log(`✅ Parsed ${data.length} records from Excel`)

    if (data.length === 0) {
      console.log('⚠️ No records to sync')

      if (logId) {
        await supabase
          .from('sync_logs')
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
    console.log('\n💾 Step 3/3: Upserting to Supabase...')

    const transformedRecords = data.map(row => ({
      // Primary fields
      request_code: row.REQUEST_CODE,
      fid_id: row.FID_ID || null,
      hubspot_deal_id: row.HUBSPOT_DEAL_ID || null,

      // Client info
      user_id: row.USER_ID || null,
      client_town: row.CLIENT_TOWN || null,
      client_district: row.CLIENT_DISTRICT || null,

      // Service info
      cluster_id: row.CLUSTER_ID || null,
      cluster: row.CLUSTER || null,
      category_id: row.CATEGORY_ID || null,
      category: row.CATEGORY || null,
      service_id: row.SERVICE_ID || null,
      service: row.SERVICE || null,

      // Address
      service_address_line_1: row.SERVICE_ADDRESS_LINE_1 || null,
      service_address_line_2: row.SERVICE_ADDRESS_LINE_2 || null,
      zip_code: row.ZIP_CODE || null,
      city: row.CITY || null,

      // Scheduling
      scheduled_to: row.SCHEDULED_TO ? excelDateToISO(row.SCHEDULED_TO) : null,

      // Pricing
      cost_estimation: parseFloat(row.COST_ESTIMATION) || 0,
      promocode: row.PROMOCODE || null,
      promocode_discount: parseFloat(row.PROMOCODE_DISCOUNT) || 0,
      final_cost_estimation: parseFloat(row.FINAL_COST_ESTIMATION) || 0,
      gross_additional_charges: parseFloat(row.GROSS_ADDITIONAL_CHARGES) || 0,
      additional_charges_discount: parseFloat(row.ADDITIONAL_CHARGES_DISCOUNT) || 0,
      net_additional_charges: parseFloat(row.NET_ADDITIONAL_CHARGES) || 0,
      paid_amount: parseFloat(row.PAID_AMOUNT) || 0,
      refund_amount: parseFloat(row.REFUND_AMOUNT) || 0,
      net_amount: parseFloat(row.NET_AMOUNT) || 0,
      fees: row.FEES || null,
      fees_amount: parseFloat(row.FEES_AMOUNT) || 0,

      // Payment
      payment_status: row.PAYMENT_STATUS || null,
      payment_method: row.PAYMENT_METHOD || null,
      refund_reason: row.REFUND_REASON || null,
      refund_comment: row.REFUND_COMMENT || null,
      used_wallet: row.USED_WALLET || false,

      // Provider
      assigned_provider_id: row.ASSIGNED_PROVIDER_ID || null,
      assigned_provider_name: row.ASSIGNED_PROVIDER_NAME || null,
      provider_cost: parseFloat(row.PROVIDER_COST) || 0,
      provider_allocation_manual: row.PROVIDER_ALLOCATION_MANUAL || false,
      provider_confirmed_timestamp: row.PROVIDER_CONFIRMED_TIMESTAMP ? excelDateToISO(row.PROVIDER_CONFIRMED_TIMESTAMP) : null,
      technician_name: row.TECHNICIAN_NAME || null,
      technician_allocation_before_service: row.TECHNICIAN_ALLOCATION_BEFORE_SERVICE || false,
      multiple_providers: row.MULTIPLE_PROVIDERS || false,

      // Status
      status: row.STATUS || null,
      cancellation_reason: row.CANCELLATION_REASON || null,
      cancellation_comment: row.CANCELLATION_COMMENT || null,
      status_updated_at: row.STATUS_UPDATED_AT ? excelDateToISO(row.STATUS_UPDATED_AT) : null,
      status_updated_by: row.STATUS_UPDATED_BY || null,

      // Invoice
      invoice_process_status: row.INVOICE_PROCESS_STATUS || null,

      // Ratings
      service_rating: row.SERVICE_RATING || 0,
      technician_rating: row.TECHNICIAN_RATING || 0,
      service_rating_comment: row.SERVICE_RATING_COMMENT || null,

      // Metadata
      source: row.SOURCE || null,
      is_mgm: row.IS_MGM || false,
      is_new_pricing_model: row.IS_NEW_PRICING_MODEL || false,
      done_on_mbway_flow: row.DONE_ON_MBWAY_FLOW || false,

      // Recurrence
      recurrence_code: row.RECURRENCE_CODE || null,
      recurrence_type: row.RECURRENCE_TYPE || null,

      // Reschedule
      reschedule_reason: row.RESCHEDULE_REASON || null,
      reschedule_comment: row.RESCHEDULE_COMMENT || null,
      reschedule_bo: row.RESCHEDULE_BO || false,

      // Provider app events
      delivery_schedule_providers_app: row.DELIVERY_SCHEDULE_PROVIDERS_APP || false,
      checkin_providers_app: row.CHECKIN_PROVIDERS_APP || false,
      checkout_providers_app: row.CHECKOUT_PROVIDERS_APP || false,

      // Notes and docs
      providers_conclusion_notes: row.PROVIDERS_CONCLUSION_NOTES || null,
      providers_documents: row.PROVIDERS_DOCUMENTS || false,
      provider_request_notes: row.PROVIDER_REQUEST_NOTES || false,

      // Contact
      contact_client_cta: row.CONTACT_CLIENT_CTA || false,
      contact_client_reason: row.CONTACT_CLIENT_REASON || null,
      contact_client_calltimes: row.CONTACT_CLIENT_CALLTIMES || 0,

      // Additional
      number_additional_visits: parseInt(row.NUMBER_ADDITIONAL_VISITS) || 0,
      tasks_count: row.TASKS_COUNT || 0,

      // Timestamps
      created_at: row.CREATED_AT ? excelDateToISO(row.CREATED_AT) : null,
      created_by: row.CREATED_BY || null,
      last_update: row.LAST_UPDATE ? excelDateToISO(row.LAST_UPDATE) : null,
      updated_by: row.UPDATED_BY || null,
    }))

    // Upsert in batches of 500
    const BATCH_SIZE = 500
    let totalUpserted = 0

    for (let i = 0; i < transformedRecords.length; i += BATCH_SIZE) {
      const batch = transformedRecords.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(transformedRecords.length / BATCH_SIZE)

      console.log(`   Upserting batch ${batchNum}/${totalBatches} (${batch.length} records)...`)

      const { error: upsertError } = await supabase
        .from('service_requests')
        .upsert(batch, {
          onConflict: 'request_code',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        throw new Error(`Database error in batch ${batchNum}: ${upsertError.message}`)
      }

      totalUpserted += batch.length
    }

    console.log(`✅ Upserted ${totalUpserted} records to Supabase`)

    // Calculate duration
    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with success
    if (logId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'success',
          duration_seconds: duration,
          records_processed: data.length,
          records_inserted: totalUpserted,
          records_updated: 0,
          excel_file_path: scrapperResult.filePath,
          excel_file_size_kb: fileSizeKB,
        })
        .eq('id', logId)
    }

    console.log('\n═══════════════════════════════════════════════')
    console.log('✅ SYNC COMPLETED SUCCESSFULLY!')
    console.log(`📊 Records processed: ${data.length}`)
    console.log(`⏱️  Duration: ${duration}s`)
    console.log('═══════════════════════════════════════════════')

    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ SYNC FAILED:', error.message)

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with error
    if (logId) {
      await supabase
        .from('sync_logs')
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
