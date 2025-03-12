/**
 * Utility functions for managing browser cache and storage
 */

/**
 * Clear all browser storage (localStorage and sessionStorage)
 * This will remove all data stored in the browser's local storage
 * but will not affect data stored in Supabase
 */
export const clearBrowserStorage = async (): Promise<void> => {
  try {
    // Clear localStorage
    localStorage.clear();
    console.log('localStorage cleared successfully');
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('sessionStorage cleared successfully');
    
    // Clear IndexedDB if it exists
    const databases = await window.indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        window.indexedDB.deleteDatabase(db.name);
        console.log(`IndexedDB database "${db.name}" deleted successfully`);
      }
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error clearing browser storage:', error);
    return Promise.reject(error);
  }
};

/**
 * Get an estimate of how much data is stored in localStorage
 * @returns The size in KB
 */
export const getLocalStorageSize = (): number => {
  let totalSize = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalSize += localStorage[key].length * 2; // Approximate size in bytes (UTF-16 encoding)
    }
  }
  return Math.round(totalSize / 1024); // Convert to KB
}; 