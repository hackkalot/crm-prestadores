'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Check } from 'lucide-react'

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  name?: string
  disabled: boolean
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select')
  }
  return context
}

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
  children: React.ReactNode
}

function Select({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  name,
  disabled = false,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)

  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue)
      }
      onValueChange?.(newValue)
      setOpen(false)
    },
    [isControlled, onValueChange]
  )

  return (
    <SelectContext.Provider
      value={{ value, onValueChange: handleValueChange, open, setOpen, name, disabled }}
    >
      <div className="relative">
        {name && <input type="hidden" name={name} value={value} />}
        {children}
      </div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, disabled } = useSelectContext()

    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={() => !disabled && setOpen(!open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

interface SelectValueProps {
  placeholder?: string
}

function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext()

  // Get the label from the selected item
  const [label, setLabel] = React.useState(placeholder || '')

  React.useEffect(() => {
    if (!value) {
      setLabel(placeholder || '')
    }
  }, [value, placeholder])

  return (
    <span className={cn(!value && 'text-muted-foreground')}>
      {value ? <SelectValueLabel value={value} placeholder={placeholder} /> : placeholder}
    </span>
  )
}

function SelectValueLabel({ value, placeholder }: { value: string; placeholder?: string }) {
  const [label, setLabel] = React.useState(placeholder || value)

  React.useEffect(() => {
    // Try to find the label from the DOM
    const item = document.querySelector(`[data-select-value="${value}"]`)
    if (item) {
      setLabel(item.textContent || value)
    } else {
      setLabel(value)
    }
  }, [value])

  return <>{label}</>
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function SelectContent({ className, children, ...props }: SelectContentProps) {
  const { open, setOpen } = useSelectContext()
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 top-full mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
        className
      )}
      {...props}
    >
      <div className="p-1">{children}</div>
    </div>
  )
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useSelectContext()
    const isSelected = selectedValue === value

    return (
      <div
        ref={ref}
        data-select-value={value}
        role="option"
        aria-selected={isSelected}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
          isSelected && 'bg-accent',
          className
        )}
        onClick={() => onValueChange(value)}
        {...props}
      >
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          {isSelected && <Check className="h-4 w-4" />}
        </span>
        {children}
      </div>
    )
  }
)
SelectItem.displayName = 'SelectItem'

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
