import { AlertsDropdown } from './alerts-dropdown'
import { getUserAlerts, getUnreadAlertCount } from '@/lib/alerts/actions'

export async function AlertsBell() {
  const [alerts, unreadCount] = await Promise.all([
    getUserAlerts(),
    getUnreadAlertCount(),
  ])

  return <AlertsDropdown alerts={alerts} unreadCount={unreadCount} />
}
