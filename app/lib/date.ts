import { format, formatDistanceToNow, parseISO } from 'date-fns'

/** Formats an ISO date string as a short readable date (e.g., "Jan 5, 2024"). */
export function formatDate(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'MMM d, yyyy')
}

/** Formats an ISO date string as a date with time (e.g., "Jan 5, 2024 3:30 PM"). */
export function formatDateTime(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'MMM d, yyyy h:mm a')
}

/** Returns a human-readable relative time string (e.g., "3 hours ago"). */
export function timeAgo(dateString: string): string {
  const date = parseISO(dateString)
  return formatDistanceToNow(date, { addSuffix: true })
}

/** Checks whether two ISO date strings fall on the same calendar day. */
export function isSameDay(date1: string, date2: string): boolean {
  const d1 = parseISO(date1)
  const d2 = parseISO(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

/** Returns today's date formatted as "yyyy-MM-dd". */
export function getCurrentDateString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
