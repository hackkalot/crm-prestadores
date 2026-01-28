import { NextRequest, NextResponse } from 'next/server'
import { syncTasksData } from '@/lib/sync/actions'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/sync/tasks
 *
 * Trigger manual sync of tasks data (local development only)
 * No body required - exports all task data
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
    console.log(`API: Starting tasks sync (user: ${user.email})`)
    const result = await syncTasksData(user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.recordsProcessed} task records`,
      data: {
        recordsProcessed: result.recordsProcessed,
        recordsInserted: result.recordsInserted,
        recordsUpdated: result.recordsUpdated,
        filePath: result.filePath,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('API tasks sync error:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
