import { InventoryItem } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

/**
 * Inventory service for Supabase
 */
export class InventoryService extends SupabaseService<InventoryItem & { id?: number }> {
  constructor() {
    super('inventory');
  }

  /**
   * Get inventory items by product ID
   */
  async getInventoryByProductId(productId: number): Promise<(InventoryItem & { id?: number })[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching inventory by product ID:', error);
      throw error;
    }

    return data as (InventoryItem & { id?: number })[];
  }

  /**
   * Get inventory items by variation ID
   */
  async getInventoryByVariationId(variationId: number): Promise<(InventoryItem & { id?: number })[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('variation_id', variationId);

    if (error) {
      console.error('Error fetching inventory by variation ID:', error);
      throw error;
    }

    return data as (InventoryItem & { id?: number })[];
  }

  /**
   * Get inventory item by SKU
   */
  async getInventoryBySku(sku: string): Promise<(InventoryItem & { id?: number }) | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('sku', sku)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return null;
      }
      console.error('Error fetching inventory by SKU:', error);
      throw error;
    }

    return data as (InventoryItem & { id?: number });
  }

  /**
   * Update inventory for a product
   */
  async updateInventoryForProduct(productId: number, changes: Partial<InventoryItem>): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update(changes)
      .eq('product_id', productId);

    if (error) {
      console.error('Error updating inventory for product:', error);
      throw error;
    }
  }
}

// Export an instance of the service
export const inventoryService = new InventoryService(); 