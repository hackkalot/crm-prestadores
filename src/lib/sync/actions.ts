'use server'

import { runScrapper } from '../../../scripts/export-backoffice-data'
import { runBillingScrapper } from '../../../scripts/export-billing-data'
import { runClientsScrapper } from '../../../scripts/export-clients-data'
import { runRecurrencesScrapper } from '../../../scripts/export-recurrences-data'
import { runTasksScrapper } from '../../../scripts/export-tasks-data'
import * as XLSX from 'xlsx'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface SyncResult {
  success: boolean
  error?: string
  recordsProcessed?: number
  recordsInserted?: number
  recordsUpdated?: number
  filePath?: string
}

/**
 * Sync backoffice data using UI automation (Puppeteer + Excel export)
 *
 * @param dateFrom Format: dd-mm-yyyy (ex: 01-01-2026)
 * @param dateTo Format: dd-mm-yyyy (ex: 09-01-2026)
 */
export async function syncBackofficeData(
  dateFrom: string,
  dateTo: string,
  userId?: string
): Promise<SyncResult> {
  const startTime = Date.now()
  let logId: string | null = null

  try {
    const adminClient = createAdminClient()

    // Create log entry (in_progress)
    const { data: logEntry, error: logError } = await adminClient
      .from('sync_logs')
      .insert({
        triggered_by: userId || 'system',
        date_from: convertToISODate(dateFrom),
        date_to: convertToISODate(dateTo),
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (!logError && logEntry) {
      logId = logEntry.id
    }

    console.log(`🚀 Starting backoffice sync: ${dateFrom} to ${dateTo}`)

    // Step 1: Run scrapper to get Excel file
    console.log('📥 Step 1/3: Running scrapper to export Excel...')
    const scrapperResult = await runScrapper({
      dateFrom,
      dateTo,
      headless: true,
    })

    if (!scrapperResult.success || !scrapperResult.filePath) {
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update log with error
      if (logId) {
        await adminClient
          .from('sync_logs')
          .update({
            status: 'error',
            error_message: scrapperResult.error || 'Scrapper failed without error message',
            duration_seconds: duration,
          })
          .eq('id', logId)
      }

      return {
        success: false,
        error: scrapperResult.error || 'Scrapper failed without error message',
      }
    }

    console.log(`✅ Excel downloaded: ${scrapperResult.filePath}`)

    // Step 2: Parse Excel to JSON
    console.log('📊 Step 2/3: Parsing Excel file...')

    // Import fs module for file operations
    const fs = await import('fs')

    // Verify file exists and is readable
    if (!fs.existsSync(scrapperResult.filePath)) {
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update log with error
      if (logId) {
        await adminClient
          .from('sync_logs')
          .update({
            status: 'error',
            error_message: `Excel file not found at: ${scrapperResult.filePath}`,
            duration_seconds: duration,
          })
          .eq('id', logId)
      }

      return {
        success: false,
        error: `Excel file not found at: ${scrapperResult.filePath}`,
      }
    }

    // Read file as buffer first (more reliable than readFile)
    const fileBuffer = fs.readFileSync(scrapperResult.filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    console.log(`✅ Parsed ${data.length} records from Excel`)

    if (data.length === 0) {
      return {
        success: true,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        filePath: scrapperResult.filePath,
      }
    }

    // Get file size
    const fileStats = fs.statSync(scrapperResult.filePath)
    const fileSizeKB = Math.round(fileStats.size / 1024)

    // Step 3: Transform and upsert to Supabase
    console.log('💾 Step 3/3: Upserting to Supabase...')

    // Transform Excel columns to database schema
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

    // Upsert records (on conflict update)
    const { data: upsertedData, error: upsertError } = await adminClient
      .from('service_requests')
      .upsert(transformedRecords, {
        onConflict: 'request_code',
        ignoreDuplicates: false,
      })
      .select('request_code')

    if (upsertError) {
      console.error('❌ Upsert error:', upsertError)
      return {
        success: false,
        error: `Database error: ${upsertError.message}`,
        recordsProcessed: data.length,
      }
    }

    console.log(`✅ Upserted ${transformedRecords.length} records to Supabase`)

    // Calculate duration
    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with success
    if (logId) {
      await adminClient
        .from('sync_logs')
        .update({
          status: 'success',
          duration_seconds: duration,
          records_processed: data.length,
          records_inserted: transformedRecords.length,
          records_updated: 0, // Can't distinguish with upsert
          excel_file_path: scrapperResult.filePath,
          excel_file_size_kb: fileSizeKB,
        })
        .eq('id', logId)
    }

    // Revalidate relevant paths
    revalidatePath('/')
    revalidatePath('/candidaturas')
    revalidatePath('/prestadores')
    revalidatePath('/pedidos')

    return {
      success: true,
      recordsProcessed: data.length,
      recordsInserted: transformedRecords.length,
      recordsUpdated: 0, // Can't distinguish with upsert
      filePath: scrapperResult.filePath,
    }
  } catch (error: any) {
    console.error('❌ Sync error:', error)

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with error
    if (logId) {
      const adminClient = createAdminClient()
      await adminClient
        .from('sync_logs')
        .update({
          status: 'error',
          error_message: error.message || 'Unknown error during sync',
          error_stack: error.stack,
          duration_seconds: duration,
        })
        .eq('id', logId)
    }

    return {
      success: false,
      error: error.message || 'Unknown error during sync',
    }
  }
}

/**
 * Helper to convert dd-mm-yyyy to ISO date (yyyy-mm-dd)
 */
function convertToISODate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split('-')
  return `${year}-${month}-${day}`
}

/**
 * Convert Excel serial date to ISO string
 * Excel stores dates as numbers (days since 1900-01-01)
 * Returns null for invalid values
 */
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

/**
 * Sync billing processes data using UI automation (Puppeteer + Excel export)
 * No date filters - exports all billing data
 */
export async function syncBillingData(userId?: string): Promise<SyncResult> {
  const startTime = Date.now()
  let logId: string | null = null

  try {
    const adminClient = createAdminClient()

    // Create log entry (in_progress)
    const { data: logEntry, error: logError } = await adminClient
      .from('billing_sync_logs')
      .insert({
        triggered_by: userId || null,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (!logError && logEntry) {
      logId = logEntry.id
    }

    console.log(`🚀 Starting billing processes sync`)

    // Step 1: Run scrapper to get Excel file
    console.log('📥 Step 1/3: Running billing scrapper to export Excel...')
    const scrapperResult = await runBillingScrapper({
      headless: true,
    })

    if (!scrapperResult.success || !scrapperResult.filePath) {
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update log with error
      if (logId) {
        await adminClient
          .from('billing_sync_logs')
          .update({
            status: 'error',
            error_message:
              scrapperResult.error || 'Scrapper failed without error message',
            duration_seconds: duration,
          })
          .eq('id', logId)
      }

      return {
        success: false,
        error: scrapperResult.error || 'Scrapper failed without error message',
      }
    }

    console.log(`✅ Excel downloaded: ${scrapperResult.filePath}`)

    // Step 2: Parse Excel to JSON
    console.log('📊 Step 2/3: Parsing Excel file...')

    // Import fs module for file operations
    const fs = await import('fs')

    // Verify file exists and is readable
    if (!fs.existsSync(scrapperResult.filePath)) {
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update log with error
      if (logId) {
        await adminClient
          .from('billing_sync_logs')
          .update({
            status: 'error',
            error_message: `Excel file not found at: ${scrapperResult.filePath}`,
            duration_seconds: duration,
          })
          .eq('id', logId)
      }

      return {
        success: false,
        error: `Excel file not found at: ${scrapperResult.filePath}`,
      }
    }

    // Read file as buffer first (more reliable than readFile)
    const fileBuffer = fs.readFileSync(scrapperResult.filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    console.log(`✅ Parsed ${data.length} billing records from Excel`)

    if (data.length === 0) {
      return {
        success: true,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        filePath: scrapperResult.filePath,
      }
    }

    // Get file size
    const fileStats = fs.statSync(scrapperResult.filePath)
    const fileSizeKB = Math.round(fileStats.size / 1024)

    // Step 3: Transform and upsert to Supabase
    console.log('💾 Step 3/3: Upserting billing processes to Supabase...')

    // Transform Excel columns to database schema
    const transformedRecords = data.map((row: any) => ({
      request_code: row.REQUEST_CODE,
      service_request_identifier: row['Service Request Identifier'] || null,
      assigned_provider_name: row.ASSIGNED_PROVIDER_NAME || null,
      service: row.SERVICE || null,
      scheduled_to: row.SCHEDULED_TO
        ? excelDateToISO(row.SCHEDULED_TO)
        : null,
      document_date: row.DOCUMENT_DATE
        ? excelDateToISO(row.DOCUMENT_DATE)
        : null,
      bo_validation_date: row.BO_VALIDATION_DATE
        ? excelDateToISO(row.BO_VALIDATION_DATE)
        : null,
      payment_date: row.PAYMENT_DATE
        ? excelDateToISO(row.PAYMENT_DATE)
        : null,
      timestamp_process_status: row.TIMESTAMP_PROCESS_STATUS
        ? excelDateToISO(row.TIMESTAMP_PROCESS_STATUS)
        : null,
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

    // Upsert records in batches
    const BATCH_SIZE = 500
    let totalUpserted = 0

    for (let i = 0; i < transformedRecords.length; i += BATCH_SIZE) {
      const batch = transformedRecords.slice(i, i + BATCH_SIZE)

      const { error: upsertError } = await adminClient
        .from('billing_processes')
        .upsert(batch, {
          onConflict: 'request_code',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error(`❌ Upsert error in batch ${i / BATCH_SIZE + 1}:`, upsertError)
        throw new Error(`Database error: ${upsertError.message}`)
      }

      totalUpserted += batch.length
    }

    console.log(`✅ Upserted ${totalUpserted} billing records to Supabase`)

    // Calculate duration
    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with success
    if (logId) {
      await adminClient
        .from('billing_sync_logs')
        .update({
          status: 'success',
          duration_seconds: duration,
          records_processed: data.length,
          records_inserted: totalUpserted,
          records_updated: 0, // Can't distinguish with upsert
          excel_file_path: scrapperResult.filePath,
          excel_file_size_kb: fileSizeKB,
        })
        .eq('id', logId)
    }

    // Revalidate relevant paths
    revalidatePath('/')
    revalidatePath('/faturacao')

    return {
      success: true,
      recordsProcessed: data.length,
      recordsInserted: totalUpserted,
      recordsUpdated: 0, // Can't distinguish with upsert
      filePath: scrapperResult.filePath,
    }
  } catch (error: any) {
    console.error('❌ Billing sync error:', error)

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with error
    if (logId) {
      const adminClient = createAdminClient()
      await adminClient
        .from('billing_sync_logs')
        .update({
          status: 'error',
          error_message: error.message || 'Unknown error during sync',
          error_stack: error.stack,
          duration_seconds: duration,
        })
        .eq('id', logId)
    }

    return {
      success: false,
      error: error.message || 'Unknown error during sync',
    }
  }
}

/**
 * Sync clients data using UI automation (Puppeteer + Excel export)
 * No date filters - exports all client data
 */
export async function syncClientsData(userId?: string): Promise<SyncResult> {
  const startTime = Date.now()
  let logId: string | null = null

  try {
    const adminClient = createAdminClient()

    // Create log entry (in_progress)
    const { data: logEntry, error: logError } = await adminClient
      .from('clients_sync_logs')
      .insert({
        triggered_by: userId || null,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (!logError && logEntry) {
      logId = logEntry.id
    }

    console.log(`🚀 Starting clients sync`)

    // Step 1: Run scrapper to get Excel file
    console.log('📥 Step 1/3: Running clients scrapper to export Excel...')
    const scrapperResult = await runClientsScrapper({
      headless: true,
    })

    if (!scrapperResult.success || !scrapperResult.filePath) {
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update log with error
      if (logId) {
        await adminClient
          .from('clients_sync_logs')
          .update({
            status: 'error',
            error_message:
              scrapperResult.error || 'Scrapper failed without error message',
            duration_seconds: duration,
          })
          .eq('id', logId)
      }

      return {
        success: false,
        error: scrapperResult.error || 'Scrapper failed without error message',
      }
    }

    console.log(`✅ Excel downloaded: ${scrapperResult.filePath}`)

    // Step 2: Parse Excel to JSON
    console.log('📊 Step 2/3: Parsing Excel file...')

    // Import fs module for file operations
    const fs = await import('fs')

    // Verify file exists and is readable
    if (!fs.existsSync(scrapperResult.filePath)) {
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update log with error
      if (logId) {
        await adminClient
          .from('clients_sync_logs')
          .update({
            status: 'error',
            error_message: `Excel file not found at: ${scrapperResult.filePath}`,
            duration_seconds: duration,
          })
          .eq('id', logId)
      }

      return {
        success: false,
        error: `Excel file not found at: ${scrapperResult.filePath}`,
      }
    }

    // Read file as buffer first (more reliable than readFile)
    const fileBuffer = fs.readFileSync(scrapperResult.filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    console.log(`✅ Parsed ${data.length} client records from Excel`)

    if (data.length === 0) {
      return {
        success: true,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        filePath: scrapperResult.filePath,
      }
    }

    // Get file size
    const fileStats = fs.statSync(scrapperResult.filePath)
    const fileSizeKB = Math.round(fileStats.size / 1024)

    // Step 3: Transform and upsert to Supabase
    console.log('💾 Step 3/3: Upserting clients to Supabase...')

    // Helper functions for parsing
    const parseBoolean = (value: unknown): boolean => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'number') return value === 1
      if (typeof value === 'string') {
        const lower = value.toLowerCase().trim()
        return lower === 'sim' || lower === 'yes' || lower === 'true' || lower === '1'
      }
      return false
    }

    const parseNumber = (value: unknown): number => {
      if (typeof value === 'number') return value
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(',', '.'))
        return isNaN(parsed) ? 0 : parsed
      }
      return 0
    }

    const parseInt2 = (value: unknown): number => {
      if (typeof value === 'number') return Math.floor(value)
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10)
        return isNaN(parsed) ? 0 : parsed
      }
      return 0
    }

    // Transform Excel columns to database schema
    const transformedRecords = data.map((row: any) => ({
      user_id: String(row.USER_ID || ''),
      name: row.NAME || null,
      surname: row.SURNAME || null,
      email: row.EMAIL || null,
      phone: row.PHONE || null,
      vat: row.VAT || null,
      first_request: row.FIRST_REQUEST ? excelDateToISO(row.FIRST_REQUEST) : null,
      last_request: row.LAST_REQUEST ? excelDateToISO(row.LAST_REQUEST) : null,
      total_requests: parseInt2(row.TOTAL_REQUESTS),
      active_requests: parseInt2(row.ACTIVE_REQUESTS),
      cancelled_requests: parseInt2(row.CANCELLED_REQUESTS),
      completed_requests: parseInt2(row.COMPLETED_REQUESTS),
      expired_requests: parseInt2(row.EXPIRED_REQUESTS),
      customer_balance: parseNumber(row.CUSTOMER_BALANCE),
      total_payments: parseNumber(row.TOTAL_PAYMENTS),
      total_discounts: parseNumber(row.TOTAL_DISCOUNTS),
      registration: row.REGISTRATION ? excelDateToISO(row.REGISTRATION) : null,
      last_update: row.LAST_UPDATE ? excelDateToISO(row.LAST_UPDATE) : null,
      updated_by: row.UPDATED_BY || null,
      last_login: row.LAST_LOGIN ? excelDateToISO(row.LAST_LOGIN) : null,
      marketing_consent: parseBoolean(row.MARKETING_CONSENT),
      marketing_consent_timestamp: row.MARKETING_CONSENT_TIMESTAMP ? excelDateToISO(row.MARKETING_CONSENT_TIMESTAMP) : null,
      client_status: row.CLIENT_STATUS || null,
      cancellation_reason: row.CANCELLATION_REASON || null,
      status_updated_at: row.STATUS_UPDATED_AT ? excelDateToISO(row.STATUS_UPDATED_AT) : null,
      status_updated_by: row.STATUS_UPDATED_BY || null,
      airship: row.AIRSHIP || null,
      current_wallet_amount: parseNumber(row.CURRENT_WALLET_AMOUNT),
      wallet_is_active: parseBoolean(row.WALLET_IS_ACTIVE),
      total_wallet_benefits: parseNumber(row.TOTAL_WALLET_BENEFITS),
      total_wallet_payments: parseNumber(row.TOTAL_WALLET_PAYMENTS),
      last_wallet_payment: row.LAST_WALLET_PAYMENT ? excelDateToISO(row.LAST_WALLET_PAYMENT) : null,
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
    const validRecords = transformedRecords.filter(r => r.user_id && r.user_id !== '')

    // Deduplicate by user_id (keep the last occurrence - most recent data)
    const deduplicatedRecords = Array.from(
      validRecords.reduce((map, record) => {
        map.set(record.user_id, record)
        return map
      }, new Map<string, typeof validRecords[0]>()).values()
    )

    console.log(`📊 Deduplicated: ${validRecords.length} → ${deduplicatedRecords.length} unique clients`)

    // Upsert records in batches
    const BATCH_SIZE = 500
    let totalUpserted = 0

    for (let i = 0; i < deduplicatedRecords.length; i += BATCH_SIZE) {
      const batch = deduplicatedRecords.slice(i, i + BATCH_SIZE)

      const { error: upsertError } = await adminClient
        .from('clients')
        .upsert(batch, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error(`❌ Upsert error in batch ${i / BATCH_SIZE + 1}:`, upsertError)
        throw new Error(`Database error: ${upsertError.message}`)
      }

      totalUpserted += batch.length
    }

    console.log(`✅ Upserted ${totalUpserted} client records to Supabase`)

    // Calculate duration
    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with success
    if (logId) {
      await adminClient
        .from('clients_sync_logs')
        .update({
          status: 'success',
          duration_seconds: duration,
          records_processed: data.length,
          records_inserted: totalUpserted,
          records_updated: 0, // Can't distinguish with upsert
          excel_file_path: scrapperResult.filePath,
          excel_file_size_kb: fileSizeKB,
        })
        .eq('id', logId)
    }

    // Revalidate relevant paths
    revalidatePath('/')
    revalidatePath('/clientes')

    return {
      success: true,
      recordsProcessed: data.length,
      recordsInserted: totalUpserted,
      recordsUpdated: 0, // Can't distinguish with upsert
      filePath: scrapperResult.filePath,
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error('Clients sync error:', err)

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with error
    if (logId) {
      const adminClient = createAdminClient()
      await adminClient
        .from('clients_sync_logs')
        .update({
          status: 'error',
          error_message: err.message || 'Unknown error during sync',
          error_stack: err.stack,
          duration_seconds: duration,
        })
        .eq('id', logId)
    }

    return {
      success: false,
      error: err.message || 'Unknown error during sync',
    }
  }
}

/**
 * Sync recurrences data using UI automation (Puppeteer + Excel export)
 * No date filters - exports all recurrence data
 */
export async function syncRecurrencesData(userId?: string): Promise<SyncResult> {
  const startTime = Date.now()
  let logId: string | null = null

  try {
    const adminClient = createAdminClient()

    // Create log entry (in_progress)
    const { data: logEntry, error: logError } = await adminClient
      .from('recurrences_sync_logs')
      .insert({
        triggered_by: userId || null,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (!logError && logEntry) {
      logId = logEntry.id
    }

    console.log(`Starting recurrences sync`)

    // Step 1: Run scrapper to get Excel file
    console.log('Step 1/3: Running recurrences scrapper to export Excel...')
    const scrapperResult = await runRecurrencesScrapper({
      headless: true,
    })

    if (!scrapperResult.success || !scrapperResult.filePath) {
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update log with error
      if (logId) {
        await adminClient
          .from('recurrences_sync_logs')
          .update({
            status: 'error',
            error_message:
              scrapperResult.error || 'Scrapper failed without error message',
            duration_seconds: duration,
          })
          .eq('id', logId)
      }

      return {
        success: false,
        error: scrapperResult.error || 'Scrapper failed without error message',
      }
    }

    console.log(`Excel downloaded: ${scrapperResult.filePath}`)

    // Step 2: Parse Excel to JSON
    console.log('Step 2/3: Parsing Excel file...')

    // Import fs module for file operations
    const fs = await import('fs')

    // Verify file exists and is readable
    if (!fs.existsSync(scrapperResult.filePath)) {
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update log with error
      if (logId) {
        await adminClient
          .from('recurrences_sync_logs')
          .update({
            status: 'error',
            error_message: `Excel file not found at: ${scrapperResult.filePath}`,
            duration_seconds: duration,
          })
          .eq('id', logId)
      }

      return {
        success: false,
        error: `Excel file not found at: ${scrapperResult.filePath}`,
      }
    }

    // Read file as buffer first (more reliable than readFile)
    const fileBuffer = fs.readFileSync(scrapperResult.filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[]

    console.log(`Parsed ${data.length} recurrence records from Excel`)

    if (data.length === 0) {
      return {
        success: true,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        filePath: scrapperResult.filePath,
      }
    }

    // Get file size
    const fileStats = fs.statSync(scrapperResult.filePath)
    const fileSizeKB = Math.round(fileStats.size / 1024)

    // Step 3: Transform and upsert to Supabase
    console.log('Step 3/3: Upserting recurrences to Supabase...')

    // Helper functions for parsing
    const parseBoolean = (value: unknown): boolean => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'number') return value === 1
      if (typeof value === 'string') {
        const lower = value.toLowerCase().trim()
        return lower === 'sim' || lower === 'yes' || lower === 'true' || lower === '1'
      }
      return false
    }

    // Transform Excel columns to database schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedRecords = data.map((row: any) => ({
      recurrence_code: String(row.RECURRENCE_CODE || ''),
      recurrence_type: row.RECURRENCE_TYPE || null,
      recurrence_status: row.RECURRENCE_STATUS || null,
      submission_date: row.SUBMISSION_DATE ? excelDateToISO(row.SUBMISSION_DATE) : null,
      service: row.SERVICE || null,
      user_id: row.USER_ID ? String(row.USER_ID) : null,
      client_name: row.CLIENT_NAME || null,
      address_town: row.ADRESS_TOWN || null, // Note: typo in Excel header
      address_district: row.ADRESS_DISTRICT || null, // Note: typo in Excel header
      address_street: row.ADDRESS_STREET || null,
      source: row.SOURCE || null,
      flag_edit_schedule: parseBoolean(row.FLAG_EDIT_SCHEDULE),
      flag_edit_payment: parseBoolean(row.FLAG_EDIT_PAYMENT),
      inactivation_date: row.INATIVATION_DATE ? excelDateToISO(row.INATIVATION_DATE) : null,
      inactivation_reason: row.INATIVATION_REASON || null,
      inactivation_comment: row.INATIVATION_COMMENT || null,
      synced_at: new Date().toISOString(),
    }))

    // Filter out records without recurrence_code
    const validRecords = transformedRecords.filter(r => r.recurrence_code && r.recurrence_code !== '')

    // Deduplicate by recurrence_code (keep the last occurrence - most recent data)
    const deduplicatedRecords = Array.from(
      validRecords.reduce((map, record) => {
        map.set(record.recurrence_code, record)
        return map
      }, new Map<string, typeof validRecords[0]>()).values()
    )

    console.log(`Deduplicated: ${validRecords.length} -> ${deduplicatedRecords.length} unique recurrences`)

    // Upsert records in batches
    const BATCH_SIZE = 500
    let totalUpserted = 0

    for (let i = 0; i < deduplicatedRecords.length; i += BATCH_SIZE) {
      const batch = deduplicatedRecords.slice(i, i + BATCH_SIZE)

      const { error: upsertError } = await adminClient
        .from('recurrences')
        .upsert(batch, {
          onConflict: 'recurrence_code',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error(`Upsert error in batch ${i / BATCH_SIZE + 1}:`, upsertError)
        throw new Error(`Database error: ${upsertError.message}`)
      }

      totalUpserted += batch.length
    }

    console.log(`Upserted ${totalUpserted} recurrence records to Supabase`)

    // Calculate duration
    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with success
    if (logId) {
      await adminClient
        .from('recurrences_sync_logs')
        .update({
          status: 'success',
          duration_seconds: duration,
          records_processed: data.length,
          records_inserted: totalUpserted,
          records_updated: 0, // Can't distinguish with upsert
          excel_file_path: scrapperResult.filePath,
          excel_file_size_kb: fileSizeKB,
        })
        .eq('id', logId)
    }

    // Revalidate relevant paths
    revalidatePath('/')
    revalidatePath('/recorrencias')

    return {
      success: true,
      recordsProcessed: data.length,
      recordsInserted: totalUpserted,
      recordsUpdated: 0, // Can't distinguish with upsert
      filePath: scrapperResult.filePath,
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error('Recurrences sync error:', err)

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with error
    if (logId) {
      const adminClient = createAdminClient()
      await adminClient
        .from('recurrences_sync_logs')
        .update({
          status: 'error',
          error_message: err.message || 'Unknown error during sync',
          error_stack: err.stack,
          duration_seconds: duration,
        })
        .eq('id', logId)
    }

    return {
      success: false,
      error: err.message || 'Unknown error during sync',
    }
  }
}

/**
 * Sync tasks data using UI automation (Puppeteer + Excel export)
 * No date filters - exports all tasks data (after clearing default filters)
 */
export async function syncTasksData(userId?: string): Promise<SyncResult> {
  const startTime = Date.now()
  let logId: string | null = null

  try {
    const adminClient = createAdminClient()

    // Create log entry (in_progress)
    const { data: logEntry, error: logError } = await adminClient
      .from('tasks_sync_logs')
      .insert({
        triggered_by: userId || null,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (!logError && logEntry) {
      logId = logEntry.id
    }

    console.log(`Starting tasks sync`)

    // Step 1: Run scrapper to get Excel file
    console.log('Step 1/3: Running tasks scrapper to export Excel...')
    const scrapperResult = await runTasksScrapper({
      headless: true,
    })

    if (!scrapperResult.success || !scrapperResult.filePath) {
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update log with error
      if (logId) {
        await adminClient
          .from('tasks_sync_logs')
          .update({
            status: 'error',
            error_message:
              scrapperResult.error || 'Scrapper failed without error message',
            duration_seconds: duration,
          })
          .eq('id', logId)
      }

      return {
        success: false,
        error: scrapperResult.error || 'Scrapper failed without error message',
      }
    }

    console.log(`Excel downloaded: ${scrapperResult.filePath}`)

    // Step 2: Parse Excel to JSON
    console.log('Step 2/3: Parsing Excel file...')

    // Import fs module for file operations
    const fs = await import('fs')

    // Verify file exists and is readable
    if (!fs.existsSync(scrapperResult.filePath)) {
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Update log with error
      if (logId) {
        await adminClient
          .from('tasks_sync_logs')
          .update({
            status: 'error',
            error_message: `Excel file not found at: ${scrapperResult.filePath}`,
            duration_seconds: duration,
          })
          .eq('id', logId)
      }

      return {
        success: false,
        error: `Excel file not found at: ${scrapperResult.filePath}`,
      }
    }

    // Read file as buffer first (more reliable than readFile)
    const fileBuffer = fs.readFileSync(scrapperResult.filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[]

    console.log(`Parsed ${data.length} task records from Excel`)

    if (data.length === 0) {
      return {
        success: true,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        filePath: scrapperResult.filePath,
      }
    }

    // Get file size
    const fileStats = fs.statSync(scrapperResult.filePath)
    const fileSizeKB = Math.round(fileStats.size / 1024)

    // Step 3: Transform and upsert to Supabase
    console.log('Step 3/3: Upserting tasks to Supabase...')

    // Transform Excel columns to database schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedRecords = data.map((row: any) => ({
      task_id: String(row.TASK_ID || ''),
      task_type: row.TASK_TYPE || null,
      sr: row.SR || null,
      created_by: row.CREATED_BY || null,
      given_to: row.GIVEN_TO || null,
      creation_date: row.CREATION_DATE ? excelDateToISO(row.CREATION_DATE) : null,
      deadline: row.DEADLINE ? excelDateToISO(row.DEADLINE) : null,
      status: row.STATUS || null,
      finishing_date: row.FINISHING_DATE ? excelDateToISO(row.FINISHING_DATE) : null,
      finished_by: row.FINISHED_BY || null,
      assigned_provider: row.ASSIGNED_PROVIDER || null,
      scheduled_to: row.SCHEDULED_TO ? excelDateToISO(row.SCHEDULED_TO) : null,
      synced_at: new Date().toISOString(),
    }))

    // Filter out records without task_id
    const validRecords = transformedRecords.filter(r => r.task_id && r.task_id !== '')

    // Deduplicate by task_id (keep the last occurrence - most recent data)
    const deduplicatedRecords = Array.from(
      validRecords.reduce((map, record) => {
        map.set(record.task_id, record)
        return map
      }, new Map<string, typeof validRecords[0]>()).values()
    )

    console.log(`Deduplicated: ${validRecords.length} -> ${deduplicatedRecords.length} unique tasks`)

    // Upsert records in batches
    const BATCH_SIZE = 500
    let totalUpserted = 0

    for (let i = 0; i < deduplicatedRecords.length; i += BATCH_SIZE) {
      const batch = deduplicatedRecords.slice(i, i + BATCH_SIZE)

      const { error: upsertError } = await adminClient
        .from('tasks')
        .upsert(batch, {
          onConflict: 'task_id',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error(`Upsert error in batch ${i / BATCH_SIZE + 1}:`, upsertError)
        throw new Error(`Database error: ${upsertError.message}`)
      }

      totalUpserted += batch.length
    }

    console.log(`Upserted ${totalUpserted} task records to Supabase`)

    // Calculate duration
    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with success
    if (logId) {
      await adminClient
        .from('tasks_sync_logs')
        .update({
          status: 'success',
          duration_seconds: duration,
          records_processed: data.length,
          records_inserted: totalUpserted,
          records_updated: 0, // Can't distinguish with upsert
          excel_file_path: scrapperResult.filePath,
          excel_file_size_kb: fileSizeKB,
        })
        .eq('id', logId)
    }

    // Revalidate relevant paths
    revalidatePath('/')
    revalidatePath('/tarefas')

    return {
      success: true,
      recordsProcessed: data.length,
      recordsInserted: totalUpserted,
      recordsUpdated: 0, // Can't distinguish with upsert
      filePath: scrapperResult.filePath,
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error('Tasks sync error:', err)

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Update log with error
    if (logId) {
      const adminClient = createAdminClient()
      await adminClient
        .from('tasks_sync_logs')
        .update({
          status: 'error',
          error_message: err.message || 'Unknown error during sync',
          error_stack: err.stack,
          duration_seconds: duration,
        })
        .eq('id', logId)
    }

    return {
      success: false,
      error: err.message || 'Unknown error during sync',
    }
  }
}
