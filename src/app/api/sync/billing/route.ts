import { NextRequest, NextResponse } from 'next/server'
import { syncBillingData } from '@/lib/sync/actions'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/sync/billing
 *
 * Trigger manual sync of billing processes data (local development only)
 * No body required - exports all billing data
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication (any authenticated user can sync)
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run sync (pass user ID for logging)
    console.log(`🚀 API: Starting billing sync (user: ${user.email})`)
    const result = await syncBillingData(user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.recordsProcessed} billing records`,
      data: {
        recordsProcessed: result.recordsProcessed,
        recordsInserted: result.recordsInserted,
        recordsUpdated: result.recordsUpdated,
        filePath: result.filePath,
      },
    })
  } catch (error: any) {
    console.error('❌ API billing sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
