import { InventoryItem } from '../../types';
import { updateLastSync } from './sync';
import { inventoryService } from '../../services';
import { supabase } from '../../services/supabase';
import { productsService, productVariationsService } from '../../services';

export async function saveInventory(inventory: InventoryItem[]): Promise<void> {
  try {
    // Delete all existing inventory items
    await supabase.from('inventory').delete().neq('id', 0);
    
    // Add new inventory items
    for (const item of inventory) {
      await inventoryService.add(item);
    }
    
    await updateLastSync('inventory');
  } catch (error) {
    console.error('Error saving inventory:', error);
    throw error;
  }
}

export async function getInventory(): Promise<InventoryItem[]> {
  try {
    return await inventoryService.getAll();
  } catch (error) {
    console.error('Error getting inventory:', error);
    throw error;
  }
}

export async function getInventoryBySku(sku: string): Promise<InventoryItem | null> {
  try {
    return await inventoryService.getInventoryBySku(sku);
  } catch (error) {
    console.error('Error getting inventory by SKU:', error);
    throw error;
  }
}

export async function updateInventoryItem(sku: string, updates: Partial<InventoryItem>): Promise<void> {
  try {
    const item = await inventoryService.getInventoryBySku(sku);
    
    if (item && item.id) {
      await inventoryService.update(item.id, updates);
    } else {
      console.warn(`Inventory item with SKU ${sku} not found`);
    }
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
}

export async function updateSupplierPrice(
  sku: string, 
  supplierPrice: number, 
  supplierName: string
): Promise<boolean> {
  try {
    if (!sku) {
      console.warn('Cannot update supplier price: SKU is empty');
      return false;
    }
    
    // Allow zero prices but ensure we have a supplier name
    if (isNaN(supplierPrice) || supplierPrice < 0 || !supplierName) {
      console.warn(`Cannot update supplier price for SKU ${sku}: Invalid price ${supplierPrice} or missing supplier name`);
      return false;
    }
    
    const item = await inventoryService.getInventoryBySku(sku);
    
    if (item && item.id) {
      // Update the supplier price
      const updates: Partial<InventoryItem> = {
        supplier_price: supplierPrice,
        supplier_name: supplierName,
        supplier_updated: new Date() // Add a timestamp for when the supplier price was updated
      };
      
      await inventoryService.update(item.id, updates);
      console.log(`Updated supplier price for SKU ${sku} to ${supplierPrice} from ${supplierName}`);
      return true;
    } else {
      // Item doesn't exist, create a new one
      console.log(`Creating new inventory item for SKU ${sku} with supplier price ${supplierPrice} from ${supplierName}`);
      
      // First, try to find the product by SKU
      const products = await productsService.getAll();
      const product = products.find((p: any) => p.sku === sku);
      
      if (product) {
        // Create a new inventory item for this product
        const newItem: Partial<InventoryItem> = {
          product_id: product.id,
          sku,
          supplier_price: supplierPrice,
          supplier_name: supplierName,
          supplier_updated: new Date()
        };
        
        await inventoryService.add(newItem as any);
        console.log(`Created new inventory item for product ${product.name} (SKU: ${sku})`);
        return true;
      } else {
        // Try to find a variation with this SKU
        const variations = await productVariationsService.getAll();
        const variation = variations.find((v: any) => v.sku === sku);
        
        if (variation) {
          // Create a new inventory item for this variation
          const newItem: Partial<InventoryItem> = {
            product_id: variation.parent_id,
            variation_id: variation.id,
            sku,
            supplier_price: supplierPrice,
            supplier_name: supplierName,
            supplier_updated: new Date()
          };
          
          await inventoryService.add(newItem as any);
          console.log(`Created new inventory item for variation (SKU: ${sku})`);
          return true;
        } else {
          console.warn(`Product or variation with SKU ${sku} not found for supplier price update`);
          return false;
        }
      }
    }
  } catch (error) {
    console.error(`Error updating supplier price for SKU ${sku}:`, error);
    return false;
  }
}

export async function updateCostPrice(sku: string, costPrice: number): Promise<boolean> {
  try {
    const item = await inventoryService.getInventoryBySku(sku);
    
    if (item && item.id) {
      // Update the cost price
      await inventoryService.update(item.id, { cost_price: costPrice });
      return true;
    } else {
      console.warn(`Product with SKU ${sku} not found for cost price update`);
      return false;
    }
  } catch (error) {
    console.error('Error updating cost price:', error);
    return false;
  }
}

export async function updateStockQuantity(sku: string, quantity: number): Promise<boolean> {
  try {
    const item = await inventoryService.getInventoryBySku(sku);
    
    if (item && item.id) {
      // Update the stock quantity
      await inventoryService.update(item.id, { stock_quantity: quantity });
      return true;
    } else {
      console.warn(`Product with SKU ${sku} not found for stock quantity update`);
      return false;
    }
  } catch (error) {
    console.error('Error updating stock quantity:', error);
    return false;
  }
}