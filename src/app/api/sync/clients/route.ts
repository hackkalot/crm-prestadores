import { NextRequest, NextResponse } from 'next/server'
import { syncClientsData } from '@/lib/sync/actions'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/sync/clients
 *
 * Trigger manual sync of clients data (local development only)
 * No body required - exports all client data
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
    console.log(`🚀 API: Starting clients sync (user: ${user.email})`)
    const result = await syncClientsData(user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.recordsProcessed} client records`,
      data: {
        recordsProcessed: result.recordsProcessed,
        recordsInserted: result.recordsInserted,
        recordsUpdated: result.recordsUpdated,
        filePath: result.filePath,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('❌ API clients sync error:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
