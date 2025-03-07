import { syncService } from '../../services';

export async function updateLastSync(type: string): Promise<void> {
  try {
    await syncService.updateLastSync(type, new Date());
  } catch (error) {
    console.error('Error updating last sync:', error);
  }
}

export async function getLastSync(type: string): Promise<Date | null> {
  try {
    const syncRecord = await syncService.getLastSyncByType(type);
    if (!syncRecord) return null;
    
    // Handle different timestamp formats
    const timestamp = syncRecord.timestamp;
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    console.error('Invalid timestamp format:', timestamp);
    return null;
  } catch (error) {
    console.error('Error getting last sync:', error);
    return null;
  }
}

export async function getLastSyncTimes(): Promise<{
  products: Date | null;
  orders: Date | null;
  inventory: Date | null;
}> {
  try {
    const productsSync = await getLastSync('products');
    const ordersSync = await getLastSync('orders');
    const inventorySync = await getLastSync('inventory');
    
    return {
      products: productsSync,
      orders: ordersSync,
      inventory: inventorySync
    };
  } catch (error) {
    console.error('Error getting last sync times:', error);
    return {
      products: null,
      orders: null,
      inventory: null
    };
  }
}