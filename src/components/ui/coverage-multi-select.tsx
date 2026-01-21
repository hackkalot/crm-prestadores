'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { PORTUGAL_DISTRICTS } from '@/lib/data/portugal-districts'

interface CoverageMultiSelectProps {
  selected: string[]  // Concelhos selecionados
  onChange: (selected: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function CoverageMultiSelect({
  selected,
  onChange,
  placeholder = 'Selecionar cobertura...',
  disabled = false,
}: CoverageMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedDistricts, setExpandedDistricts] = useState<string[]>([])

  // Filtrar distritos e concelhos por pesquisa
  const filteredDistricts = useMemo(() => {
    if (!search.trim()) {
      return PORTUGAL_DISTRICTS
    }

    const searchLower = search.toLowerCase()
    const filtered: Record<string, string[]> = {}

    Object.entries(PORTUGAL_DISTRICTS).forEach(([district, municipalities]) => {
      const districtMatches = district.toLowerCase().includes(searchLower)
      const matchingMunicipalities = municipalities.filter((m) =>
        m.toLowerCase().includes(searchLower)
      )

      if (districtMatches) {
        filtered[district] = municipalities
      } else if (matchingMunicipalities.length > 0) {
        filtered[district] = matchingMunicipalities
      }
    })

    return filtered
  }, [search])

  // Auto-expandir distritos quando há pesquisa
  useEffect(() => {
    if (search.trim()) {
      setExpandedDistricts(Object.keys(filteredDistricts))
    }
  }, [search, filteredDistricts])

  const toggleMunicipality = (municipality: string) => {
    if (selected.includes(municipality)) {
      onChange(selected.filter((m) => m !== municipality))
    } else {
      onChange([...selected, municipality])
    }
  }

  const toggleDistrict = (districtName: string) => {
    const municipalities = PORTUGAL_DISTRICTS[districtName]
    if (!municipalities) return

    const allSelected = municipalities.every((m) => selected.includes(m))

    if (allSelected) {
      onChange(selected.filter((m) => !municipalities.includes(m)))
    } else {
      const newSelected = [...selected]
      municipalities.forEach((m) => {
        if (!newSelected.includes(m)) {
          newSelected.push(m)
        }
      })
      onChange(newSelected)
    }
  }

  const toggleDistrictExpand = (districtName: string) => {
    setExpandedDistricts(prev =>
      prev.includes(districtName)
        ? prev.filter(d => d !== districtName)
        : [...prev, districtName]
    )
  }

  const isDistrictFullySelected = (districtName: string) => {
    const municipalities = PORTUGAL_DISTRICTS[districtName]
    if (!municipalities) return false
    return municipalities.every((m) => selected.includes(m))
  }

  const isDistrictPartiallySelected = (districtName: string) => {
    const municipalities = PORTUGAL_DISTRICTS[districtName]
    if (!municipalities) return false
    const selectedCount = municipalities.filter((m) => selected.includes(m)).length
    return selectedCount > 0 && selectedCount < municipalities.length
  }

  const getSelectedCount = (districtName: string) => {
    const municipalities = PORTUGAL_DISTRICTS[districtName]
    if (!municipalities) return 0
    return municipalities.filter((m) => selected.includes(m)).length
  }

  const handleRemove = (municipality: string) => {
    onChange(selected.filter((m) => m !== municipality))
  }

  // Agrupar selecionados por distrito para exibição
  const getDisplayText = () => {
    if (selected.length === 0) return placeholder

    // Contar distritos completos
    let fullDistrictsCount = 0
    let partialCount = 0

    Object.entries(PORTUGAL_DISTRICTS).forEach(([district, municipalities]) => {
      const allSelected = municipalities.every((m) => selected.includes(m))
      const someSelected = municipalities.some((m) => selected.includes(m))

      if (allSelected) {
        fullDistrictsCount++
      } else if (someSelected) {
        partialCount += municipalities.filter((m) => selected.includes(m)).length
      }
    })

    if (fullDistrictsCount > 0 && partialCount > 0) {
      return `${fullDistrictsCount} distrito${fullDistrictsCount > 1 ? 's' : ''} + ${partialCount} concelho${partialCount > 1 ? 's' : ''}`
    } else if (fullDistrictsCount > 0) {
      return `${fullDistrictsCount} distrito${fullDistrictsCount > 1 ? 's' : ''} completo${fullDistrictsCount > 1 ? 's' : ''}`
    } else {
      return `${selected.length} concelho${selected.length > 1 ? 's' : ''}`
    }
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">
              {getDisplayText()}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Pesquisar distrito ou concelho..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-80">
              <CommandEmpty>Nenhum resultado encontrado</CommandEmpty>
              <CommandGroup>
                {Object.entries(filteredDistricts).map(([districtName, municipalities]) => {
                  const isFullySelected = isDistrictFullySelected(districtName)
                  const isPartiallySelected = isDistrictPartiallySelected(districtName)
                  const selectedCount = getSelectedCount(districtName)
                  const isExpanded = expandedDistricts.includes(districtName)

                  return (
                    <div key={districtName} className="border-b last:border-b-0">
                      {/* District Header */}
                      <div className="flex items-center gap-2 px-2 py-2 hover:bg-accent">
                        <Checkbox
                          checked={isFullySelected ? true : isPartiallySelected ? "indeterminate" : false}
                          onCheckedChange={() => toggleDistrict(districtName)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-between text-left"
                          onClick={() => toggleDistrictExpand(districtName)}
                        >
                          <span className="font-medium text-sm">{districtName}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {selectedCount}/{municipalities.length}
                            </Badge>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Municipalities */}
                      {isExpanded && (
                        <div className="pl-8 pr-2 pb-2 grid grid-cols-2 gap-1">
                          {municipalities.map((municipality) => (
                            <div
                              key={municipality}
                              className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent cursor-pointer"
                              onClick={() => toggleMunicipality(municipality)}
                            >
                              <Checkbox
                                checked={selected.includes(municipality)}
                                onCheckedChange={() => toggleMunicipality(municipality)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-sm truncate">{municipality}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected badges - mostrar distritos completos e concelhos individuais */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {/* Mostrar distritos completos primeiro */}
          {Object.entries(PORTUGAL_DISTRICTS).map(([districtName, municipalities]) => {
            const isFullySelected = municipalities.every((m) => selected.includes(m))
            if (!isFullySelected) return null

            return (
              <Badge key={`district-${districtName}`} variant="secondary" className="gap-1">
                {districtName} (distrito)
                <button
                  type="button"
                  onClick={() => toggleDistrict(districtName)}
                  disabled={disabled}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}

          {/* Mostrar concelhos individuais (que não fazem parte de um distrito completo) */}
          {selected
            .filter(municipality => {
              // Encontrar o distrito deste concelho
              const district = Object.entries(PORTUGAL_DISTRICTS).find(([_, municipalities]) =>
                municipalities.includes(municipality)
              )
              if (!district) return true
              // Mostrar apenas se o distrito não está completamente selecionado
              return !district[1].every((m) => selected.includes(m))
            })
            .slice(0, 10) // Limitar a 10 badges individuais
            .map((municipality) => (
              <Badge key={municipality} variant="outline" className="gap-1">
                {municipality}
                <button
                  type="button"
                  onClick={() => handleRemove(municipality)}
                  disabled={disabled}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

          {/* Mostrar "+N mais" se houver muitos concelhos individuais */}
          {(() => {
            const individualCount = selected.filter(municipality => {
              const district = Object.entries(PORTUGAL_DISTRICTS).find(([_, municipalities]) =>
                municipalities.includes(municipality)
              )
              if (!district) return true
              return !district[1].every((m) => selected.includes(m))
            }).length

            if (individualCount > 10) {
              return (
                <Badge variant="outline" className="text-muted-foreground">
                  +{individualCount - 10} mais
                </Badge>
              )
            }
            return null
          })()}
        </div>
      )}
    </div>
  )
}
