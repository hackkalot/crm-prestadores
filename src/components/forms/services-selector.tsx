'use client'

import { useState, useEffect } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

interface Service {
  id: string
  service_name: string
  cluster: string
  service_group: string | null
  unit_description: string
  typology: string | null
}

interface ServicesSelectorProps {
  services: Record<string, Record<string, Service[]>>
  selectedServices: string[]
  onChange: (selected: string[]) => void
}

export function ServicesSelector({ services, selectedServices, onChange }: ServicesSelectorProps) {
  const [search, setSearch] = useState('')
  const [filteredServices, setFilteredServices] = useState(services)

  // Filtrar serviços por pesquisa
  useEffect(() => {
    if (!search.trim()) {
      setFilteredServices(services)
      return
    }

    const searchLower = search.toLowerCase()
    const filtered: typeof services = {}

    Object.entries(services).forEach(([cluster, groups]) => {
      const filteredGroups: Record<string, Service[]> = {}

      Object.entries(groups).forEach(([group, servicesList]) => {
        const matchingServices = servicesList.filter((s) =>
          s.service_name.toLowerCase().includes(searchLower) ||
          s.unit_description.toLowerCase().includes(searchLower)
        )

        if (matchingServices.length > 0) {
          filteredGroups[group] = matchingServices
        }
      })

      if (Object.keys(filteredGroups).length > 0) {
        filtered[cluster] = filteredGroups
      }
    })

    setFilteredServices(filtered)
  }, [search, services])

  const toggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      onChange(selectedServices.filter((id) => id !== serviceId))
    } else {
      onChange([...selectedServices, serviceId])
    }
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
        {Object.entries(filteredServices).map(([cluster, groups]) => {
          const isFullySelected = isClusterFullySelected(cluster)
          const clusterCount = Object.values(groups).flat().length

          return (
            <AccordionItem key={cluster} value={cluster} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    checked={isFullySelected}
                    onCheckedChange={() => toggleCluster(cluster)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="font-medium">{cluster}</span>
                  <Badge variant="outline" className="text-xs">
                    {clusterCount} {clusterCount === 1 ? 'serviço' : 'serviços'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <Accordion type="multiple" className="space-y-2 ml-6">
                  {Object.entries(groups).map(([group, servicesList]) => {
                    const isGroupSelected = isGroupFullySelected(cluster, group)

                    return (
                      <AccordionItem key={`${cluster}-${group}`} value={`${cluster}-${group}`} className="border-l-2 border-muted">
                        <AccordionTrigger className="px-3 hover:no-underline text-sm">
                          <div className="flex items-center gap-2 flex-1">
                            <Checkbox
                              checked={isGroupSelected}
                              onCheckedChange={() => toggleGroup(cluster, group)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span>{group}</span>
                            <Badge variant="secondary" className="text-xs">
                              {servicesList.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-2">
                          <div className="space-y-2 ml-6">
                            {servicesList.map((service) => (
                              <div key={service.id} className="flex items-start gap-2">
                                <Checkbox
                                  id={service.id}
                                  checked={selectedServices.includes(service.id)}
                                  onCheckedChange={() => toggleService(service.id)}
                                />
                                <label
                                  htmlFor={service.id}
                                  className="text-sm cursor-pointer flex-1 leading-tight"
                                >
                                  {service.service_name}
                                  {service.typology && (
                                    <span className="text-muted-foreground ml-1">
                                      ({service.typology})
                                    </span>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    {service.unit_description}
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {Object.keys(filteredServices).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum serviço encontrado
        </div>
      )}
    </div>
  )
}
