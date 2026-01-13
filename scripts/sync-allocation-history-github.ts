/**
 * Standalone script for GitHub Actions to sync allocation history data
 *
 * This script:
 * 1. Runs Puppeteer scrapper to download Excel from backoffice
 * 2. Parses Excel file
 * 3. Upserts allocation history to Supabase
 *
 * Environment variables required:
 * - BACKOFFICE_USERNAME
 * - BACKOFFICE_PASSWORD
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - PUPPETEER_EXECUTABLE_PATH (set by workflow)
 */

import { runAllocationHistoryScrapper } from './export-allocation-history'
import * as XLSX from 'xlsx'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
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
interface BackofficeAllocationHistory {
  USER_ID: number
  PROVIDER_NAME: string
  REQUESTS_RECEIVED: number
  REQUESTS_ACCEPTED: number
  'RESQUESTS_ EXPIRED': number  // Note: typo in backoffice
  REQUESTS_REJECTED: number
  AVG_RESPONSE_TIME: string  // Format: HH:MM:SS
}

// Parse time string (HH:MM:SS) to PostgreSQL interval format
function parseTimeToInterval(timeStr: string | null | undefined): string | null {
  if (!timeStr || typeof timeStr !== 'string') return null

  // Already in HH:MM:SS format, PostgreSQL accepts this as interval
  const match = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})$/)
  if (!match) return null

  return timeStr  // PostgreSQL will interpret "HH:MM:SS" as interval
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

// Format date for display (dd-mm-yyyy)
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

// Format date for PostgreSQL (yyyy-mm-dd)
function toPostgresDate(dateStr: string): string {
  const [day, month, year] = dateStr.split('-')
  return `${year}-${month}-${day}`
}

/**
 * Get first day of current month
 */
function getFirstDayOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Get last day of current month (handles Feb 28/29, different month lengths)
 */
function getLastDayOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/**
 * Main sync function
 */
async function main() {
  const startTime = Date.now()
  let logId: string | null = null

  // Parse arguments
  const args = parseArgs()
  const existingLogId = args['sync-log-id'] || null
  const dateFrom = args['date-from'] || null
  const dateTo = args['date-to'] || null

  // Default dates: full current month (1st to last day)
  // This ensures:
  // - All syncs within a month use the same period → UPDATE operations
  // - New month = new period → INSERT operations (new records for the month)
  const today = new Date()
  const firstDayOfMonth = getFirstDayOfMonth(today)
  const lastDayOfMonth = getLastDayOfMonth(today)

  const periodFrom = dateFrom || formatDate(firstDayOfMonth)
  const periodTo = dateTo || formatDate(lastDayOfMonth)

  console.log('═══════════════════════════════════════════════')
  console.log('🚀 GitHub Actions Allocation History Sync')
  console.log(`📅 Period: ${periodFrom} to ${periodTo}`)
  console.log('═══════════════════════════════════════════════')

  try {
    // Use existing log if provided (user triggered via CRM), otherwise create new (scheduled/manual)
    if (existingLogId) {
      logId = existingLogId
      console.log(`📝 Using existing sync log: ${logId}`)

      // Update status to in_progress
      await supabase
        .from('allocation_sync_logs')
        .update({
          status: 'in_progress',
          period_from: toPostgresDate(periodFrom),
          period_to: toPostgresDate(periodTo),
        })
        .eq('id', logId)
    } else {
      // Create new sync log entry (for scheduled runs)
      const { data: logEntry, error: logError } = await supabase
        .from('allocation_sync_logs')
        .insert({
          triggered_by: null, // No user when triggered by schedule
          triggered_by_system: 'github-actions-scheduled',
          triggered_at: new Date().toISOString(),
          status: 'in_progress',
          period_from: toPostgresDate(periodFrom),
          period_to: toPostgresDate(periodTo),
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
    console.log('\n📥 Step 1/3: Running allocation history scrapper...')
    const scrapperResult = await runAllocationHistoryScrapper({
      dateFrom: periodFrom,
      dateTo: periodTo,
      headless: true
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
    const data = XLSX.utils.sheet_to_json(worksheet) as BackofficeAllocationHistory[]

    console.log(`✅ Parsed ${data.length} allocation records from Excel`)

    if (data.length === 0) {
      console.log('⚠️ No allocation records to sync')

      if (logId) {
        await supabase
          .from('allocation_sync_logs')
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
    console.log('\n💾 Step 3/3: Upserting allocation history to Supabase...')

    let inserted = 0
    let updated = 0
    let errors = 0
    const errorMessages: string[] = []

    // Get existing records for this period to count inserts vs updates
    const { data: existingRecords } = await supabase
      .from('allocation_history')
      .select('backoffice_provider_id')
      .eq('period_from', toPostgresDate(periodFrom))
      .eq('period_to', toPostgresDate(periodTo))

    const existingIds = new Set(existingRecords?.map(r => r.backoffice_provider_id) || [])
    console.log(`   Found ${existingIds.size} existing records for this period`)

    // Transform all data
    const allRecords = data.map(row => ({
      backoffice_provider_id: row.USER_ID,
      provider_name: row.PROVIDER_NAME,
      period_from: toPostgresDate(periodFrom),
      period_to: toPostgresDate(periodTo),
      requests_received: row.REQUESTS_RECEIVED || 0,
      requests_accepted: row.REQUESTS_ACCEPTED || 0,
      requests_expired: row['RESQUESTS_ EXPIRED'] || 0,
      requests_rejected: row.REQUESTS_REJECTED || 0,
      avg_response_time: parseTimeToInterval(row.AVG_RESPONSE_TIME),
      avg_response_time_raw: row.AVG_RESPONSE_TIME || null,
      synced_at: new Date().toISOString(),
    }))

    // Count inserts vs updates
    for (const r of allRecords) {
      if (existingIds.has(r.backoffice_provider_id)) {
        updated++
      } else {
        inserted++
      }
    }

    // Process in batches using upsert
    const BATCH_SIZE = 100

    for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
      const batch = allRecords.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(allRecords.length / BATCH_SIZE)

      console.log(`   Upserting batch ${batchNum}/${totalBatches} (${batch.length} records)...`)

      const { error: upsertError } = await supabase
        .from('allocation_history')
        .upsert(batch, {
          onConflict: 'backoffice_provider_id,period_from,period_to',
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
        .from('allocation_sync_logs')
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
    console.log('✅ ALLOCATION HISTORY SYNC COMPLETED!')
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
        .from('allocation_sync_logs')
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
