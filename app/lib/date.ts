import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function formatDate(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'MMM d, yyyy')
}

export function formatDateTime(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'MMM d, yyyy h:mm a')
}

export function timeAgo(dateString: string): string {
  const date = parseISO(dateString)
  return formatDistanceToNow(date, { addSuffix: true })
}

export function isSameDay(date1: string, date2: string): boolean {
  const d1 = parseISO(date1)
  const d2 = parseISO(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function getCurrentDateString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
