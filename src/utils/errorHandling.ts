/**
 * Formats an error into a user-friendly message
 * @param error The error object or value
 * @param prefix Optional prefix for the error message
 * @returns A formatted error message string
 */
export function formatErrorMessage(error: unknown, prefix = 'An error occurred'): string {
  let errorMessage = prefix;
  
  if (error instanceof Error) {
    errorMessage += ': ' + error.message;
  } else if (typeof error === 'object' && error !== null) {
    // Try to extract useful information from the error object
    const errorObj = error as any;
    if (errorObj.message) {
      errorMessage += ': ' + errorObj.message;
    } else if (errorObj.error) {
      errorMessage += ': ' + (typeof errorObj.error === 'string' ? errorObj.error : JSON.stringify(errorObj.error));
    } else if (errorObj.code) {
      errorMessage += ': Error code ' + errorObj.code;
    } else {
      // If we can't extract specific error info, stringify the whole object
      try {
        errorMessage += ': ' + JSON.stringify(error);
      } catch (e) {
        errorMessage += ': [Object cannot be stringified]';
      }
    }
  } else if (error !== undefined && error !== null) {
    errorMessage += ': ' + String(error);
  }
  
  return errorMessage;
} 