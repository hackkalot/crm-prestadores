'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Bell, Clock, AlertTriangle, CheckCheck, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { markAlertAsRead, markAllAlertsAsRead, type Alert } from '@/lib/alerts/actions'
import { cn } from '@/lib/utils'

interface AlertsDropdownProps {
  alerts: Alert[]
  unreadCount: number
}

const alertTypeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  deadline_approaching: { icon: Clock, color: 'text-amber-500' },
  task_stalled: { icon: AlertTriangle, color: 'text-red-500' },
}

export function AlertsDropdown({ alerts, unreadCount }: AlertsDropdownProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const handleMarkAsRead = (alertId: string) => {
    startTransition(async () => {
      await markAlertAsRead(alertId)
    })
  }

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllAlertsAsRead()
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <h4 className="font-semibold">Alertas</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todos como lidos
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-[400px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sem alertas</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const config = alertTypeConfig[alert.alert_type] || {
                icon: Bell,
                color: 'text-muted-foreground',
              }
              const Icon = config.icon

              return (
                <div
                  key={alert.id}
                  className={cn(
                    'px-3 py-2 border-b last:border-0 hover:bg-accent cursor-pointer',
                    !alert.is_read && 'bg-primary/5'
                  )}
                  onClick={() => !alert.is_read && handleMarkAsRead(alert.id)}
                >
                  <div className="flex gap-3">
                    <div className={cn('shrink-0 mt-0.5', config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm font-medium', !alert.is_read && 'text-primary')}>
                          {alert.title}
                        </p>
                        {!alert.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.created_at), {
                            addSuffix: true,
                            locale: pt,
                          })}
                        </span>
                        {alert.task?.card_id && (
                          <Link
                            href={`/onboarding/${alert.task.card_id}`}
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver tarefa
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}
