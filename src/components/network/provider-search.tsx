'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProviderMatch } from '@/lib/network/actions'
import { searchAvailableProviders } from '@/lib/network/actions'
import { PORTUGAL_DISTRICTS, BASE_SERVICES } from '@/lib/network/constants'
import {
  Search,
  MapPin,
  Wrench,
  Users,
  Mail,
  Phone,
  ExternalLink,
  Loader2,
  Filter,
} from 'lucide-react'
import Link from 'next/link'

export function ProviderSearch() {
  const [district, setDistrict] = useState<string>('all')
  const [service, setService] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [results, setResults] = useState<ProviderMatch[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSearch = () => {
    setHasSearched(true)
    startTransition(async () => {
      const providers = await searchAvailableProviders({
        district: district !== 'all' ? district : undefined,
        service: service !== 'all' ? service : undefined,
        status: status !== 'all' ? status : undefined,
      })
      setResults(providers)
    })
  }

  const handleClear = () => {
    setDistrict('all')
    setService('all')
    setStatus('all')
    setResults([])
    setHasSearched(false)
  }

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Pesquisar Prestadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Distrito</label>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar distrito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os distritos</SelectItem>
                  {PORTUGAL_DISTRICTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Servico</label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar servico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os servicos</SelectItem>
                  {BASE_SERVICES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="suspenso">Suspensos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <div className="flex gap-2">
                <Button onClick={handleSearch} disabled={isPending} className="flex-1">
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Pesquisar
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  Limpar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isPending ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">A pesquisar...</p>
          </CardContent>
        </Card>
      ) : hasSearched ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {results.length} prestador{results.length !== 1 ? 'es' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </p>
            {(district !== 'all' || service !== 'all' || status !== 'all') && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtros ativos:</span>
                {district !== 'all' && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {district}
                  </Badge>
                )}
                {service !== 'all' && (
                  <Badge variant="outline" className="gap-1">
                    <Wrench className="h-3 w-3" />
                    {service}
                  </Badge>
                )}
                {status !== 'all' && (
                  <Badge variant="outline">
                    {status === 'ativo' ? 'Ativos' : 'Suspensos'}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>Nenhum prestador encontrado com os filtros selecionados.</p>
                <p className="text-sm">Tente ajustar os criterios de pesquisa.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((provider) => (
                <Card key={provider.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{provider.name}</span>
                            <Badge variant={provider.status === 'ativo' ? 'success' : 'warning'}>
                              {provider.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {provider.entityType === 'tecnico' ? 'Tecnico' :
                             provider.entityType === 'eni' ? 'ENI' : 'Empresa'}
                          </p>
                        </div>
                        <Link href={`/prestadores/${provider.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {provider.email}
                        </span>
                        {provider.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {provider.phone}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {provider.districts.slice(0, 4).map((d) => (
                              <Badge
                                key={d}
                                variant="outline"
                                className={`text-xs ${
                                  district !== 'all' && d === district
                                    ? 'bg-blue-100 dark:bg-blue-950 border-blue-300'
                                    : ''
                                }`}
                              >
                                {d}
                              </Badge>
                            ))}
                            {provider.districts.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{provider.districts.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Wrench className="h-4 w-4 text-green-500 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {provider.services.slice(0, 4).map((s) => (
                              <Badge
                                key={s}
                                variant="outline"
                                className={`text-xs ${
                                  service !== 'all' && s === service
                                    ? 'bg-green-100 dark:bg-green-950 border-green-300'
                                    : ''
                                }`}
                              >
                                {s}
                              </Badge>
                            ))}
                            {provider.services.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{provider.services.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4" />
            <p>Selecione os filtros e clique em Pesquisar</p>
            <p className="text-sm">para encontrar prestadores disponiveis.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
