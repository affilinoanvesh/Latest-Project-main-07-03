import { InventoryItem } from '../../types';
import { updateLastSync } from './sync';
import { inventoryService } from '../../services';
import { supabase } from '../../services/supabase';
import { productsService, productVariationsService } from '../../services';

export async function saveInventory(inventory: InventoryItem[]): Promise<void> {
  try {
    // Get existing inventory to preserve supplier price information
    const existingInventory = await inventoryService.getAll();
    
    // Create a map of existing inventory items by SKU for quick lookup
    const existingInventoryMap = new Map<string, InventoryItem>();
    existingInventory.forEach(item => {
      if (item.sku) {
        existingInventoryMap.set(item.sku, item);
      }
    });
    
    // Ensure all items have unique SKUs and preserve supplier price information
    const processedInventory = inventory.map(item => {
      // If SKU is empty or null, generate a unique one based on product_id and variation_id
      if (!item.sku || item.sku.trim() === '') {
        if (item.variation_id) {
          item.sku = `variation_${item.variation_id}`;
        } else {
          item.sku = `product_${item.product_id}`;
        }
      }
      
      // Check if we have existing inventory data for this SKU
      const existingItem = existingInventoryMap.get(item.sku);
      
      // Preserve existing supplier price information if available
      if (existingItem) {
        item.supplier_price = existingItem.supplier_price ?? item.supplier_price;
        item.supplier_name = existingItem.supplier_name ?? item.supplier_name;
        item.supplier_updated = existingItem.supplier_updated ?? item.supplier_updated;
      }
      
      return item;
    });
    
    // Filter out duplicate SKUs before adding
    const uniqueSkuMap = new Map<string, InventoryItem>();
    
    // Add items with SKUs to the map
    processedInventory.forEach(item => {
      if (item.sku) {
        uniqueSkuMap.set(item.sku, item);
      }
    });
    
    // Get unique items
    const finalItems = Array.from(uniqueSkuMap.values());
    
    console.log(`Filtered inventory from ${inventory.length} to ${finalItems.length} unique items`);
    console.log(`Preserved supplier price information for ${existingInventoryMap.size} items`);
    
    // Delete all existing inventory items
    await supabase.from('inventory').delete().neq('id', 0);
    
    // Add new inventory items
    for (const item of finalItems) {
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
    
    // First, check if an inventory item with this SKU already exists
    const item = await inventoryService.getInventoryBySku(sku);
    
    if (item) {
      // Update the existing item
      const updates: Partial<InventoryItem> = {
        supplier_price: supplierPrice,
        supplier_name: supplierName,
        supplier_updated: new Date()
      };
      
      await inventoryService.update(item.id!, updates);
      console.log(`Updated supplier price for SKU ${sku} to ${supplierPrice} from ${supplierName}`);
      return true;
    } else {
      // Item doesn't exist, check if we need to create a new one
      console.log(`No inventory item found for SKU ${sku}, checking products and variations`);
      
      // First, try to find the product by SKU
      const products = await productsService.getAll();
      const product = products.find((p: any) => p.sku === sku);
      
      if (product) {
        // Check again if an inventory item already exists for this product_id
        const existingItems = await inventoryService.getInventoryByProductId(product.id);
        
        if (existingItems && existingItems.length > 0) {
          // Update the existing inventory item instead of creating a new one
          const existingItem = existingItems[0];
          const updates: Partial<InventoryItem> = {
            supplier_price: supplierPrice,
            supplier_name: supplierName,
            supplier_updated: new Date(),
            sku: sku // Ensure SKU is set correctly
          };
          
          await inventoryService.update(existingItem.id!, updates);
          console.log(`Updated existing inventory item for product ${product.name} (SKU: ${sku})`);
          return true;
        }
        
        // Before creating a new item, check if any inventory item has this SKU
        // This is a safety check to prevent duplicate SKUs
        const allInventory = await inventoryService.getAll();
        const duplicateSku = allInventory.find(i => i.sku === sku);
        
        if (duplicateSku) {
          // Update the existing item instead of creating a new one
          const updates: Partial<InventoryItem> = {
            supplier_price: supplierPrice,
            supplier_name: supplierName,
            supplier_updated: new Date()
          };
          
          await inventoryService.update(duplicateSku.id!, updates);
          console.log(`Updated existing inventory item with duplicate SKU ${sku}`);
          return true;
        }
        
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
      }
      
      // Try to find a variation with this SKU
      const variations = await productVariationsService.getAll();
      const variation = variations.find((v: any) => v.sku === sku);
      
      if (variation) {
        // Check if an inventory item already exists for this variation_id
        const existingItems = await inventoryService.getInventoryByVariationId(variation.id);
        
        if (existingItems && existingItems.length > 0) {
          // Update the existing inventory item instead of creating a new one
          const existingItem = existingItems[0];
          const updates: Partial<InventoryItem> = {
            supplier_price: supplierPrice,
            supplier_name: supplierName,
            supplier_updated: new Date(),
            sku: sku // Ensure SKU is set correctly
          };
          
          await inventoryService.update(existingItem.id!, updates);
          console.log(`Updated existing inventory item for variation (SKU: ${sku})`);
          return true;
        }
        
        // Before creating a new item, check if any inventory item has this SKU
        // This is a safety check to prevent duplicate SKUs
        const allInventory = await inventoryService.getAll();
        const duplicateSku = allInventory.find(i => i.sku === sku);
        
        if (duplicateSku) {
          // Update the existing item instead of creating a new one
          const updates: Partial<InventoryItem> = {
            supplier_price: supplierPrice,
            supplier_name: supplierName,
            supplier_updated: new Date()
          };
          
          await inventoryService.update(duplicateSku.id!, updates);
          console.log(`Updated existing inventory item with duplicate SKU ${sku}`);
          return true;
        }
        
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