/**
 * Standalone script for GitHub Actions to sync providers data
 *
 * This script:
 * 1. Runs Puppeteer scrapper to download Excel from backoffice
 * 2. Parses Excel file
 * 3. Upserts providers to Supabase
 *
 * Environment variables required:
 * - BACKOFFICE_USERNAME
 * - BACKOFFICE_PASSWORD
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - PUPPETEER_EXECUTABLE_PATH (set by workflow)
 */

import { runProvidersScrapper } from './export-providers-data'
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
  'RESQUESTS_ EXPIRED': number
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

/**
 * Main sync function
 */
async function main() {
  const startTime = Date.now()
  let logId: string | null = null

  console.log('═══════════════════════════════════════════════')
  console.log('🚀 GitHub Actions Providers Sync')
  console.log('═══════════════════════════════════════════════')

  try {
    // Create sync log entry
    const { data: logEntry, error: logError } = await supabase
      .from('provider_sync_logs')
      .insert({
        triggered_by: 'github-actions',
        triggered_at: new Date().toISOString(),
        status: 'in_progress',
        records_processed: 0,
        records_inserted: 0,
        records_updated: 0,
      })
      .select('id')
      .single()

    if (!logError && logEntry) {
      logId = logEntry.id
      console.log(`📝 Created sync log: ${logId}`)
    }

    // Step 1: Run scrapper
    console.log('\n📥 Step 1/3: Running providers scrapper...')
    const scrapperResult = await runProvidersScrapper({ headless: true })

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
    const data = XLSX.utils.sheet_to_json(worksheet) as BackofficeProvider[]

    console.log(`✅ Parsed ${data.length} providers from Excel`)

    if (data.length === 0) {
      console.log('⚠️ No providers to sync')

      if (logId) {
        await supabase
          .from('provider_sync_logs')
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
    console.log('\n💾 Step 3/3: Upserting providers to Supabase...')

    let inserted = 0
    let updated = 0
    let errors = 0
    const errorMessages: string[] = []

    // Process in batches
    const BATCH_SIZE = 50

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(data.length / BATCH_SIZE)

      console.log(`   Processing batch ${batchNum}/${totalBatches} (${batch.length} providers)...`)

      for (const row of batch) {
        try {
          const providerData = {
            backoffice_id: row.USER_ID,
            name: row.NAME,
            email: row.EMAIL?.toLowerCase(),
            phone: cleanPhone(row.PHONE),
            nif: row.VAT,
            entity_type: 'tecnico' as const, // Default, can be updated later
            categories: parseToArray(row.CATEGORIES),
            services: parseToArray(row.SERVICES),
            counties: parseToArray(row.COUNTIES),
            districts: parseToArray(row.DISTRICTS),
            status: mapBackofficeStatus(row.PROVIDER_STATUS),
            backoffice_status: row.PROVIDER_STATUS,
            is_active_backoffice: row['IS_ACTIVE?'] || false,
            password_defined: row.PASSWORD_DEFINED || false,
            do_recurrence: row.DO_RECURRENCE || false,
            // Stats
            total_requests: row.TOTAL_REQUESTS || 0,
            active_requests: row.ACTIVE_REQUESTS || 0,
            cancelled_requests: row.CANCELLED_REQUESTS || 0,
            completed_requests: row.COMPLETED_REQUESTS || 0,
            requests_received: row.REQUESTS_RECEIVED || 0,
            requests_accepted: row.REQUESTS_ACCEPTED || 0,
            requests_expired: row['RESQUESTS_ EXPIRED'] || 0,
            requests_rejected: row.REQUESTS_REJECTED || 0,
            // Ratings
            service_rating: row.SERVICE_RATING || 0,
            technician_rating: row.TECHNICIAN_RATING || 0,
            // Timestamps
            last_login: excelDateToISO(row.LAST_LOGIN),
            backoffice_created_at: excelDateToISO(row.CREATED_AT),
            backoffice_updated_at: excelDateToISO(row.LAST_UPDATE),
            status_updated_at: excelDateToISO(row.STATUS_UPDATED_AT),
            // Sync metadata
            last_synced_at: new Date().toISOString(),
          }

          // Check if provider exists
          const { data: existing } = await supabase
            .from('providers')
            .select('id')
            .eq('backoffice_id', row.USER_ID)
            .single()

          if (existing) {
            // Update
            const { error: updateError } = await supabase
              .from('providers')
              .update(providerData)
              .eq('backoffice_id', row.USER_ID)

            if (updateError) {
              throw updateError
            }
            updated++
          } else {
            // Insert
            const { error: insertError } = await supabase
              .from('providers')
              .insert(providerData)

            if (insertError) {
              throw insertError
            }
            inserted++
          }
        } catch (err: any) {
          errors++
          const errMsg = `Error processing ${row.EMAIL}: ${err.message}`
          errorMessages.push(errMsg)
          if (errors <= 5) {
            console.error(`   ❌ ${errMsg}`)
          }
        }
      }
    }

    if (errors > 5) {
      console.error(`   ... and ${errors - 5} more errors`)
    }

    const totalProcessed = inserted + updated + errors
    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with success
    if (logId) {
      await supabase
        .from('provider_sync_logs')
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
    console.log('✅ PROVIDERS SYNC COMPLETED!')
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
        .from('provider_sync_logs')
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
