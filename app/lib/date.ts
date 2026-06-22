import { format, formatDistanceToNow, parseISO } from 'date-fns'

/**
 * Formats an ISO date string into a human-readable date (e.g., "Jan 5, 2024")
 * @param dateString - ISO 8601 date string to format
 * @returns Formatted date string in "MMM d, yyyy" format
 */
export function formatDate(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'MMM d, yyyy')
}

/**
 * Formats an ISO date string into a human-readable date and time (e.g., "Jan 5, 2024 3:30 PM")
 * @param dateString - ISO 8601 date string to format
 * @returns Formatted date-time string in "MMM d, yyyy h:mm a" format
 */
export function formatDateTime(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'MMM d, yyyy h:mm a')
}

/**
 * Converts an ISO date string into a relative time description (e.g., "3 hours ago")
 * @param dateString - ISO 8601 date string to convert
 * @returns Relative time string with suffix (e.g., "2 days ago")
 */
export function timeAgo(dateString: string): string {
  const date = parseISO(dateString)
  return formatDistanceToNow(date, { addSuffix: true })
}

/**
 * Checks whether two ISO date strings represent the same calendar day
 * @param date1 - First ISO 8601 date string
 * @param date2 - Second ISO 8601 date string
 * @returns True if both dates fall on the same year, month, and day
 */
export function isSameDay(date1: string, date2: string): boolean {
  const d1 = parseISO(date1)
  const d2 = parseISO(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

/**
 * Returns the current date as a string in "yyyy-MM-dd" format
 * @returns Today's date formatted as "yyyy-MM-dd"
 */
export function getCurrentDateString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
