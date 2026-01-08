import { NextResponse } from 'next/server'
import {
  generateDeadlineAlerts,
  generateStalledTaskAlerts,
} from '@/lib/alerts/actions'
import { generatePriorityDeadlineAlerts } from '@/lib/priorities/actions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for alert generation

export async function GET(request: Request) {
  try {
    // Verificar CRON_SECRET para chamadas externas
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Permitir chamadas sem secret em desenvolvimento ou com secret válido em produção
    const isDev = process.env.NODE_ENV === 'development'
    const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isDev && cronSecret && !hasValidSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Gerar alertas de deadline
    const deadlineResult = await generateDeadlineAlerts()

    // Gerar alertas de tarefas paradas
    const stalledResult = await generateStalledTaskAlerts()

    // Gerar alertas de prioridades
    await generatePriorityDeadlineAlerts()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        deadline: deadlineResult,
        stalled: stalledResult,
        priorities: 'generated',
      },
    })
  } catch (error) {
    console.error('Error generating alerts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
