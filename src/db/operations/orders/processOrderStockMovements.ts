import { Order, OrderItem } from '../../../types';
import { addStockMovement, invalidateReconciliationCache, getStockMovementsBySku } from '../stockReconciliation';
import { supabase } from '../../../services/supabase';
import { settingsService } from '../../../services';
import { syncService } from '../../../services';
import { updateLastSync } from '../sync';

/**
 * Process an order and create stock movements for each line item
 * This should be called when an order is completed or processed
 */
export async function processOrderStockMovements(order: Order): Promise<void> {
  try {
    console.log(`Processing stock movements for order #${order.number}`);
    
    // Check if we should exclude on-hold orders
    const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
    
    // Skip on-hold orders if the setting is enabled
    if (excludeOnHold && order.status === 'on-hold') {
      console.log(`Skipping on-hold order #${order.number} as per settings`);
      return;
    }
    
    // Only process completed orders
    if (order.status !== 'completed' && order.status !== 'processing') {
      console.log(`Skipping order #${order.number} with status ${order.status}`);
      return;
    }
    
    // Process each line item
    for (const item of order.line_items) {
      await createStockMovementForOrderItem(order, item);
    }
    
    // Invalidate reconciliation cache after processing
    invalidateReconciliationCache();
    
    console.log(`Finished processing stock movements for order #${order.number}`);
  } catch (error) {
    console.error('Error processing order stock movements:', error);
    throw error;
  }
}

/**
 * Create a stock movement for a single order item
 */
async function createStockMovementForOrderItem(order: Order, item: OrderItem): Promise<void> {
  try {
    // Skip items without SKU
    if (!item.sku) {
      console.warn(`Order item ${item.id} has no SKU, skipping stock movement`);
      return;
    }
    
    // Check if a stock movement for this order item already exists
    const { data: existingMovements, error: queryError } = await supabase
      .from('stock_movements')
      .select('id')
      .eq('sku', item.sku)
      .eq('movement_type', 'sale')
      .eq('reference_id', order.number)
      .eq('quantity', -Math.abs(item.quantity));
    
    if (queryError) {
      console.error(`Error checking for existing stock movements: ${queryError.message}`);
    } else if (existingMovements && existingMovements.length > 0) {
      console.log(`Stock movement for order #${order.number}, item ${item.sku} already exists. Skipping.`);
      return;
    }
    
    // Create a negative stock movement (sales reduce stock)
    await addStockMovement({
      sku: item.sku,
      product_id: item.product_id,
      variation_id: item.variation_id,
      movement_date: order.date_completed || order.date_created || new Date(),
      // Use negative quantity as sales reduce stock
      quantity: -Math.abs(item.quantity),
      movement_type: 'sale',
      reference_id: order.number,
      notes: `Order #${order.number}`
    });
  } catch (error) {
    console.error(`Error creating stock movement for order item ${item.id}:`, error);
    throw error;
  }
}

/**
 * Process multiple orders and create stock movements
 */
export async function processMultipleOrdersStockMovements(orders: Order[]): Promise<{
  processed: number;
  failed: number;
  errors: Array<{ order: string; error: string }>;
}> {
  try {
    // Check if we should exclude on-hold orders
    const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
    
    // Filter out on-hold orders if the setting is enabled
    const filteredOrders = excludeOnHold 
      ? orders.filter(order => order.status !== 'on-hold')
      : orders;
    
    const result = {
      processed: 0,
      failed: 0,
      errors: [] as Array<{ order: string; error: string }>
    };
    
    for (const order of filteredOrders) {
      try {
        await processOrderStockMovements(order);
        result.processed++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          order: order.number,
          error: error.message || 'Unknown error'
        });
      }
    }
    
    return result;
  } catch (error: any) {
    console.error('Error processing multiple orders:', error);
    throw error;
  }
}

/**
 * Process only new or updated orders since the last processing time
 * This is an optimized version that only processes orders that have been created or updated
 * since the last time this function was called
 */
export async function processNewOrdersStockMovements(orders: Order[]): Promise<{
  processed: number;
  skipped: number;
  failed: number;
  errors: Array<{ order: string; error: string }>;
  lastProcessedTime: Date;
}> {
  try {
    console.log('Processing new orders for stock movements');
    
    // Get the last processing time from sync service instead of settings
    const lastSyncRecord = await syncService.getLastSyncByType('stock_movements');
    const lastProcessingTime = lastSyncRecord?.timestamp || null;
    
    // Current time to use as the new last processing time
    const currentTime = new Date();
    
    console.log(`Last stock movements processing time: ${lastProcessingTime ? lastProcessingTime.toISOString() : 'Never'}`);
    
    // Check if we should exclude on-hold orders
    const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
    
    // Filter orders:
    // 1. Remove on-hold orders if the setting is enabled
    // 2. Only include orders that were created or updated after the last processing time
    const filteredOrders = orders.filter(order => {
      // Skip on-hold orders if the setting is enabled
      if (excludeOnHold && order.status === 'on-hold') {
        return false;
      }
      
      // Only process completed or processing orders
      if (order.status !== 'completed' && order.status !== 'processing') {
        return false;
      }
      
      // If we have a last processing time, only include orders that were created or updated after that time
      if (lastProcessingTime) {
        // Use date_created as the reference date since Order type doesn't have date_modified
        const orderDate = order.date_created || new Date();
        return orderDate > lastProcessingTime;
      }
      
      // If we don't have a last processing time, include all orders
      return true;
    });
    
    console.log(`Found ${filteredOrders.length} orders to process out of ${orders.length} total orders`);
    
    const result = {
      processed: 0,
      skipped: orders.length - filteredOrders.length,
      failed: 0,
      errors: [] as Array<{ order: string; error: string }>,
      lastProcessedTime: currentTime
    };
    
    // Process each filtered order
    for (const order of filteredOrders) {
      try {
        await processOrderStockMovements(order);
        result.processed++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          order: order.number,
          error: error.message || 'Unknown error'
        });
      }
    }
    
    // Update the last processing time using the sync service
    if (result.processed > 0 || !lastProcessingTime) {
      await syncService.updateLastSync('stock_movements', currentTime);
      console.log(`Updated last stock movements processing time to: ${currentTime.toISOString()}`);
    } else {
      console.log('No orders processed, skipping timestamp update');
    }
    
    console.log(`Processed ${result.processed} orders, skipped ${result.skipped}, failed ${result.failed}`);
    
    return result;
  } catch (error: any) {
    console.error('Error processing new orders:', error);
    throw error;
  }
} 