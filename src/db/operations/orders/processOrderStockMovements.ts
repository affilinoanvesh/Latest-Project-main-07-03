import { Order, OrderItem } from '../../../types';
import { addStockMovement, invalidateReconciliationCache, getStockMovementsBySku } from '../stockReconciliation';
import { supabase } from '../../../services/supabase';
import { settingsService } from '../../../services';

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