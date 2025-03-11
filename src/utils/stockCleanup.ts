import { cleanupDuplicatePurchaseMovements } from '../db/operations/stockReconciliation';

/**
 * Utility function to clean up duplicate purchase movements
 * This can be called from the UI to fix issues with duplicate stock movements
 */
export async function cleanupDuplicatePurchases(): Promise<{ 
  success: boolean; 
  removed: number; 
  errors: string[] 
}> {
  try {
    const result = await cleanupDuplicatePurchaseMovements();
    
    return {
      success: true,
      ...result
    };
  } catch (error: any) {
    console.error('Error cleaning up duplicate purchase movements:', error);
    return {
      success: false,
      removed: 0,
      errors: [error.message || 'An unknown error occurred']
    };
  }
} 