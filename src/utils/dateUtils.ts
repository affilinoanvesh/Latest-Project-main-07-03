import { format, formatDistanceToNow } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// New Zealand timezone
const NZ_TIMEZONE = 'Pacific/Auckland';

/**
 * Format a date to New Zealand format (dd/MM/yyyy h:mm a)
 * This properly converts to NZ timezone
 */
export const formatNZDate = (date: Date): string => {
  return formatInTimeZone(date, NZ_TIMEZONE, 'dd/MM/yyyy h:mm a');
};

/**
 * Format a date to show how long ago it was (e.g., "2 hours ago")
 * This uses the browser's timezone for calculation
 */
export const formatRelativeTime = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true });
};

/**
 * Format a date to New Zealand date only format (dd/MM/yyyy)
 */
export const formatNZDateOnly = (date: Date): string => {
  return formatInTimeZone(date, NZ_TIMEZONE, 'dd/MM/yyyy');
};

/**
 * Format a date to New Zealand time only format (h:mm a)
 */
export const formatNZTimeOnly = (date: Date): string => {
  return formatInTimeZone(date, NZ_TIMEZONE, 'h:mm a');
};

/**
 * Get current date in New Zealand timezone
 */
export const getCurrentNZDate = (): Date => {
  return toZonedTime(new Date(), NZ_TIMEZONE);
}; 