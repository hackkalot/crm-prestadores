'use client'

import { useActionState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { updateCoverageSettings } from '@/lib/settings/coverage-actions'

interface CoverageSettingsProps {
  requestsPerProvider: number
  capacityGoodMin: number
  capacityLowMin: number
  analysisPeriodMonths: number
}

export function CoverageSettings({
  requestsPerProvider,
  capacityGoodMin,
  capacityLowMin,
  analysisPeriodMonths,
}: CoverageSettingsProps) {
  const [state, formAction, pending] = useActionState(updateCoverageSettings, {})

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Thresholds de Cobertura</CardTitle>
          <CardDescription>
            Define os critérios para avaliar a cobertura de serviços por concelho com base na capacidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="requests_per_provider">
                Pedidos por Prestador
              </Label>
              <Input
                id="requests_per_provider"
                name="requests_per_provider"
                type="number"
                min="1"
                max="100"
                defaultValue={requestsPerProvider}
                required
              />
              <p className="text-xs text-muted-foreground">
                Quantos pedidos 1 prestador consegue cobrir por período
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity_good_min">
                Boa Cobertura (% capacidade)
              </Label>
              <Input
                id="capacity_good_min"
                name="capacity_good_min"
                type="number"
                min="0"
                max="200"
                defaultValue={capacityGoodMin}
                required
              />
              <p className="text-xs text-muted-foreground">
                Capacidade ≥ este valor = 🟢 Verde
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity_low_min">
                Baixa Cobertura (% capacidade)
              </Label>
              <Input
                id="capacity_low_min"
                name="capacity_low_min"
                type="number"
                min="0"
                max="200"
                defaultValue={capacityLowMin}
                required
              />
              <p className="text-xs text-muted-foreground">
                Capacidade ≥ este valor mas {`<`} boa = 🟡 Amarelo
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="period_months">
                Período de Análise (meses)
              </Label>
              <Input
                id="period_months"
                name="period_months"
                type="number"
                min="1"
                max="12"
                defaultValue={analysisPeriodMonths}
                required
              />
              <p className="text-xs text-muted-foreground">
                Pedidos dos últimos N meses serão considerados
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Como funciona:</h4>
            <p className="text-sm text-muted-foreground mb-2">
              <strong className="text-foreground">Capacidade = (Prestadores × {requestsPerProvider}) / Pedidos × 100%</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <strong className="text-foreground">🟢 Verde (Boa):</strong> Capacidade ≥ {capacityGoodMin}%
              </li>
              <li>
                <strong className="text-foreground">🟡 Amarelo (Baixa):</strong> Capacidade entre {capacityLowMin}% e {capacityGoodMin - 1}%
              </li>
              <li>
                <strong className="text-foreground">🔴 Vermelho (Má):</strong> Capacidade {`<`} {capacityLowMin}%
              </li>
              <li>
                <strong className="text-foreground">Transparente:</strong> Sem pedidos no período
              </li>
            </ul>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Exemplo:</strong> 100 pedidos, 5 prestadores → Capacidade = (5 × {requestsPerProvider}) / 100 = {(5 * requestsPerProvider / 100 * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {state.error && (
            <div className="text-sm text-destructive">{state.error}</div>
          )}

          {state.success && (
            <div className="text-sm text-green-600">
              Configurações atualizadas com sucesso!
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Alterações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
