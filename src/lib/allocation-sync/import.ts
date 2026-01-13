import { createAdminClient } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'
import fs from 'fs'

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

export interface AllocationImportResult {
  success: boolean
  totalProcessed: number
  inserted: number
  updated: number
  errors: number
  errorMessages: string[]
}

export interface AllocationImportOptions {
  periodFrom: string  // Format: yyyy-mm-dd
  periodTo: string    // Format: yyyy-mm-dd
}

// Parse time string (HH:MM:SS) to PostgreSQL interval format
function parseTimeToInterval(timeStr: string | null | undefined): string | null {
  if (!timeStr || typeof timeStr !== 'string') return null

  // Already in HH:MM:SS format, PostgreSQL accepts this as interval
  const match = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})$/)
  if (!match) return null

  return timeStr
}

/**
 * Import allocation history from Excel file to Supabase
 */
export async function importAllocationHistoryFromExcel(
  filePath: string | undefined,
  options: AllocationImportOptions
): Promise<AllocationImportResult> {
  const result: AllocationImportResult = {
    success: false,
    totalProcessed: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    errorMessages: [],
  }

  if (!filePath) {
    result.errorMessages.push('File path is undefined')
    return result
  }

  if (!fs.existsSync(filePath)) {
    result.errorMessages.push(`File not found: ${filePath}`)
    return result
  }

  try {
    // Read and parse Excel
    const fileBuffer = fs.readFileSync(filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as BackofficeAllocationHistory[]

    if (data.length === 0) {
      result.success = true
      return result
    }

    const admin = createAdminClient()

    // Get existing records for this period to count inserts vs updates
    const { data: existingRecords } = await admin
      .from('allocation_history')
      .select('backoffice_provider_id')
      .eq('period_from', options.periodFrom)
      .eq('period_to', options.periodTo)

    const existingIds = new Set(existingRecords?.map(r => r.backoffice_provider_id) || [])

    // Transform all data
    const allRecords = data.map(row => ({
      backoffice_provider_id: row.USER_ID,
      provider_name: row.PROVIDER_NAME,
      period_from: options.periodFrom,
      period_to: options.periodTo,
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
        result.updated++
      } else {
        result.inserted++
      }
    }

    // Process in batches using upsert
    const BATCH_SIZE = 100

    for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
      const batch = allRecords.slice(i, i + BATCH_SIZE)

      const { error: upsertError } = await admin
        .from('allocation_history')
        .upsert(batch, {
          onConflict: 'backoffice_provider_id,period_from,period_to',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        result.errorMessages.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertError.message}`)
        result.errors += batch.length
        // Reset counts since we don't know which succeeded
        result.inserted = 0
        result.updated = 0
      }
    }

    result.totalProcessed = result.inserted + result.updated + result.errors
    result.success = result.errors === 0 || result.inserted + result.updated > 0

    return result

  } catch (error: any) {
    result.errorMessages.push(error.message || 'Unknown error')
    return result
  }
}
