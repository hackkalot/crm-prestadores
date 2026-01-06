import { getUserAlerts, getUnreadAlertCount, generateDeadlineAlerts, generateStalledTaskAlerts } from '@/lib/alerts/actions'
import { AlertsDropdown } from './alerts-dropdown'

export async function AlertsBell() {
  // Gerar alertas em background (não bloqueia a UI)
  // Em produção isto é feito pelo cron, mas em dev garante que temos alertas
  if (process.env.NODE_ENV === 'development') {
    // Fire and forget - não esperamos pelo resultado
    Promise.all([
      generateDeadlineAlerts(),
      generateStalledTaskAlerts()
    ]).catch(err => console.error('Error generating alerts:', err))
  }

  const [alerts, unreadCount] = await Promise.all([
    getUserAlerts(),
    getUnreadAlertCount(),
  ])

  return <AlertsDropdown alerts={alerts} unreadCount={unreadCount} />
}
