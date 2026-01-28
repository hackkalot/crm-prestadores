/**
 * Standalone script for GitHub Actions to sync tasks data
 *
 * This script:
 * 1. Runs Puppeteer scrapper to download Excel from backoffice
 * 2. Parses Excel file
 * 3. Upserts tasks data directly to Supabase
 *
 * Environment variables required:
 * - BACKOFFICE_USERNAME
 * - BACKOFFICE_PASSWORD
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - PUPPETEER_EXECUTABLE_PATH (set by workflow)
 */

import { runTasksScrapper } from './export-tasks-data'
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
interface BackofficeTask {
  TASK_ID: string
  TASK_TYPE: string
  SR: string
  CREATED_BY: string
  GIVEN_TO: string
  CREATION_DATE: unknown
  DEADLINE: unknown
  STATUS: string
  FINISHING_DATE: unknown
  FINISHED_BY: string
  ASSIGNED_PROVIDER: string
  SCHEDULED_TO: unknown
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
  console.log('GitHub Actions Tasks Sync')
  console.log('===============================================')

  try {
    // Use existing log if provided (user triggered via CRM), otherwise create new (scheduled/manual)
    if (existingLogId && existingLogId !== 'null') {
      logId = existingLogId
      console.log(`Using existing sync log: ${logId}`)

      // Update status to in_progress
      await supabase
        .from('tasks_sync_logs')
        .update({ status: 'in_progress' })
        .eq('id', logId)
    } else {
      // Create new sync log entry (for scheduled runs)
      const { data: logEntry, error: logError } = await supabase
        .from('tasks_sync_logs')
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
    console.log('\nStep 1/3: Running tasks scrapper...')
    const scrapperResult = await runTasksScrapper({ headless: true })

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
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as BackofficeTask[]

    console.log(`Parsed ${data.length} task records from Excel`)

    if (data.length === 0) {
      console.log('No records to sync')

      if (logId) {
        await supabase
          .from('tasks_sync_logs')
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
    console.log('\nStep 3/3: Upserting tasks to Supabase...')

    let inserted = 0
    let updated = 0
    let errors = 0
    const errorMessages: string[] = []

    // Get existing records by task_id for counting inserts vs updates
    const { data: existingRecords } = await supabase
      .from('tasks')
      .select('task_id')

    const existingIds = new Set(existingRecords?.map(r => r.task_id) || [])
    console.log(`   Found ${existingIds.size} existing task records`)

    // Transform all data
    const allTasksData = data.map(row => ({
      task_id: String(row.TASK_ID || ''),
      task_type: row.TASK_TYPE || null,
      sr: row.SR || null,
      created_by: row.CREATED_BY || null,
      given_to: row.GIVEN_TO || null,
      creation_date: excelDateToISO(row.CREATION_DATE),
      deadline: excelDateToISO(row.DEADLINE),
      status: row.STATUS || null,
      finishing_date: excelDateToISO(row.FINISHING_DATE),
      finished_by: row.FINISHED_BY || null,
      assigned_provider: row.ASSIGNED_PROVIDER || null,
      scheduled_to: excelDateToISO(row.SCHEDULED_TO),
      synced_at: new Date().toISOString(),
    }))

    // Filter out records without task_id
    const validRecords = allTasksData.filter(r => r.task_id && r.task_id !== '')
    console.log(`   Valid records (with task_id): ${validRecords.length}/${allTasksData.length}`)

    // Deduplicate by task_id (keep the last occurrence)
    const deduplicatedRecords = Array.from(
      validRecords.reduce((map, record) => {
        map.set(record.task_id, record)
        return map
      }, new Map<string, typeof validRecords[0]>()).values()
    )
    console.log(`   Deduplicated: ${validRecords.length} -> ${deduplicatedRecords.length} unique tasks`)

    // Count inserts vs updates
    for (const record of deduplicatedRecords) {
      if (existingIds.has(record.task_id)) {
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
        .from('tasks')
        .upsert(batch, {
          onConflict: 'task_id',
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
        .from('tasks_sync_logs')
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
    console.log('TASKS SYNC COMPLETED!')
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
        .from('tasks_sync_logs')
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
