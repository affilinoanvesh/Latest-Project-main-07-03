import { InventoryItem } from '../../types';
import { inventoryService, productsService, productVariationsService } from '../../services';
import { updateLastSync } from './sync';
import { safeUpdateProgress, filterObjectToSchema } from './utils';
import { supabase } from '../../services/supabase';

// Sanitize numeric fields to ensure empty strings are converted to null or 0
const sanitizeNumericFields = (obj: any): any => {
  const numericFields = [
    'cost_price', 
    'supplier_price', 
    'stock_quantity',
    'retail_value',
    'cost_value',
    'regular_price',
    'sale_price',
    'price'
  ];
  
  const result = { ...obj };
  
  numericFields.forEach(field => {
    if (field in result) {
      // Convert empty strings to null
      if (result[field] === '') {
        result[field] = null;
      }
      // Convert string numbers to actual numbers
      else if (typeof result[field] === 'string' && !isNaN(Number(result[field]))) {
        result[field] = Number(result[field]);
      }
    }
  });
  
  return result;
};

// Sync inventory data from products and variations
export const syncInventory = async (progressCallback?: (progress: number) => void): Promise<InventoryItem[]> => {
  try {
    // Get products and variations from Supabase
    const products = await productsService.getAll();
    const variations = await productVariationsService.getAll();
    
    // Get existing inventory to preserve supplier price information
    const existingInventory = await inventoryService.getAll();
    
    // Create a map of existing inventory items by SKU for quick lookup
    const existingInventoryMap = new Map<string, InventoryItem>();
    existingInventory.forEach(item => {
      if (item.sku) {
        existingInventoryMap.set(item.sku, item);
      }
    });
    
    // Initial progress update
    safeUpdateProgress(progressCallback, 20);
    
    // Define allowed fields based on database schema
    const allowedFields = [
      'id',
      'product_id',
      'variation_id',
      'sku',
      'cost_price',
      'supplier_price',
      'supplier_name',
      'supplier_updated',
      'stock_quantity',
      'retail_value',
      'cost_value',
      'regular_price',
      'sale_price',
      'price',
      'created_at'
    ];
    
    // Extract inventory data from products
    const productInventory = products.map(product => {
      // Generate a unique SKU for products with empty SKUs
      const sku = product.sku && product.sku.trim() !== '' ? product.sku : `product_${product.id}`;
      
      // Check if we have existing inventory data for this SKU
      const existingItem = existingInventoryMap.get(sku);
      
      const inventoryItem = {
        product_id: product.id,
        sku,
        cost_price: product.cost_price || 0,
        // Preserve existing supplier price information if available
        supplier_price: existingItem?.supplier_price ?? product.supplier_price,
        supplier_name: existingItem?.supplier_name ?? product.supplier_name,
        supplier_updated: existingItem?.supplier_updated ?? product.supplier_updated,
        stock_quantity: product.stock_quantity || 0
      };
      
      // Sanitize numeric fields
      const sanitizedItem = sanitizeNumericFields(inventoryItem);
      
      return filterObjectToSchema(sanitizedItem, allowedFields) as InventoryItem;
    });
    
    // Update progress
    safeUpdateProgress(progressCallback, 50);
    
    // Extract inventory data from variations
    const variationInventory = variations.map(variation => {
      // Generate a unique SKU for variations with empty SKUs
      const sku = variation.sku && variation.sku.trim() !== '' ? variation.sku : `variation_${variation.id}`;
      
      // Check if we have existing inventory data for this SKU
      const existingItem = existingInventoryMap.get(sku);
      
      const inventoryItem = {
        product_id: variation.parent_id,
        variation_id: variation.id,
        sku,
        cost_price: variation.cost_price || 0,
        // Preserve existing supplier price information if available
        supplier_price: existingItem?.supplier_price ?? variation.supplier_price,
        supplier_name: existingItem?.supplier_name ?? variation.supplier_name,
        supplier_updated: existingItem?.supplier_updated ?? variation.supplier_updated,
        stock_quantity: variation.stock_quantity || 0
      };
      
      // Sanitize numeric fields
      const sanitizedItem = sanitizeNumericFields(inventoryItem);
      
      return filterObjectToSchema(sanitizedItem, allowedFields) as InventoryItem;
    });
    
    // Update progress
    safeUpdateProgress(progressCallback, 80);
    
    // Combine product and variation inventory
    let combinedInventory: InventoryItem[] = [...productInventory, ...variationInventory];
    
    // Filter out duplicate SKUs - keep only the first occurrence of each SKU
    // Create a Map to track unique SKUs
    const uniqueSkuMap = new Map<string, InventoryItem>();
    
    // Prioritize variations over products when there are duplicate SKUs
    // First add products to the map
    productInventory.forEach(item => {
      if (item.sku) {
        uniqueSkuMap.set(item.sku, item);
      }
    });
    
    // Then add variations, which will overwrite any products with the same SKU
    variationInventory.forEach(item => {
      if (item.sku) {
        uniqueSkuMap.set(item.sku, item);
      }
    });
    
    // Convert the map values back to an array
    const inventory: InventoryItem[] = Array.from(uniqueSkuMap.values());
    
    console.log(`Filtered inventory from ${combinedInventory.length} to ${inventory.length} unique items`);
    console.log(`Preserved supplier price information for ${existingInventoryMap.size} items`);
    
    // Clear existing inventory and save new data
    await inventoryService.deleteAll();
    await inventoryService.bulkAdd(inventory);
    await updateLastSync('inventory');
    
    // Final progress update
    safeUpdateProgress(progressCallback, 100);
    
    return inventory;
  } catch (error) {
    console.error('Error syncing inventory:', error);
    throw error;
  }
};

// Fetch inventory from Supabase
export const fetchInventory = async (): Promise<InventoryItem[]> => {
  try {
    return await inventoryService.getAll();
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
};