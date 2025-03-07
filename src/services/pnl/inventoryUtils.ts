import { InventoryItem } from '../../types';

/**
 * Create a map of inventory items for quick lookup
 */
export function createInventoryMap(inventory: InventoryItem[]) {
  const inventoryMap = new Map<string, any>();
  
  // Populate inventory map with both product and variation cost prices
  inventory.forEach(item => {
    // Use SKU as primary key if available
    if (item.sku) {
      inventoryMap.set(item.sku, item);
    }
    
    // Also map by product/variation ID as fallback
    const key = item.variation_id 
      ? `${item.product_id}_${item.variation_id}` 
      : `${item.product_id}`;
    inventoryMap.set(key, item);
  });

  return inventoryMap;
}

/**
 * Get cost price for a product or variation
 */
export function getCostPrice(item: any, inventoryMap: Map<string, any>) {
  let costPrice = 0;
  let supplierPrice = 0;
  
  // First try to find by SKU
  if (item.sku) {
    const inventoryItem = inventoryMap.get(item.sku);
    if (inventoryItem) {
      costPrice = inventoryItem.cost_price || 0;
      supplierPrice = inventoryItem.supplier_price || 0;
    }
  }
  
  // If no SKU match, try by product/variation ID
  if (costPrice === 0 && supplierPrice === 0) {
    const lookupKey = item.variation_id 
      ? `${item.product_id}_${item.variation_id}` 
      : `${item.product_id}`;
    const inventoryItem = inventoryMap.get(lookupKey);
    if (inventoryItem) {
      costPrice = inventoryItem.cost_price || 0;
      supplierPrice = inventoryItem.supplier_price || 0;
    }
  }
  
  // If still no match, use the item's cost_price if available
  if (costPrice === 0 && supplierPrice === 0) {
    costPrice = item.cost_price || 0;
  }
  
  // Use supplier price if available, otherwise use cost price
  return supplierPrice > 0 ? supplierPrice : costPrice;
}