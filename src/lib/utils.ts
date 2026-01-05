import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function formatPhoneNumber(phone: string) {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // Format Portuguese phone numbers
  if (digits.startsWith('351')) {
    const local = digits.slice(3)
    return `+351 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
  }

  return phone
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}
