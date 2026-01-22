'use client'

import { useState, useMemo } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, ChevronDown } from 'lucide-react'

interface Service {
  id: string
  service_name: string
  cluster: string
  service_group: string | null
  unit_description: string
  typology: string | null
}

// Serviço agrupado - representa múltiplos service_prices com o mesmo nome
interface GroupedService {
  name: string
  ids: string[] // Todos os IDs de service_prices com este nome
  count: number // Quantos service_prices estão agrupados
}

interface ServicesSelectorProps {
  services: Record<string, Record<string, Service[]>>
  selectedServices: string[]
  onChange: (selected: string[]) => void
}

export function ServicesSelector({ services, selectedServices, onChange }: ServicesSelectorProps) {
  const [search, setSearch] = useState('')

  // Criar mapeamento de nome de serviço para IDs (para cada cluster/group)
  const serviceNameToIds = useMemo(() => {
    const mapping: Record<string, Record<string, Record<string, string[]>>> = {}

    Object.entries(services).forEach(([cluster, groups]) => {
      mapping[cluster] = {}
      Object.entries(groups).forEach(([group, servicesList]) => {
        mapping[cluster][group] = {}
        servicesList.forEach((service) => {
          if (!mapping[cluster][group][service.service_name]) {
            mapping[cluster][group][service.service_name] = []
          }
          mapping[cluster][group][service.service_name].push(service.id)
        })
      })
    })

    return mapping
  }, [services])

  // Criar lista de serviços agrupados por nome (para exibição)
  const groupedServices = useMemo(() => {
    const grouped: Record<string, Record<string, GroupedService[]>> = {}

    Object.entries(services).forEach(([cluster, groups]) => {
      grouped[cluster] = {}
      Object.entries(groups).forEach(([group, servicesList]) => {
        // Agrupar por service_name
        const nameMap: Record<string, string[]> = {}
        servicesList.forEach((service) => {
          if (!nameMap[service.service_name]) {
            nameMap[service.service_name] = []
          }
          nameMap[service.service_name].push(service.id)
        })

        // Converter para array de GroupedService
        grouped[cluster][group] = Object.entries(nameMap).map(([name, ids]) => ({
          name,
          ids,
          count: ids.length,
        }))
      })
    })

    return grouped
  }, [services])

  // Filtrar serviços agrupados por pesquisa
  const filteredGroupedServices = useMemo(() => {
    if (!search.trim()) {
      return groupedServices
    }

    const searchLower = search.toLowerCase()
    const filtered: typeof groupedServices = {}

    Object.entries(groupedServices).forEach(([cluster, groups]) => {
      const filteredGroups: Record<string, GroupedService[]> = {}

      Object.entries(groups).forEach(([group, servicesList]) => {
        const matchingServices = servicesList.filter((s) =>
          s.name.toLowerCase().includes(searchLower)
        )

        if (matchingServices.length > 0) {
          filteredGroups[group] = matchingServices
        }
      })

      if (Object.keys(filteredGroups).length > 0) {
        filtered[cluster] = filteredGroups
      }
    })

    return filtered
  }, [search, groupedServices])

  // Toggle um serviço agrupado (seleciona/desseleciona todos os IDs com esse nome)
  const toggleGroupedService = (cluster: string, group: string, serviceName: string) => {
    const ids = serviceNameToIds[cluster]?.[group]?.[serviceName] || []
    const allSelected = ids.every((id) => selectedServices.includes(id))

    if (allSelected) {
      // Desselecionar todos os IDs deste serviço
      onChange(selectedServices.filter((id) => !ids.includes(id)))
    } else {
      // Selecionar todos os IDs deste serviço
      const newSelected = [...selectedServices]
      ids.forEach((id) => {
        if (!newSelected.includes(id)) {
          newSelected.push(id)
        }
      })
      onChange(newSelected)
    }
  }

  // Verificar se um serviço agrupado está completamente selecionado
  const isGroupedServiceSelected = (cluster: string, group: string, serviceName: string) => {
    const ids = serviceNameToIds[cluster]?.[group]?.[serviceName] || []
    return ids.length > 0 && ids.every((id) => selectedServices.includes(id))
  }

  const toggleCluster = (cluster: string) => {
    const clusterServiceIds = Object.values(services[cluster] || {})
      .flat()
      .map((s) => s.id)

    const allSelected = clusterServiceIds.every((id) => selectedServices.includes(id))

    if (allSelected) {
      onChange(selectedServices.filter((id) => !clusterServiceIds.includes(id)))
    } else {
      const newSelected = [...selectedServices]
      clusterServiceIds.forEach((id) => {
        if (!newSelected.includes(id)) {
          newSelected.push(id)
        }
      })
      onChange(newSelected)
    }
  }

  const toggleGroup = (cluster: string, group: string) => {
    const groupServiceIds = (services[cluster]?.[group] || []).map((s) => s.id)
    const allSelected = groupServiceIds.every((id) => selectedServices.includes(id))

    if (allSelected) {
      onChange(selectedServices.filter((id) => !groupServiceIds.includes(id)))
    } else {
      const newSelected = [...selectedServices]
      groupServiceIds.forEach((id) => {
        if (!newSelected.includes(id)) {
          newSelected.push(id)
        }
      })
      onChange(newSelected)
    }
  }

  const isClusterFullySelected = (cluster: string) => {
    const clusterServiceIds = Object.values(services[cluster] || {})
      .flat()
      .map((s) => s.id)
    return clusterServiceIds.length > 0 && clusterServiceIds.every((id) => selectedServices.includes(id))
  }

  const isGroupFullySelected = (cluster: string, group: string) => {
    const groupServiceIds = (services[cluster]?.[group] || []).map((s) => s.id)
    return groupServiceIds.length > 0 && groupServiceIds.every((id) => selectedServices.includes(id))
  }

  // Contar serviços únicos (agrupados) num cluster
  const getUniqueServicesCount = (cluster: string) => {
    return Object.values(groupedServices[cluster] || {})
      .flat()
      .length
  }

  // Contar serviços únicos (agrupados) num grupo
  const getGroupUniqueServicesCount = (cluster: string, group: string) => {
    return (groupedServices[cluster]?.[group] || []).length
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar serviços..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Total selecionado: <strong>{selectedServices.length}</strong> serviços
      </div>

      <Accordion type="multiple" className="space-y-2">
        {Object.entries(filteredGroupedServices).map(([cluster, groups]) => {
          const isFullySelected = isClusterFullySelected(cluster)
          const clusterCount = getUniqueServicesCount(cluster)

          return (
            <AccordionItem key={cluster} value={cluster} className="border rounded-lg transition-all duration-200">
              <div className="px-4 py-4 flex items-center gap-3">
                <Checkbox
                  checked={isFullySelected}
                  onCheckedChange={() => toggleCluster(cluster)}
                />
                <AccordionTrigger className="flex-1 hover:no-underline py-0 [&>svg]:hidden group">
                  <div className="flex items-center justify-between gap-3 w-full">
                    <span className="font-medium text-left transition-colors">{cluster}</span>
                    <Badge variant="outline" className="text-xs shrink-0 flex items-center gap-1.5 ml-auto transition-colors">
                      {clusterCount} {clusterCount === 1 ? 'serviço' : 'serviços'}
                      <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                    </Badge>
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="pl-6 border-l-2 border-muted/50">
                  <Accordion type="multiple" className="space-y-2">
                    {Object.entries(groups).map(([group, groupedServicesList]) => {
                      const isGroupSelected = isGroupFullySelected(cluster, group)
                      const groupCount = getGroupUniqueServicesCount(cluster, group)

                      return (
                        <AccordionItem key={`${cluster}-${group}`} value={`${cluster}-${group}`} className="border rounded-md bg-muted/20 transition-all duration-200">
                          <div className="px-3 py-3 flex items-center gap-2">
                            <Checkbox
                              checked={isGroupSelected}
                              onCheckedChange={() => toggleGroup(cluster, group)}
                            />
                            <AccordionTrigger className="flex-1 hover:no-underline py-0 [&>svg]:hidden group">
                              <div className="flex items-center justify-between gap-2 w-full">
                                <span className="font-medium text-sm text-left transition-colors">{group}</span>
                                <Badge variant="secondary" className="text-xs shrink-0 flex items-center gap-1.5 ml-auto transition-colors">
                                  {groupCount}
                                  <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                                </Badge>
                              </div>
                            </AccordionTrigger>
                          </div>
                          <AccordionContent className="px-3 pb-3">
                            <div className="space-y-2 pl-6 pt-2">
                            {groupedServicesList.map((groupedService) => {
                              const isSelected = isGroupedServiceSelected(cluster, group, groupedService.name)
                              const serviceKey = `${cluster}-${group}-${groupedService.name}`

                              return (
                                <div key={serviceKey} className="flex items-start gap-2">
                                  <Checkbox
                                    id={serviceKey}
                                    checked={isSelected}
                                    onCheckedChange={() => toggleGroupedService(cluster, group, groupedService.name)}
                                  />
                                  <label
                                    htmlFor={serviceKey}
                                    className="text-sm cursor-pointer flex-1 leading-tight"
                                  >
                                    {groupedService.name}
                                  </label>
                                </div>
                              )
                            })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {Object.keys(filteredGroupedServices).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum serviço encontrado
        </div>
      )}
    </div>
  )
}
