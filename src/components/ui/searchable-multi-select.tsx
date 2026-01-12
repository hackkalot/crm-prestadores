'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

export interface SearchableMultiSelectOption {
  value: string
  label: string
}

interface SearchableMultiSelectProps {
  options: SearchableMultiSelectOption[]
  values: string[]
  onValuesChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  maxDisplayed?: number
  maxWidth?: string
}

export function SearchableMultiSelect({
  options,
  values,
  onValuesChange,
  placeholder = 'Selecionar...',
  searchPlaceholder = 'Pesquisar...',
  emptyText = 'Nenhum resultado encontrado.',
  disabled = false,
  className,
  maxDisplayed = 2,
  maxWidth = '400px',
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selectedOptions = options.filter((option) => values.includes(option.value))

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    const searchLower = search.toLowerCase()
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    )
  }, [options, search])

  const toggleOption = (value: string) => {
    if (values.includes(value)) {
      onValuesChange(values.filter((v) => v !== value))
    } else {
      onValuesChange([...values, value])
    }
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValuesChange([])
  }

  // Select all filtered options
  const selectAllFiltered = () => {
    const filteredValues = filteredOptions.map((o) => o.value)
    const newValues = [...new Set([...values, ...filteredValues])]
    onValuesChange(newValues)
  }

  // Check if all filtered options are selected
  const allFilteredSelected = React.useMemo(() => {
    if (filteredOptions.length === 0) return false
    return filteredOptions.every((option) => values.includes(option.value))
  }, [filteredOptions, values])

  const getDisplayText = () => {
    if (selectedOptions.length === 0) {
      return placeholder
    }
    if (selectedOptions.length <= maxDisplayed) {
      return selectedOptions.map((o) => o.label).join(', ')
    }
    return `${selectedOptions.length} selecionados`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate text-left flex-1">
            {getDisplayText()}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {values.length > 0 && (
              <span
                onClick={clearAll}
                className="h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: '100%', maxWidth }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {/* Select all filtered button */}
              {search && filteredOptions.length > 0 && !allFilteredSelected && (
                <CommandItem
                  onSelect={selectAllFiltered}
                  className="text-primary font-medium"
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Selecionar todos ({filteredOptions.length})
                </CommandItem>
              )}
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => toggleOption(option.value)}
                >
                  <div
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      values.includes(option.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'opacity-50 [&_svg]:invisible'
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
