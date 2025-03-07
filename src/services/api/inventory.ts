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
      const inventoryItem = {
        product_id: product.id,
        sku: product.sku || '',
        cost_price: product.cost_price || 0,
        supplier_price: product.supplier_price,
        supplier_name: product.supplier_name,
        supplier_updated: product.supplier_updated,
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
      const inventoryItem = {
        product_id: variation.parent_id,
        variation_id: variation.id,
        sku: variation.sku || '',
        cost_price: variation.cost_price || 0,
        supplier_price: variation.supplier_price,
        supplier_name: variation.supplier_name,
        supplier_updated: variation.supplier_updated,
        stock_quantity: variation.stock_quantity || 0
      };
      
      // Sanitize numeric fields
      const sanitizedItem = sanitizeNumericFields(inventoryItem);
      
      return filterObjectToSchema(sanitizedItem, allowedFields) as InventoryItem;
    });
    
    // Update progress
    safeUpdateProgress(progressCallback, 80);
    
    // Combine product and variation inventory
    let inventory: InventoryItem[] = [...productInventory, ...variationInventory];
    
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