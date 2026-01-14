'use client'

import { useState, useActionState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { updateCoverageSettings } from '@/lib/settings/coverage-actions'

interface CoverageSettingsProps {
  goodMinProviders: number
  lowMinProviders: number
  analysisPeriodMonths: number
}

export function CoverageSettings({
  goodMinProviders,
  lowMinProviders,
  analysisPeriodMonths,
}: CoverageSettingsProps) {
  const [state, formAction, pending] = useActionState(updateCoverageSettings, {})

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Thresholds de Cobertura</CardTitle>
          <CardDescription>
            Define os critérios para avaliar a cobertura de serviços por concelho
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="good_min">
                Boa Cobertura (mín. prestadores)
              </Label>
              <Input
                id="good_min"
                name="good_min"
                type="number"
                min="1"
                defaultValue={goodMinProviders}
                required
              />
              <p className="text-xs text-muted-foreground">
                Concelho com ≥ este número de prestadores = 🟢 Verde
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="low_min">
                Baixa Cobertura (mín. prestadores)
              </Label>
              <Input
                id="low_min"
                name="low_min"
                type="number"
                min="0"
                defaultValue={lowMinProviders}
                required
              />
              <p className="text-xs text-muted-foreground">
                Concelho com ≥ este número mas {`<`} boa cobertura = 🟡 Amarelo
              </p>
            </div>

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
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <strong className="text-foreground">Verde (Boa):</strong> {goodMinProviders} ou mais
                prestadores ativos
              </li>
              <li>
                <strong className="text-foreground">Amarelo (Baixa):</strong> Entre {lowMinProviders} e{' '}
                {goodMinProviders - 1} prestadores
              </li>
              <li>
                <strong className="text-foreground">Vermelho (Em Risco):</strong> Menos de{' '}
                {lowMinProviders} prestador(es)
              </li>
              <li>
                <strong className="text-foreground">Transparente:</strong> Sem pedidos no período
              </li>
            </ul>
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
