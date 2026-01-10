import { NextRequest, NextResponse } from 'next/server'
import { syncBackofficeData } from '@/lib/sync/actions'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/sync/backoffice
 *
 * Trigger manual sync of backoffice data
 *
 * Body:
 * {
 *   "dateFrom": "01-01-2026",  // dd-mm-yyyy
 *   "dateTo": "09-01-2026"     // dd-mm-yyyy
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication (any authenticated user can sync)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { dateFrom, dateTo } = body

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'Missing required fields: dateFrom, dateTo' },
        { status: 400 }
      )
    }

    // Validate date format (dd-mm-yyyy)
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/
    if (!dateRegex.test(dateFrom) || !dateRegex.test(dateTo)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected: dd-mm-yyyy' },
        { status: 400 }
      )
    }

    // Run sync (pass user ID for logging)
    console.log(`🚀 API: Starting sync ${dateFrom} to ${dateTo} (user: ${user.email})`)
    const result = await syncBackofficeData(dateFrom, dateTo, user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.recordsProcessed} records`,
      data: {
        recordsProcessed: result.recordsProcessed,
        recordsInserted: result.recordsInserted,
        recordsUpdated: result.recordsUpdated,
        filePath: result.filePath,
      },
    })
  } catch (error: any) {
    console.error('❌ API sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
