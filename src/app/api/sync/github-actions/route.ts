import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/sync/github-actions
 *
 * Triggers the GitHub Actions workflow to sync backoffice data.
 * This endpoint works in production (Vercel) by calling GitHub's API.
 *
 * Body:
 * {
 *   "dateFrom": "01-01-2026",  // dd-mm-yyyy
 *   "dateTo": "09-01-2026"     // dd-mm-yyyy
 * }
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

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_ACTIONS_TOKEN
    const githubRepo = process.env.GITHUB_REPO || 'hackkalot/crm-prestadores'

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub Actions not configured. Missing GITHUB_ACTIONS_TOKEN.' },
        { status: 500 }
      )
    }

    // Create sync log entry (pending)
    const adminClient = createAdminClient()

    // Convert dd-mm-yyyy to yyyy-mm-dd for database
    const [fromDay, fromMonth, fromYear] = dateFrom.split('-')
    const [toDay, toMonth, toYear] = dateTo.split('-')
    const dateFromISO = `${fromYear}-${fromMonth}-${fromDay}`
    const dateToISO = `${toYear}-${toMonth}-${toDay}`

    const { data: logEntry, error: logError } = await adminClient
      .from('sync_logs')
      .insert({
        triggered_by: user.id,
        date_from: dateFromISO,
        date_to: dateToISO,
        status: 'pending',
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Failed to create sync log:', logError)
    }

    // Trigger GitHub Actions workflow via repository_dispatch
    console.log(`🚀 Triggering GitHub Actions: ${dateFrom} to ${dateTo}`)

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
          event_type: 'sync-backoffice',
          client_payload: {
            date_from: dateFrom,
            date_to: dateTo,
            sync_log_id: logEntry?.id || null,
            triggered_by: user.email,
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
          .from('sync_logs')
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
        .from('sync_logs')
        .update({ status: 'in_progress' })
        .eq('id', logEntry.id)
    }

    return NextResponse.json({
      success: true,
      message: 'GitHub Actions workflow triggered successfully',
      data: {
        dateFrom,
        dateTo,
        syncLogId: logEntry?.id,
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
