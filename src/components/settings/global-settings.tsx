'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, Clock, AlertTriangle, UserCog, Pencil, Check, X } from 'lucide-react'
import { updateSetting, type Setting } from '@/lib/settings/actions'
import { toast } from 'sonner'

interface GlobalSettingsProps {
  settings: Setting[]
  users: Array<{ id: string; name: string | null; email: string }>
}

const settingsConfig: Record<string, {
  label: string
  description: string
  icon: React.ElementType
  unit?: string
  type?: 'number' | 'select'
}> = {
  default_new_provider_owner_id: {
    label: 'RM Padrão para Novos Prestadores',
    description: 'Relationship Manager atribuído automaticamente ao criar prestador',
    icon: UserCog,
    type: 'select',
  },
  default_onboarding_owner_id: {
    label: 'RM Padrão para Onboarding',
    description: 'Relationship Manager atribuído automaticamente ao enviar para onboarding',
    icon: UserCog,
    type: 'select',
  },
  stalled_task_days: {
    label: 'Tarefa Parada',
    description: 'Dias sem alterações para considerar uma tarefa como parada',
    icon: Clock,
    unit: 'dias',
    type: 'number',
  },
  price_deviation_threshold: {
    label: 'Desvio de Preço',
    description: 'Threshold de desvio de preços para gerar alerta (0.20 = 20%)',
    icon: AlertTriangle,
    unit: '%',
    type: 'number',
  },
}

export function GlobalSettings({ settings, users }: GlobalSettingsProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const startEditing = (key: string, currentValue: unknown) => {
    setEditingKey(key)
    if (key === 'price_deviation_threshold') {
      setEditValue(((currentValue as number) * 100).toString())
    } else if (key === 'default_onboarding_owner_id' || key === 'default_new_provider_owner_id') {
      // Se for string JSON com aspas, fazer parse
      let val = ''
      if (currentValue && currentValue !== 'null') {
        const strVal = String(currentValue)
        // Se começa e termina com aspas, é string JSON - remover aspas
        val = strVal.startsWith('"') && strVal.endsWith('"')
          ? strVal.slice(1, -1)
          : strVal
      }
      setEditValue(val)
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
      let value: number | string | null
      if (editingKey === 'price_deviation_threshold') {
        value = parseFloat(editValue) / 100
      } else if (editingKey === 'default_onboarding_owner_id' || editingKey === 'default_new_provider_owner_id') {
        value = editValue || null
      } else {
        value = parseInt(editValue)
      }

      await updateSetting(editingKey, value)
      toast.success('Configuração atualizada com sucesso')
      cancelEditing()
    } catch {
      toast.error('Erro ao atualizar configuração')
    }
  }

  const getValue = (setting: Setting): string => {
    const config = settingsConfig[setting.key]

    if (setting.key === 'default_onboarding_owner_id' || setting.key === 'default_new_provider_owner_id') {
      let userId = setting.value as string | null
      if (!userId || userId === 'null') {
        return 'Nenhum (manual)'
      }
      // Se for string JSON com aspas, remover
      if (typeof userId === 'string' && userId.startsWith('"') && userId.endsWith('"')) {
        userId = userId.slice(1, -1)
      }
      const user = users.find(u => u.id === userId)
      return user?.name || user?.email || 'Utilizador desconhecido'
    }

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
        const isSelect = config.type === 'select'

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
                  {isSelect ? (
                    <div className="flex-1">
                      <Select value={editValue} onValueChange={setEditValue}>
                        <SelectTrigger>
                          <span>
                            {editValue === "" ? "Nenhum (manual)" : (users.find(u => u.id === editValue)?.name || users.find(u => u.id === editValue)?.email || "Selecionar RM...")}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum (manual)</SelectItem>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
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
