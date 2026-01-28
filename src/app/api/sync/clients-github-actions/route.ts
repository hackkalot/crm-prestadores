import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/sync/clients-github-actions
 *
 * Triggers the GitHub Actions workflow to sync clients data.
 * This endpoint works in production (Vercel) by calling GitHub's API.
 *
 * No body required - clients sync exports all data (no date filters)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_ACTIONS_TOKEN
    const githubRepo = process.env.GITHUB_REPO || 'hackkalot/crm-prestadores'

    if (!githubToken) {
      return NextResponse.json(
        {
          error: 'GitHub Actions not configured. Missing GITHUB_ACTIONS_TOKEN.',
        },
        { status: 500 }
      )
    }

    // Create sync log entry (pending)
    const adminClient = createAdminClient()

    const { data: logEntry, error: logError } = await adminClient
      .from('clients_sync_logs')
      .insert({
        triggered_by: user.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Failed to create clients sync log:', logError)
    }

    // Trigger GitHub Actions workflow via repository_dispatch
    console.log(`🚀 Triggering GitHub Actions for clients sync`)

    const githubResponse = await fetch(
      `https://api.github.com/repos/${githubRepo}/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'sync-clients',
          client_payload: {
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
          .from('clients_sync_logs')
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
        .from('clients_sync_logs')
        .update({ status: 'in_progress' })
        .eq('id', logEntry.id)
    }

    return NextResponse.json({
      success: true,
      message: 'GitHub Actions workflow triggered successfully',
      data: {
        syncLogId: logEntry?.id,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
