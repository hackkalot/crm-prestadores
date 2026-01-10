'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOptions = options.filter((option) => values.includes(option.value))

  const toggleOption = (value: string) => {
    if (values.includes(value)) {
      onValuesChange(values.filter((v) => v !== value))
    } else {
      onValuesChange([...values, value])
    }
  }

  const removeOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onValuesChange(values.filter((v) => v !== value))
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValuesChange([])
  }

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
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
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
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
