import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachMonthOfInterval, eachQuarterOfInterval, eachYearOfInterval } from 'date-fns';

// Helper function to group data by period
export const groupDataByPeriod = <T,>(
  data: T[], 
  valueAccessor: (item: T) => number,
  dateField: keyof T,
  periodType: string
) => {
  const periodMap = new Map<string, number>();
  
  // Determine periods based on periodType
  let periods: Date[] = [];
  
  if (!data.length) return [];
  
  // Find min and max dates in the data
  let minDate = new Date();
  let maxDate = new Date(0); // Start with earliest possible date
  
  data.forEach(item => {
    const date = new Date(item[dateField] as string);
    if (date < minDate) minDate = date;
    if (date > maxDate) maxDate = date;
  });
  
  // Generate periods based on period type
  switch (periodType) {
    case 'daily':
      // For daily, we'd need a different approach as there could be too many days
      // This is a simplified version that just uses the actual dates in the data
      data.forEach(item => {
        const date = new Date(item[dateField] as string);
        const period = format(date, 'yyyy-MM-dd');
        if (!periodMap.has(period)) {
          periodMap.set(period, 0);
        }
      });
      break;
      
    case 'weekly':
      // Similar to daily, we'll use the actual weeks in the data
      data.forEach(item => {
        const date = new Date(item[dateField] as string);
        const period = format(date, "yyyy-'W'ww"); // ISO week format
        if (!periodMap.has(period)) {
          periodMap.set(period, 0);
        }
      });
      break;
      
    case 'monthly':
      periods = eachMonthOfInterval({
        start: startOfMonth(minDate),
        end: endOfMonth(maxDate)
      });
      
      periods.forEach(date => {
        periodMap.set(format(date, 'MMM yyyy'), 0);
      });
      break;
      
    case 'quarterly':
      periods = eachQuarterOfInterval({
        start: startOfQuarter(minDate),
        end: endOfQuarter(maxDate)
      });
      
      periods.forEach(date => {
        periodMap.set(format(date, 'QQQ yyyy'), 0);
      });
      break;
      
    case 'yearly':
      periods = eachYearOfInterval({
        start: startOfYear(minDate),
        end: endOfYear(maxDate)
      });
      
      periods.forEach(date => {
        periodMap.set(format(date, 'yyyy'), 0);
      });
      break;
      
    default: // Default to monthly
      periods = eachMonthOfInterval({
        start: startOfMonth(minDate),
        end: endOfMonth(maxDate)
      });
      
      periods.forEach(date => {
        periodMap.set(format(date, 'MMM yyyy'), 0);
      });
  }
  
  // Aggregate data by period
  data.forEach(item => {
    const date = new Date(item[dateField] as string);
    let period: string;
    
    switch (periodType) {
      case 'daily':
        period = format(date, 'yyyy-MM-dd');
        break;
      case 'weekly':
        period = format(date, "yyyy-'W'ww");
        break;
      case 'monthly':
        period = format(date, 'MMM yyyy');
        break;
      case 'quarterly':
        period = format(date, 'QQQ yyyy');
        break;
      case 'yearly':
        period = format(date, 'yyyy');
        break;
      default:
        period = format(date, 'MMM yyyy');
    }
    
    if (periodMap.has(period)) {
      periodMap.set(period, periodMap.get(period)! + valueAccessor(item));
    }
  });
  
  // Convert to array
  return Array.from(periodMap.entries()).map(([period, value]) => ({
    period,
    value
  }));
};

// Format currency
export const formatCurrency = (value: number) => {
  if (value === undefined || value === null || isNaN(value)) {
    console.error('Invalid currency value:', value);
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
};

// Format percentage
export const formatPercentage = (value: number) => {
  if (value === undefined || value === null || isNaN(value)) {
    console.error('Invalid percentage value:', value);
    return '0.00%';
  }
  return `${value.toFixed(2)}%`;
};