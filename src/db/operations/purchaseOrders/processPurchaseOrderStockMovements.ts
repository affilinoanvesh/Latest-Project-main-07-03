import { PurchaseOrder, PurchaseOrderItem } from '../../../types';
import { addStockMovement, invalidateReconciliationCache } from '../stockReconciliation';
import { addProductExpiry } from '../expiry';
import { productsService, productVariationsService } from '../../../services';

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
      batch_number: item.batch_number,
      expiry_date: item.expiry_date
    });
    
    // Add to expiry tracking if expiry date and batch number are set
    if (item.expiry_date && item.batch_number) {
      try {
        // Find product information by SKU
        let productId = 0;
        let variationId = undefined;
        let productName = item.product_name;
        
        // Try to find the product ID by SKU
        const product = await productsService.getProductBySku(item.sku);
        if (product) {
          productId = product.id;
          productName = product.name || productName;
        } else {
          // Check if it's a variation
          const variation = await productVariationsService.getVariationBySku(item.sku);
          if (variation) {
            productId = variation.parent_id;
            variationId = variation.id;
            
            // Get the parent product name if needed
            if (!productName) {
              const parentProduct = await productsService.getById(variation.parent_id);
              if (parentProduct) {
                productName = `${parentProduct.name} - ${variation.name}`;
              }
            }
          } else {
            console.warn(`Could not find product or variation for SKU ${item.sku}, skipping expiry record`);
            return;
          }
        }
        
        // Create expiry record with valid product ID
        await addProductExpiry({
          product_id: productId,
          variation_id: variationId,
          sku: item.sku,
          product_name: productName,
          expiry_date: item.expiry_date,
          quantity: item.quantity_received,
          batch_number: item.batch_number,
          notes: `Added from Purchase Order #${purchaseOrder.reference_number} (Received)`
        });
        
        console.log(`Added expiry record for ${item.sku} with batch ${item.batch_number}`);
      } catch (expiryError) {
        console.error('Error adding expiry record:', expiryError);
        // Don't fail the whole operation if expiry record fails
      }
    }
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