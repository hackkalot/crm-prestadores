import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/sync/allocation-history-github-actions
 *
 * Triggers the GitHub Actions workflow to sync allocation history data.
 * This endpoint works in production (Vercel) by calling GitHub's API.
 */
export async function POST(request: NextRequest) {
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
      // Default: full current month (1st to last day)
      // This ensures consistent periods for INSERT/UPDATE logic
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      dateFrom = formatDate(firstDayOfMonth)
      dateTo = formatDate(lastDayOfMonth)
    }

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_ACTIONS_TOKEN
    const githubRepo = process.env.GITHUB_REPO || 'hackkalot/crm-prestadores'

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub Actions not configured. Missing GITHUB_ACTIONS_TOKEN.' },
        { status: 500 }
      )
    }

    // Create sync log entry (pending) - with the actual user who triggered it
    const adminClient = createAdminClient()

    const { data: logEntry, error: logError } = await adminClient
      .from('allocation_sync_logs')
      .insert({
        triggered_by: user.id, // The actual user who clicked the button
        triggered_by_system: 'github-actions', // Executed via GitHub Actions
        triggered_at: new Date().toISOString(),
        status: 'pending',
        period_from: toPostgresDate(dateFrom),
        period_to: toPostgresDate(dateTo),
        records_processed: 0,
        records_inserted: 0,
        records_updated: 0,
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Failed to create allocation sync log:', logError)
    }

    // Trigger GitHub Actions workflow via repository_dispatch
    console.log('🚀 Triggering GitHub Actions: sync-allocation-history')

    const githubResponse = await fetch(
      `https://api.github.com/repos/${githubRepo}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'sync-allocation-history',
          client_payload: {
            sync_log_id: logEntry?.id || null,
            triggered_by: user.email,
            date_from: dateFrom,
            date_to: dateTo,
          },
        }),
      }
    )

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text()
      console.error('GitHub API error:', githubResponse.status, errorText)

      // Update log with error
      if (logEntry?.id) {
        await adminClient
          .from('allocation_sync_logs')
          .update({
            status: 'error',
            error_message: `GitHub API error: ${githubResponse.status}`,
          })
          .eq('id', logEntry.id)
      }

      return NextResponse.json(
        { error: `Failed to trigger GitHub Actions: ${githubResponse.status}` },
        { status: 500 }
      )
    }

    // Update log to in_progress
    if (logEntry?.id) {
      await adminClient
        .from('allocation_sync_logs')
        .update({ status: 'in_progress' })
        .eq('id', logEntry.id)
    }

    return NextResponse.json({
      success: true,
      message: 'GitHub Actions workflow triggered successfully',
      data: {
        syncLogId: logEntry?.id,
        dateFrom,
        dateTo,
      },
    })
  } catch (error: any) {
    console.error('❌ API error:', error)
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
