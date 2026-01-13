import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAllocationHistoryScrapper } from '../../../../../scripts/export-allocation-history'
import { importAllocationHistoryFromExcel } from '@/lib/allocation-sync/import'
import fs from 'fs'

/**
 * POST /api/sync/allocation-history
 *
 * Trigger sync of allocation history from backoffice (localhost only)
 * 1. Scrapes allocation history data from backoffice
 * 2. Imports the Excel into database
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let logId: string | null = null

  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body for dates
    let dateFrom: string
    let dateTo: string

    try {
      const body = await request.json()
      dateFrom = body.dateFrom
      dateTo = body.dateTo
    } catch {
      // Default: last year to today
      const today = new Date()
      const oneYearAgo = new Date(today)
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      dateFrom = formatDate(oneYearAgo)
      dateTo = formatDate(today)
    }

    const admin = createAdminClient()

    // Create sync log entry
    const { data: logData, error: logError } = await admin
      .from('allocation_sync_logs')
      .insert({
        triggered_by: user.id,
        triggered_at: new Date().toISOString(),
        status: 'in_progress',
        period_from: toPostgresDate(dateFrom),
        period_to: toPostgresDate(dateTo),
        records_processed: 0,
        records_inserted: 0,
        records_updated: 0,
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Error creating sync log:', logError)
    } else {
      logId = logData.id
    }

    console.log(`🚀 Starting allocation history sync (user: ${user.email}, period: ${dateFrom} to ${dateTo})`)

    // Step 1: Run scrapper (headless mode)
    console.log('📥 Step 1: Scraping allocation history from backoffice...')
    const scrapperResult = await runAllocationHistoryScrapper({
      dateFrom,
      dateTo,
      headless: true
    })

    if (!scrapperResult.success) {
      const errorMsg = scrapperResult.error || 'Scrapper failed'

      // Update log with error
      if (logId) {
        await admin
          .from('allocation_sync_logs')
          .update({
            status: 'error',
            error_message: errorMsg,
            duration_seconds: Math.round((Date.now() - startTime) / 1000),
          })
          .eq('id', logId)
      }

      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      )
    }

    console.log(`✅ Scrapper completed: ${scrapperResult.filePath}`)

    // Get file size
    let fileSizeKb = 0
    if (scrapperResult.filePath && fs.existsSync(scrapperResult.filePath)) {
      const stats = fs.statSync(scrapperResult.filePath)
      fileSizeKb = Math.round(stats.size / 1024)
    }

    // Step 2: Import to database
    console.log('📤 Step 2: Importing allocation history to database...')
    const importResult = await importAllocationHistoryFromExcel(scrapperResult.filePath, {
      periodFrom: toPostgresDate(dateFrom),
      periodTo: toPostgresDate(dateTo),
    })

    const durationSeconds = Math.round((Date.now() - startTime) / 1000)

    // Update log with results
    if (logId) {
      await admin
        .from('allocation_sync_logs')
        .update({
          status: importResult.success ? 'success' : 'error',
          duration_seconds: durationSeconds,
          records_processed: importResult.totalProcessed,
          records_inserted: importResult.inserted,
          records_updated: importResult.updated,
          excel_file_path: scrapperResult.filePath,
          excel_file_size_kb: fileSizeKb,
          error_message: importResult.errors > 0 ? `${importResult.errors} erros` : null,
          error_stack: importResult.errorMessages.length > 0 ? importResult.errorMessages.join('\n') : null,
        })
        .eq('id', logId)
    }

    console.log(`✅ Import completed: ${importResult.inserted} inserted, ${importResult.updated} updated`)

    return NextResponse.json({
      success: true,
      message: `Synced ${importResult.totalProcessed} allocation records`,
      data: {
        recordsProcessed: importResult.totalProcessed,
        recordsInserted: importResult.inserted,
        recordsUpdated: importResult.updated,
        errors: importResult.errors,
        durationSeconds,
        filePath: scrapperResult.filePath,
      },
    })

  } catch (error: any) {
    console.error('❌ Allocation history sync error:', error)

    // Update log with error
    if (logId) {
      const admin = createAdminClient()
      await admin
        .from('allocation_sync_logs')
        .update({
          status: 'error',
          error_message: error.message || 'Unknown error',
          error_stack: error.stack,
          duration_seconds: Math.round((Date.now() - startTime) / 1000),
        })
        .eq('id', logId)
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function toPostgresDate(dateStr: string): string {
  const [day, month, year] = dateStr.split('-')
  return `${year}-${month}-${day}`
}
