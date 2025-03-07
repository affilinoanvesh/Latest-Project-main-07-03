import { Product, Order, InventoryItem } from '../../types';
import { syncService } from '../../services';
import { syncProducts } from './products';
import { syncOrdersByMonth } from './orders';
import { syncInventory } from './inventory';
import { hasApiCredentials } from './credentials';
import { format, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { safeUpdateProgress, isOlderThanOneDay, processBatches } from './utils';

// Sync all data from WooCommerce API
export const syncAllData = async (progressCallback?: (progress: number) => void): Promise<{ products: Product[], orders: Order[], inventory: InventoryItem[] }> => {
  // Check if API credentials are set
  const hasCredentials = await hasApiCredentials();
  if (!hasCredentials) {
    throw new Error('API credentials not set');
  }
  
  try {
    // Update progress if callback provided
    safeUpdateProgress(progressCallback, 5);
    
    // Get last sync times
    const lastSyncTimes = await getLastSyncTimes();
    
    // Sync products only if they haven't been synced before or it's been more than a day
    let products: Product[] = [];
    if (!lastSyncTimes.products || isOlderThanOneDay(lastSyncTimes.products)) {
      safeUpdateProgress(progressCallback, 10);
      products = await syncProducts(progress => {
        // Map product sync progress (0-100) to overall progress (10-40)
        const mappedProgress = 10 + (progress * 0.3);
        safeUpdateProgress(progressCallback, mappedProgress);
      });
    }
    
    // Sync orders for the last 6 months
    safeUpdateProgress(progressCallback, 40);
    const today = new Date();
    const sixMonthsAgo = subMonths(today, 6);
    const monthsToSync = eachMonthOfInterval({
      start: startOfMonth(sixMonthsAgo),
      end: endOfMonth(today)
    });
    
    // Process months in batches
    const orders = await processBatches(
      monthsToSync,
      async (batch: Date[]) => {
        // Process each month in the batch
        const batchResults: Order[] = [];
        for (const month of batch) {
          const monthOrders = await processMonth(month);
          batchResults.push(...monthOrders);
        }
        return batchResults;
      },
      1, // Process 1 month at a time
      500, // 500ms delay between months
      (progress: number) => {
        // Map order sync progress (0-100) to overall progress (40-70)
        const mappedProgress = 40 + (progress * 0.3);
        safeUpdateProgress(progressCallback, mappedProgress);
      }
    );
    
    // Sync inventory
    safeUpdateProgress(progressCallback, 70);
    const inventory = await syncInventory(progress => {
      // Map inventory sync progress (0-100) to overall progress (70-95)
      const mappedProgress = 70 + (progress * 0.25);
      safeUpdateProgress(progressCallback, mappedProgress);
    });
    
    // Final progress update
    safeUpdateProgress(progressCallback, 100);
    
    return { products, orders, inventory };
  } catch (error) {
    console.error('Error syncing all data:', error);
    throw error;
  }
  
  // Process a single month for orders
  async function processMonth(month: Date): Promise<Order[]> {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    // Format dates for API
    const startDate = format(monthStart, 'yyyy-MM-dd');
    const endDate = format(monthEnd, 'yyyy-MM-dd');
    
    // Sync orders for this month
    return await syncOrdersByMonth(monthStart, monthEnd);
  }
};

// Sync only products
export const syncProductsOnly = async (progressCallback?: (progress: number) => void): Promise<Product[]> => {
  // Check if API credentials are set
  const hasCredentials = await hasApiCredentials();
  if (!hasCredentials) {
    throw new Error('API credentials not set');
  }
  
  try {
    // Sync products
    const products = await syncProducts(progressCallback);
    return products;
  } catch (error) {
    console.error('Error syncing products:', error);
    throw error;
  }
};

// Get last sync times for all data types
export const getLastSyncTimes = async (): Promise<Record<string, Date | null>> => {
  try {
    const productSync = await syncService.getLastSyncByType('products');
    const orderSync = await syncService.getLastSyncByType('orders');
    const inventorySync = await syncService.getLastSyncByType('inventory');
    
    // Helper function to safely convert to Date
    const safeDate = (value: any): Date | null => {
      if (!value) return null;
      
      try {
        // If it's already a Date object, return it
        if (value instanceof Date) return value;
        
        // If it's a string or timestamp, convert to Date
        return new Date(value);
      } catch (error) {
        console.error('Error converting to Date:', error);
        return null;
      }
    };
    
    return {
      products: safeDate(productSync?.timestamp),
      orders: safeDate(orderSync?.timestamp),
      inventory: safeDate(inventorySync?.timestamp)
    };
  } catch (error) {
    console.error('Error getting last sync times:', error);
    return {
      products: null,
      orders: null,
      inventory: null
    };
  }
};

// Update last sync time for a data type
export const updateLastSync = async (type: string): Promise<void> => {
  try {
    await syncService.updateLastSync(type, new Date());
  } catch (error) {
    console.error(`Error updating last sync time for ${type}:`, error);
  }
};