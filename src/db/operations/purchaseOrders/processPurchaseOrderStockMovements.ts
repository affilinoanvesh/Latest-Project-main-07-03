import { PurchaseOrder, PurchaseOrderItem } from '../../../types';
import { addStockMovement, invalidateReconciliationCache } from '../stockReconciliation';

/**
 * Process a purchase order and create stock movements for each item
 * This should be called when a purchase order is received
 */
export async function processPurchaseOrderStockMovements(
  purchaseOrder: PurchaseOrder,
  items: PurchaseOrderItem[]
): Promise<void> {
  try {
    console.log(`Processing stock movements for purchase order #${purchaseOrder.reference_number}`);
    
    // Only process received or partially received purchase orders
    if (purchaseOrder.status !== 'received' && purchaseOrder.status !== 'partially_received') {
      console.log(`Skipping purchase order #${purchaseOrder.reference_number} with status ${purchaseOrder.status}`);
      return;
    }
    
    // Process each item
    for (const item of items) {
      await createStockMovementForPurchaseOrderItem(purchaseOrder, item);
    }
    
    // Invalidate reconciliation cache after processing
    invalidateReconciliationCache();
    
    console.log(`Finished processing stock movements for purchase order #${purchaseOrder.reference_number}`);
  } catch (error) {
    console.error('Error processing purchase order stock movements:', error);
    throw error;
  }
}

/**
 * Create a stock movement for a single purchase order item
 */
async function createStockMovementForPurchaseOrderItem(
  purchaseOrder: PurchaseOrder,
  item: PurchaseOrderItem
): Promise<void> {
  try {
    // Skip items without SKU
    if (!item.sku) {
      console.warn(`Purchase order item ${item.id} has no SKU, skipping stock movement`);
      return;
    }
    
    // Skip items with no received quantity
    if (!item.quantity_received || item.quantity_received <= 0) {
      console.warn(`Purchase order item ${item.id} has no received quantity, skipping stock movement`);
      return;
    }
    
    // Create a positive stock movement (purchases increase stock)
    await addStockMovement({
      sku: item.sku,
      movement_date: purchaseOrder.date,
      // Use positive quantity as purchases increase stock
      quantity: item.quantity_received,
      movement_type: 'purchase',
      reference_id: purchaseOrder.reference_number,
      notes: `Purchase Order #${purchaseOrder.reference_number}`,
      batch_number: item.batch_number
    });
  } catch (error) {
    console.error(`Error creating stock movement for purchase order item ${item.id}:`, error);
    throw error;
  }
}

/**
 * Process multiple purchase orders and create stock movements
 */
export async function processMultiplePurchaseOrdersStockMovements(
  purchaseOrders: Array<{ order: PurchaseOrder; items: PurchaseOrderItem[] }>
): Promise<{
  processed: number;
  failed: number;
  errors: Array<{ order: string; error: string }>;
}> {
  const result = {
    processed: 0,
    failed: 0,
    errors: [] as Array<{ order: string; error: string }>
  };
  
  for (const { order, items } of purchaseOrders) {
    try {
      await processPurchaseOrderStockMovements(order, items);
      result.processed++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        order: order.reference_number,
        error: error.message || 'Unknown error'
      });
    }
  }
  
  return result;
} 