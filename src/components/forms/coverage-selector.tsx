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
import { PORTUGAL_DISTRICTS } from '@/lib/data/portugal-districts'

interface CoverageSelectorProps {
  selectedMunicipalities: string[]
  onChange: (selected: string[]) => void
}

export function CoverageSelector({ selectedMunicipalities, onChange }: CoverageSelectorProps) {
  const [search, setSearch] = useState('')
  const [filteredDistricts, setFilteredDistricts] = useState<Record<string, string[]>>(PORTUGAL_DISTRICTS)

  // Filtrar concelhos por pesquisa
  useEffect(() => {
    if (!search.trim()) {
      setFilteredDistricts(PORTUGAL_DISTRICTS)
      return
    }

    const searchLower = search.toLowerCase()
    const filtered: Record<string, string[]> = {}

    Object.entries(PORTUGAL_DISTRICTS).forEach(([district, municipalities]) => {
      const matchingMunicipalities = municipalities.filter((m) =>
        m.toLowerCase().includes(searchLower)
      )
      if (matchingMunicipalities.length > 0) {
        filtered[district] = matchingMunicipalities
      }
    })

    setFilteredDistricts(filtered)
  }, [search])

  const toggleMunicipality = (municipality: string) => {
    if (selectedMunicipalities.includes(municipality)) {
      onChange(selectedMunicipalities.filter((m) => m !== municipality))
    } else {
      onChange([...selectedMunicipalities, municipality])
    }
  }

  const toggleDistrict = (districtName: string) => {
    const municipalities = PORTUGAL_DISTRICTS[districtName]
    if (!municipalities) return

    const allSelected = municipalities.every((m) =>
      selectedMunicipalities.includes(m)
    )

    if (allSelected) {
      onChange(selectedMunicipalities.filter((m) => !municipalities.includes(m)))
    } else {
      const newSelected = [...selectedMunicipalities]
      municipalities.forEach((m) => {
        if (!newSelected.includes(m)) {
          newSelected.push(m)
        }
      })
      onChange(newSelected)
    }
  }

  const isDistrictFullySelected = (districtName: string) => {
    const municipalities = PORTUGAL_DISTRICTS[districtName]
    if (!municipalities) return false
    return municipalities.every((m) => selectedMunicipalities.includes(m))
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar concelho..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Total selecionado: <strong>{selectedMunicipalities.length}</strong> concelhos
      </div>

      <Accordion type="multiple" className="space-y-2">
        {Object.entries(filteredDistricts).map(([districtName, municipalities]) => {
          const isFullySelected = isDistrictFullySelected(districtName)
          const selectedCount = municipalities.filter((m) =>
            selectedMunicipalities.includes(m)
          ).length

          return (
            <AccordionItem key={districtName} value={districtName} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    checked={isFullySelected}
                    onCheckedChange={() => toggleDistrict(districtName)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="font-medium">{districtName}</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedCount}/{municipalities.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                  {municipalities.map((municipality) => (
                    <div key={municipality} className="flex items-center gap-2">
                      <Checkbox
                        id={`${districtName}-${municipality}`}
                        checked={selectedMunicipalities.includes(municipality)}
                        onCheckedChange={() => toggleMunicipality(municipality)}
                      />
                      <label
                        htmlFor={`${districtName}-${municipality}`}
                        className="text-sm cursor-pointer flex-1 leading-tight"
                      >
                        {municipality}
                      </label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {Object.keys(filteredDistricts).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum concelho encontrado
        </div>
      )}
    </div>
  )
}
