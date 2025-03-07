/**
 * Utility functions for API services
 */

/**
 * Safely update progress without causing Symbol cloning errors
 * This function ensures that progress callbacks are executed safely
 * and any errors are caught and logged without crashing the application
 */
export const safeUpdateProgress = (
  progressCallback: ((progress: number) => void) | undefined, 
  progress: number
): void => {
  if (!progressCallback || typeof progressCallback !== 'function') {
    return;
  }

  try {
    // Only pass a primitive number value to avoid Symbol cloning errors
    // Ensure the progress is a simple number between 0-100
    const safeProgress = Math.min(Math.max(0, Math.round(progress)), 100);
    
    // Use requestAnimationFrame for better performance and to avoid Symbol cloning issues
    // This also helps with UI updates by syncing with the browser's render cycle
    window.requestAnimationFrame(() => {
      try {
        progressCallback(safeProgress);
      } catch (innerError) {
        // Silently handle errors to prevent crashes
      }
    });
  } catch (error) {
    // Silently handle errors to prevent crashes
  }
};

/**
 * Helper function to check if a date is older than one day
 */
export const isOlderThanOneDay = (date: Date | string | null): boolean => {
  if (!date) return true;
  
  try {
    const oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = new Date();
    
    // Convert to Date object if it's a string
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date string:', date);
        return true;
      }
    } else {
      console.warn('Unexpected date type:', typeof date);
      return true;
    }
    
    // Get timestamp
    const timestamp = dateObj.getTime();
    
    // Check if timestamp is valid
    if (isNaN(timestamp)) {
      console.warn('Invalid date timestamp:', date);
      return true; // Assume it's older if invalid
    }
    
    return (now.getTime() - timestamp) > oneDayInMs;
  } catch (error) {
    console.error('Error checking if date is older than one day:', error);
    // If there's an error, assume it's older than one day to trigger a sync
    return true;
  }
};

/**
 * Format date to NZ format (dd/MM/yyyy)
 */
export const formatNZDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format date to ISO string with NZ timezone offset
 */
export const formatDateForAPI = (date: Date): string => {
  // New Zealand is UTC+12 or UTC+13 during daylight saving
  // For December (month 11), we need to be extra careful with timezone handling
  if (date.getMonth() === 11) {
    // For December, ensure we're using the correct timezone offset
    // Clone the date to avoid modifying the original
    const adjustedDate = new Date(date);
    
    // If it's the end of December, add an extra hour to ensure we capture all orders
    if (date.getDate() >= 28) {
      adjustedDate.setHours(adjustedDate.getHours() + 1);
      console.log(`End of December detected - Adding extra hour buffer: ${date.toISOString()} -> ${adjustedDate.toISOString()}`);
    }
    
    return adjustedDate.toISOString();
  }
  
  // For other months, use the standard ISO string
  return date.toISOString();
};

/**
 * Chunk an array into smaller arrays of specified size
 * Used for processing large datasets in smaller batches
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Get NZ timezone string
 */
export const getNZTimezone = (): string => {
  // Determine if NZ is currently in daylight saving time
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  
  // NZ DST typically runs from late September to early April
  // This is a simplified check - for production, use a proper timezone library
  const isDST = now.getMonth() > 8 || now.getMonth() < 4;
  
  return isDST ? 'NZDT' : 'NZST';
};

/**
 * Get NZ timezone offset in hours
 */
export const getNZTimezoneOffset = (): number => {
  // NZ is UTC+12, or UTC+13 during daylight saving
  const isDST = getNZTimezone() === 'NZDT';
  return isDST ? 13 : 12;
};

/**
 * Convert a date to NZ timezone
 */
export const convertToNZTimezone = (date: Date | string): Date | null => {
  try {
    // Convert string to Date if necessary
    let dateObj: Date;
    if (typeof date === 'string') {
      // Handle WordPress date format
      const wpMatch = date.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      if (wpMatch) {
        date = date.replace(' ', 'T') + 'Z';
      }
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return null;
    }
    
    // Validate the date
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
    // Get NZ offset
    const nzOffset = getNZTimezoneOffset();
    
    // Convert to UTC first
    const utcDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
    
    // Then convert to NZ timezone
    return new Date(utcDate.getTime() + nzOffset * 3600000);
  } catch (error) {
    return null;
  }
};

/**
 * Process data in batches with delay to prevent UI freezing
 * @param items Items to process
 * @param processFn Function to process each batch
 * @param batchSize Size of each batch
 * @param delayMs Delay between batches in milliseconds
 * @param progressCallback Optional callback for progress updates
 */
