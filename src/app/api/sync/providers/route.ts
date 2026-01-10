import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runProvidersScrapper } from '../../../../../scripts/export-providers-data'
import { importProvidersFromExcel } from '@/lib/providers-sync/import'
import fs from 'fs'

/**
 * POST /api/sync/providers
 *
 * Trigger sync of providers from backoffice
 * 1. Scrapes provider data from backoffice
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

    const admin = createAdminClient()

    // Create sync log entry
    const { data: logData, error: logError } = await admin
      .from('provider_sync_logs')
      .insert({
        triggered_by: user.id,
        triggered_at: new Date().toISOString(),
        status: 'in_progress',
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

    console.log(`🚀 Starting providers sync (user: ${user.email})`)

    // Step 1: Run scrapper (headless mode)
    console.log('📥 Step 1: Scraping providers from backoffice...')
    const scrapperResult = await runProvidersScrapper({ headless: true })

    if (!scrapperResult.success) {
      const errorMsg = scrapperResult.error || 'Scrapper failed'

      // Update log with error
      if (logId) {
        await admin
          .from('provider_sync_logs')
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
    console.log('📤 Step 2: Importing providers to database...')
    const importResult = await importProvidersFromExcel(scrapperResult.filePath)

    const durationSeconds = Math.round((Date.now() - startTime) / 1000)

    // Update log with results
    if (logId) {
      await admin
        .from('provider_sync_logs')
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
      message: `Synced ${importResult.totalProcessed} providers`,
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
    console.error('❌ Provider sync error:', error)

    // Update log with error
    if (logId) {
      const admin = createAdminClient()
      await admin
        .from('provider_sync_logs')
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
