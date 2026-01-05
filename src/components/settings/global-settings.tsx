'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bell, Clock, AlertTriangle, Pencil, Check, X } from 'lucide-react'
import { updateSetting, type Setting } from '@/lib/settings/actions'
import { toast } from 'sonner'

interface GlobalSettingsProps {
  settings: Setting[]
}

const settingsConfig: Record<string, {
  label: string
  description: string
  icon: React.ElementType
  unit: string
}> = {
  alert_hours_before_deadline: {
    label: 'Alerta de Prazo',
    description: 'Horas antes do prazo para gerar alerta ao owner da tarefa',
    icon: Bell,
    unit: 'horas',
  },
  stalled_task_days: {
    label: 'Tarefa Parada',
    description: 'Dias sem alteracoes para considerar uma tarefa como parada',
    icon: Clock,
    unit: 'dias',
  },
  price_deviation_threshold: {
    label: 'Desvio de Preco',
    description: 'Threshold de desvio de precos para gerar alerta (0.20 = 20%)',
    icon: AlertTriangle,
    unit: '%',
  },
}

export function GlobalSettings({ settings }: GlobalSettingsProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const startEditing = (key: string, currentValue: unknown) => {
    setEditingKey(key)
    if (key === 'price_deviation_threshold') {
      setEditValue(((currentValue as number) * 100).toString())
    } else {
      setEditValue(String(currentValue))
    }
  }

  const cancelEditing = () => {
    setEditingKey(null)
    setEditValue('')
  }

  const saveEditing = async () => {
    if (!editingKey) return

    try {
      let value: number
      if (editingKey === 'price_deviation_threshold') {
        value = parseFloat(editValue) / 100
      } else {
        value = parseInt(editValue)
      }

      await updateSetting(editingKey, value)
      toast.success('Configuracao atualizada com sucesso')
      cancelEditing()
    } catch {
      toast.error('Erro ao atualizar configuracao')
    }
  }

  const getValue = (setting: Setting): string => {
    const config = settingsConfig[setting.key]
    if (setting.key === 'price_deviation_threshold') {
      return `${((setting.value as number) * 100).toFixed(0)}%`
    }
    return `${setting.value} ${config?.unit || ''}`
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {settings.map((setting) => {
        const config = settingsConfig[setting.key]
        if (!config) return null

        const Icon = config.icon

        return (
          <Card key={setting.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{config.label}</CardTitle>
                </div>
                {editingKey !== setting.key && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => startEditing(setting.key, setting.value)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">{config.description}</CardDescription>

              {editingKey === setting.key ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label htmlFor={setting.key} className="sr-only">
                      {config.label}
                    </Label>
                    <Input
                      id={setting.key}
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{config.unit}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEditing}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditing}>
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ) : (
                <p className="text-2xl font-bold">{getValue(setting)}</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
