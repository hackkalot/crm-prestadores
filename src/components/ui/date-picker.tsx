'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Calendar as CalendarIcon, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  clearable?: boolean
  fromDate?: Date
  toDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  disabled = false,
  className,
  clearable = true,
  fromDate,
  toDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(undefined)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            <span className="flex-1">{format(value, 'dd/MM/yyyy', { locale: pt })}</span>
          ) : (
            <span className="flex-1">{placeholder}</span>
          )}
          {clearable && value && (
            <X
              className="h-4 w-4 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={handleSelect}
          initialFocus
          fromDate={fromDate}
          toDate={toDate}
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  from?: Date | null
  to?: Date | null
  onFromChange?: (date: Date | undefined) => void
  onToChange?: (date: Date | undefined) => void
  fromPlaceholder?: string
  toPlaceholder?: string
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  fromPlaceholder = 'Data inicio',
  toPlaceholder = 'Data fim',
  disabled = false,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DatePicker
        value={from}
        onChange={onFromChange}
        placeholder={fromPlaceholder}
        disabled={disabled}
        toDate={to || undefined}
        className="flex-1"
      />
      <span className="text-muted-foreground text-sm">ate</span>
      <DatePicker
        value={to}
        onChange={onToChange}
        placeholder={toPlaceholder}
        disabled={disabled}
        fromDate={from || undefined}
        className="flex-1"
      />
    </div>
  )
}
