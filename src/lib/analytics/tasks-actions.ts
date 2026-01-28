'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AnalyticsFilters,
  TrendGranularity,
  TasksSummary,
  TaskTrendPoint,
  TaskStatusItem,
  TaskTypeItem,
  TaskAssigneeItem,
  TaskCompletionTimeItem,
  TaskProviderItem,
  TaskDeadlineComplianceItem,
} from './types'

// ==================
// Helpers
// ==================

function getTaskDateRange(filters?: AnalyticsFilters): { from: string; to: string } {
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const fromDate = filters?.dateFrom || defaultFrom.toISOString().split('T')[0]
  const toDate = filters?.dateTo || now.toISOString().split('T')[0]
  return { from: fromDate, to: toDate }
}

function applyTaskDateFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters?: AnalyticsFilters
) {
  const { from, to } = getTaskDateRange(filters)
  query = query.gte('creation_date', from)
  const toDate = new Date(to)
  toDate.setDate(toDate.getDate() + 1)
  query = query.lt('creation_date', toDate.toISOString().split('T')[0])
  return query
}

function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function getPreviousPeriodRange(from: string, to: string): { from: string; to: string } {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const periodDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  const prevTo = new Date(fromDate)
  prevTo.setDate(prevTo.getDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setDate(prevFrom.getDate() - periodDays)
  return {
    from: prevFrom.toISOString().split('T')[0],
    to: prevTo.toISOString().split('T')[0],
  }
}

function determineGranularity(from: string, to: string): TrendGranularity {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 31) return 'day'
  if (days <= 90) return 'week'
  return 'month'
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function getPeriodKey(dateStr: string, granularity: TrendGranularity): string {
  const date = new Date(dateStr)
  switch (granularity) {
    case 'day':
      return dateStr.substring(0, 10)
    case 'week':
      return `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
}

function formatPeriodLabel(periodKey: string, granularity: TrendGranularity): string {
  switch (granularity) {
    case 'day': {
      const date = new Date(periodKey)
      return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
    }
    case 'week': {
      const [, week] = periodKey.split('-W')
      return `S${week}`
    }
    case 'month': {
      const [year, month] = periodKey.split('-')
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return `${monthNames[parseInt(month) - 1]} ${year}`
    }
  }
}

function getMostFrequent(items: string[]): string | null {
  if (items.length === 0) return null
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }
  let max = 0
  let result: string | null = null
  for (const [key, count] of counts) {
    if (count > max) {
      max = count
      result = key
    }
  }
  return result
}

function isTaskCompleted(status: string | null): boolean {
  if (!status) return false
  const s = status.toLowerCase().trim()
  return s === 'concluído' || s === 'concluido' || s === 'concluída' || s === 'concluida' || s === 'done' || s === 'closed' || s === 'completed'
}

function computeAvgCompletionDays(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[]
): number | null {
  const completedWithDates = tasks.filter(
    t => isTaskCompleted(t.status) && t.creation_date && t.finishing_date
  )
  if (completedWithDates.length === 0) return null

  let totalDays = 0
  let validCount = 0
  for (const t of completedWithDates) {
    const created = new Date(t.creation_date)
    const finished = new Date(t.finishing_date)
    if (isNaN(created.getTime()) || isNaN(finished.getTime())) continue
    const diffDays = (finished.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays >= 0) {
      totalDays += diffDays
      validCount++
    }
  }

  if (validCount === 0) return null
  return Math.round((totalDays / validCount) * 10) / 10
}

// ==================
// Server Actions
// ==================

const emptyTasksSummary: TasksSummary = {
  totalTasks: 0,
  totalTasksPrev: 0,
  totalTasksTrend: 0,
  completedTasks: 0,
  completedTasksPrev: 0,
  completedTasksTrend: 0,
  completedPercentage: 0,
  pendingTasks: 0,
  pendingTasksPrev: 0,
  pendingTasksTrend: 0,
  avgCompletionDays: null,
  avgCompletionDaysPrev: null,
  avgCompletionDaysTrend: 0,
  distinctAssignees: 0,
  distinctAssigneesPrev: 0,
  distinctAssigneesTrend: 0,
  topAssignee: null,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeTaskMetrics(tasks: any[]) {
  const total = tasks.length
  const completed = tasks.filter(t => isTaskCompleted(t.status)).length
  const pending = total - completed
  const assignees = tasks.map(t => t.given_to).filter(Boolean) as string[]
  const avgCompletionDays = computeAvgCompletionDays(tasks)

  return {
    total,
    completed,
    pending,
    completedPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    distinctAssignees: new Set(assignees).size,
    topAssignee: getMostFrequent(assignees),
    avgCompletionDays,
  }
}

export async function getTasksSummary(filters?: AnalyticsFilters): Promise<TasksSummary> {
  const adminClient = createAdminClient()
  const selectFields = 'status, given_to, creation_date, finishing_date'

  // Current period
  let query = adminClient.from('tasks').select(selectFields)
  query = applyTaskDateFilters(query, filters)
  const { data: tasks } = await query

  if (!tasks || tasks.length === 0) {
    return { ...emptyTasksSummary }
  }

  const current = computeTaskMetrics(tasks)

  // Previous period
  const effectiveRange = getTaskDateRange(filters)
  const prevRange = getPreviousPeriodRange(effectiveRange.from, effectiveRange.to)
  const prevFilters: AnalyticsFilters = { ...filters, dateFrom: prevRange.from, dateTo: prevRange.to }

  let prevQuery = adminClient.from('tasks').select(selectFields)
  prevQuery = applyTaskDateFilters(prevQuery, prevFilters)
  const { data: prevTasks } = await prevQuery

  let prevMetrics = { total: 0, completed: 0, pending: 0, distinctAssignees: 0, avgCompletionDays: null as number | null }
  if (prevTasks && prevTasks.length > 0) {
    const prev = computeTaskMetrics(prevTasks)
    prevMetrics = {
      total: prev.total,
      completed: prev.completed,
      pending: prev.pending,
      distinctAssignees: prev.distinctAssignees,
      avgCompletionDays: prev.avgCompletionDays,
    }
  }

  return {
    totalTasks: current.total,
    totalTasksPrev: prevMetrics.total,
    totalTasksTrend: calculateTrend(current.total, prevMetrics.total),
    completedTasks: current.completed,
    completedTasksPrev: prevMetrics.completed,
    completedTasksTrend: calculateTrend(current.completed, prevMetrics.completed),
    completedPercentage: current.completedPercentage,
    pendingTasks: current.pending,
    pendingTasksPrev: prevMetrics.pending,
    pendingTasksTrend: calculateTrend(current.pending, prevMetrics.pending),
    avgCompletionDays: current.avgCompletionDays,
    avgCompletionDaysPrev: prevMetrics.avgCompletionDays,
    avgCompletionDaysTrend: current.avgCompletionDays !== null && prevMetrics.avgCompletionDays !== null
      ? calculateTrend(current.avgCompletionDays, prevMetrics.avgCompletionDays)
      : 0,
    distinctAssignees: current.distinctAssignees,
    distinctAssigneesPrev: prevMetrics.distinctAssignees,
    distinctAssigneesTrend: calculateTrend(current.distinctAssignees, prevMetrics.distinctAssignees),
    topAssignee: current.topAssignee,
  }
}

export async function getTaskTrend(filters?: AnalyticsFilters): Promise<TaskTrendPoint[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('tasks')
    .select('creation_date, finishing_date, status')
    .not('creation_date', 'is', null)
    .order('creation_date', { ascending: true })

  query = applyTaskDateFilters(query, filters)
  const { data: tasks } = await query

  if (!tasks || tasks.length === 0) return []

  const effectiveRange = getTaskDateRange(filters)
  const granularity = determineGranularity(effectiveRange.from, effectiveRange.to)

  const newByPeriod = new Map<string, number>()
  const completedByPeriod = new Map<string, number>()

  for (const t of tasks) {
    if (!t.creation_date) continue
    const date = new Date(t.creation_date)
    if (isNaN(date.getTime())) continue
    const key = getPeriodKey(t.creation_date, granularity)
    newByPeriod.set(key, (newByPeriod.get(key) || 0) + 1)

    if (isTaskCompleted(t.status) && t.finishing_date) {
      const finishDate = new Date(t.finishing_date)
      if (!isNaN(finishDate.getTime())) {
        const finishKey = getPeriodKey(t.finishing_date, granularity)
        completedByPeriod.set(finishKey, (completedByPeriod.get(finishKey) || 0) + 1)
      }
    }
  }

  // Merge all period keys
  const allPeriods = new Set([...newByPeriod.keys(), ...completedByPeriod.keys()])
  const sortedPeriods = Array.from(allPeriods).sort()

  let cumCreated = 0
  let cumCompleted = 0
  return sortedPeriods.map(period => {
    const newCount = newByPeriod.get(period) || 0
    const completedCount = completedByPeriod.get(period) || 0
    cumCreated += newCount
    cumCompleted += completedCount
    return {
      period,
      periodLabel: formatPeriodLabel(period, granularity),
      newTasks: newCount,
      completedTasks: completedCount,
      cumulativeCreated: cumCreated,
      cumulativeCompleted: cumCompleted,
      openBacklog: cumCreated - cumCompleted,
    }
  })
}

export async function getTaskStatusDistribution(filters?: AnalyticsFilters): Promise<TaskStatusItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient.from('tasks').select('status, creation_date')
  query = applyTaskDateFilters(query, filters)
  const { data: tasks } = await query

  if (!tasks || tasks.length === 0) return []

  const total = tasks.length
  const byStatus = new Map<string, number>()
  for (const t of tasks) {
    const status = t.status || 'Desconhecido'
    byStatus.set(status, (byStatus.get(status) || 0) + 1)
  }

  return Array.from(byStatus.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getTasksByType(limit: number = 10, filters?: AnalyticsFilters): Promise<TaskTypeItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient.from('tasks').select('task_type, creation_date')
  query = applyTaskDateFilters(query, filters)
  const { data: tasks } = await query

  if (!tasks || tasks.length === 0) return []

  const total = tasks.length
  const byType = new Map<string, number>()
  for (const t of tasks) {
    const taskType = t.task_type?.trim()
    if (!taskType) continue
    byType.set(taskType, (byType.get(taskType) || 0) + 1)
  }

  return Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([taskType, count]) => ({
      taskType,
      count,
      percentage: Math.round((count / total) * 100),
    }))
}

export async function getTasksByAssignee(limit: number = 10, filters?: AnalyticsFilters): Promise<TaskAssigneeItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient.from('tasks').select('given_to, status, creation_date')
  query = applyTaskDateFilters(query, filters)
  const { data: tasks } = await query

  if (!tasks || tasks.length === 0) return []

  const byAssignee = new Map<string, { total: number; completed: number }>()
  for (const t of tasks) {
    const assignee = t.given_to?.trim()
    if (!assignee) continue
    const current = byAssignee.get(assignee) || { total: 0, completed: 0 }
    current.total++
    if (isTaskCompleted(t.status)) current.completed++
    byAssignee.set(assignee, current)
  }

  return Array.from(byAssignee.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([assignee, stats]) => ({
      assignee,
      total: stats.total,
      completed: stats.completed,
      pending: stats.total - stats.completed,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }))
}

export async function getTaskCompletionTime(limit: number = 10, filters?: AnalyticsFilters): Promise<TaskCompletionTimeItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('tasks')
    .select('task_type, creation_date, finishing_date, status')
    .not('finishing_date', 'is', null)

  query = applyTaskDateFilters(query, filters)
  const { data: tasks } = await query

  if (!tasks || tasks.length === 0) return []

  const byType = new Map<string, { totalDays: number; count: number }>()
  for (const t of tasks) {
    if (!isTaskCompleted(t.status) || !t.creation_date || !t.finishing_date) continue
    const taskType = t.task_type?.trim() || 'Desconhecido'
    const created = new Date(t.creation_date)
    const finished = new Date(t.finishing_date)
    if (isNaN(created.getTime()) || isNaN(finished.getTime())) continue
    const diffDays = (finished.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays < 0) continue

    const current = byType.get(taskType) || { totalDays: 0, count: 0 }
    current.totalDays += diffDays
    current.count++
    byType.set(taskType, current)
  }

  return Array.from(byType.entries())
    .map(([taskType, stats]) => ({
      taskType,
      avgDays: Math.round((stats.totalDays / stats.count) * 10) / 10,
      count: stats.count,
    }))
    .sort((a, b) => b.avgDays - a.avgDays)
    .slice(0, limit)
}

export async function getTasksByProvider(limit: number = 15, filters?: AnalyticsFilters): Promise<TaskProviderItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient.from('tasks').select('assigned_provider, creation_date')
  query = applyTaskDateFilters(query, filters)
  const { data: tasks } = await query

  if (!tasks || tasks.length === 0) return []

  const total = tasks.length
  const byProvider = new Map<string, number>()
  for (const t of tasks) {
    const provider = t.assigned_provider?.trim()
    if (!provider) continue
    byProvider.set(provider, (byProvider.get(provider) || 0) + 1)
  }

  return Array.from(byProvider.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([provider, count]) => ({
      provider,
      count,
      percentage: Math.round((count / total) * 100),
    }))
}

export async function getTaskDeadlineCompliance(filters?: AnalyticsFilters): Promise<TaskDeadlineComplianceItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('tasks')
    .select('finishing_date, deadline, status, creation_date')
    .not('deadline', 'is', null)
    .not('finishing_date', 'is', null)

  query = applyTaskDateFilters(query, filters)
  const { data: tasks } = await query

  if (!tasks || tasks.length === 0) return []

  // Only consider completed tasks that have both deadline and finishing_date
  const completedTasks = tasks.filter(t => isTaskCompleted(t.status))
  if (completedTasks.length === 0) return []

  const buckets = new Map<string, number>([
    ['Antes do prazo (3+ dias)', 0],
    ['No prazo (0-2 dias)', 0],
    ['Atrasada 1-3 dias', 0],
    ['Atrasada 4-7 dias', 0],
    ['Atrasada 7+ dias', 0],
  ])

  const colors: Record<string, string> = {
    'Antes do prazo (3+ dias)': '#22c55e',
    'No prazo (0-2 dias)': '#84cc16',
    'Atrasada 1-3 dias': '#f59e0b',
    'Atrasada 4-7 dias': '#f97316',
    'Atrasada 7+ dias': '#ef4444',
  }

  for (const t of completedTasks) {
    const deadline = new Date(t.deadline)
    const finished = new Date(t.finishing_date)
    if (isNaN(deadline.getTime()) || isNaN(finished.getTime())) continue

    const diffDays = (finished.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays <= -3) {
      buckets.set('Antes do prazo (3+ dias)', (buckets.get('Antes do prazo (3+ dias)') || 0) + 1)
    } else if (diffDays <= 0) {
      buckets.set('No prazo (0-2 dias)', (buckets.get('No prazo (0-2 dias)') || 0) + 1)
    } else if (diffDays <= 3) {
      buckets.set('Atrasada 1-3 dias', (buckets.get('Atrasada 1-3 dias') || 0) + 1)
    } else if (diffDays <= 7) {
      buckets.set('Atrasada 4-7 dias', (buckets.get('Atrasada 4-7 dias') || 0) + 1)
    } else {
      buckets.set('Atrasada 7+ dias', (buckets.get('Atrasada 7+ dias') || 0) + 1)
    }
  }

  const total = completedTasks.length

  return Array.from(buckets.entries())
    .filter(([, count]) => count > 0)
    .map(([bucket, count]) => ({
      bucket,
      count,
      percentage: Math.round((count / total) * 100),
      color: colors[bucket] || '#94a3b8',
    }))
}