export const processBatches = async <T, R>(
  items: T[],
  processFn: (batch: T[]) => Promise<R[]>,
  batchSize: number = 10,
  delayMs: number = 50,
  progressCallback?: (progress: number) => void
): Promise<R[]> => {
  const batches = chunkArray(items, batchSize);
  let results: R[] = [];
  
  for (let i = 0; i < batches.length; i++) {
    // Process current batch
    const batchResults = await processFn(batches[i]);
    results = [...results, ...batchResults];
    
    // Update progress
    const progress = Math.round(((i + 1) / batches.length) * 100);
    safeUpdateProgress(progressCallback, progress);
    
    // Add delay between batches to prevent UI freezing
    if (i < batches.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
};

/**
 * Filter an object to only include specified fields
 * Useful for filtering API responses to match database schema
 * 
 * @param obj The object to filter
 * @param allowedFields Array of field names to keep
 * @returns A new object with only the allowed fields
 */
export const filterObjectToSchema = <T extends Record<string, any>>(
  obj: T, 
  allowedFields: string[]
): Partial<T> => {
  return allowedFields.reduce((filtered, field) => {
    if (field in obj) {
      (filtered as any)[field] = obj[field];
    }
    return filtered;
  }, {} as Partial<T>);
};

/**
 * Sanitize JSONB fields to ensure they are valid JSON objects or arrays
 * @param obj The object containing JSONB fields
 * @param jsonbFields Array of field names that should be JSONB
 * @returns A new object with sanitized JSONB fields
 */
export const sanitizeJsonbFields = <T extends Record<string, any>>(
  obj: T, 
  jsonbFields: string[]
): T => {
  const result = { ...obj } as any;
  
  jsonbFields.forEach(field => {
    if (field in result) {
      // If the field is an empty string, set it to null
      if (result[field] === '') {
        result[field] = null;
      }
      // If the field is a string, try to parse it as JSON
      else if (typeof result[field] === 'string') {
        try {
          result[field] = JSON.parse(result[field]);
        } catch (error) {
          // If parsing fails, set to null
          console.warn(`Failed to parse ${field} as JSON:`, error);
          result[field] = null;
        }
      }
      // If the field is already an object or array, leave it as is
    }
  });
  
  return result as T;
};

/**
 * Safely convert any value to a valid ISO date string for Supabase
 * This ensures consistent date formatting when sending data to Supabase
 */
export const toSupabaseDateString = (value: Date | string | number | null): string | null => {
  if (!value) {
    return null;
  }
  
  try {
    let dateObj: Date;
    
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        console.warn('Invalid Date object:', value);
        return null;
      }
      dateObj = value;
    } else if (typeof value === 'string') {
      const wpMatch = value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      if (wpMatch) {
        const originalValue = value;
        value = value.replace(' ', 'T') + 'Z';
      }
      
      dateObj = new Date(value);
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date string:', value);
        return null;
      }
    } else if (typeof value === 'number') {
      const originalValue = value;
      const timestamp = value < 1e12 ? value * 1000 : value;
      
      dateObj = new Date(timestamp);
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid timestamp number:', value);
        return null;
      }
    } else {
      console.warn('Invalid date value type:', typeof value);
      return null;
    }
    
    const result = dateObj.toISOString();
    return result;
  } catch (error) {
    console.error('Error converting to Supabase date string:', error);
    return null;
  }
};

/**
 * Safely parse a date string from Supabase into a Date object
 */
export const fromSupabaseDate = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }
  
  try {
    let dateString = value;
    
    const wpMatch = value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    if (wpMatch) {
      const originalValue = dateString;
      dateString = value.replace(' ', 'T') + 'Z';
    }
    
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date string:', value);
      return null;
    }
    
    return dateObj;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Convert a date to WordPress format (YYYY-MM-DD HH:MM:SS)
 */
export const toWordPressDateString = (date: Date | null): string | null => {
  if (!date) return null;
  
  try {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid Date object:', date);
      return null;
    }
    
    const pad = (num: number): string => num.toString().padStart(2, '0');
    
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } catch (error) {
    console.error('Error converting to WordPress date string:', error);
    return null;
  }
};

/**
 * Validate a date value and ensure it's a proper Date object
 */
export const validateDate = (value: any): Date | null => {
  if (!value) return null;
  
  try {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    
    if (typeof value === 'string') {
      const dateObj = new Date(value);
      return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    
    if (typeof value === 'number') {
      const timestamp = value < 1e12 ? value * 1000 : value;
      const dateObj = new Date(timestamp);
      return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    
    return null;
  } catch (error) {
    console.error('Error validating date:', error);
    return null;
  }
};