import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: Array<string | false | null | undefined>) => twMerge(clsx(inputs))

export const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)

export const formatPercent = (value: number, digits = 1) => `${formatNumber(value, digits)}%`

export const formatCurrency = (value: number, currency = 'USD', digits = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: digits,
  }).format(value)

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

export const title = (value: string) =>
  value
    .split(/[\s-]/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')

export const delay = <T,>(value: T, ms = 250) =>
  new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(value), ms)
  })

export const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')

export const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0)

export const average = (values: number[]) => (values.length ? sum(values) / values.length : 0)
