/**
 * Format a number as NZD currency
 */
export function formatCurrency(amount: number | string | undefined): string {
  if (amount === undefined) return '$0.00';
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
}

/**
 * Format a number with commas for thousands
 */
export function formatNumber(num: number | string | undefined): string {
  if (num === undefined) return '0';
  
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  return new Intl.NumberFormat('en-NZ').format(numValue);
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number | string | undefined, decimals: number = 2): string {
  if (value === undefined) return '0%';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return `${numValue.toFixed(decimals)}%`;
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string | number | undefined): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  return new Intl.DateTimeFormat('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(dateObj);
} 