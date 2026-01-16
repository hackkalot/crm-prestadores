'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { getAngariacaoPrices, getAngariacaoServiceGroups } from '@/lib/angariacao/actions'
import type { AngariacaoPrice } from '@/lib/angariacao/actions'

interface AngariacaoPricesTableProps {
  prices: AngariacaoPrice[]
  clusters: string[]
}

const ITEMS_PER_PAGE = 25

export function AngariacaoPricesTable({
  prices,
  clusters,
}: AngariacaoPricesTableProps) {
  const [data, setData] = useState<AngariacaoPrice[]>(prices || [])
  const [total, setTotal] = useState(prices?.length || 0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [cluster, setCluster] = useState<string>('')
  const [serviceGroup, setServiceGroup] = useState<string>('')
  const [serviceGroups, setServiceGroups] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  // Atualizar grupos quando cluster muda
  useEffect(() => {
    if (cluster) {
      getAngariacaoServiceGroups(cluster).then(setServiceGroups)
    } else {
      getAngariacaoServiceGroups().then(setServiceGroups)
    }
    setServiceGroup('')
  }, [cluster])

  // Buscar dados
  const fetchData = () => {
    startTransition(async () => {
      const result = await getAngariacaoPrices({
        cluster: cluster || undefined,
        serviceGroup: serviceGroup || undefined,
        search: search || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      })
      setData(result.data)
      setTotal(result.total)
    })
  }

  useEffect(() => {
    fetchData()
  }, [page, cluster, serviceGroup])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchData()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return `${price.toFixed(2)} €`
  }

  const getClusterColor = (c: string) => {
    switch (c) {
      case 'Casa':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Saúde e bem estar':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Empresas':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'Luxo':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
      case 'Pete':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={cluster} onValueChange={setCluster}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os clusters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os clusters</SelectItem>
            {clusters.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={serviceGroup} onValueChange={setServiceGroup}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos os grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os grupos</SelectItem>
            {serviceGroups.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isPending && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serviço</TableHead>
              <TableHead>Cluster</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Unidade/Variante</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Preço Base</TableHead>
              <TableHead className="text-right">Por Hora (c/ mat.)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {item.service_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getClusterColor(item.cluster)}>
                      {item.cluster}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
                    {item.service_group || '-'}
                  </TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">
                    {item.unit_description}
                    {item.typology && (
                      <span className="text-muted-foreground ml-1">
                        ({item.typology})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.vat_rate}%</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(item.price_base)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(item.price_hour_with_materials)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          A mostrar {data.length} de {total} resultados
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Página {page} de {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isPending}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
