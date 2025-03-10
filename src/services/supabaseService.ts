import { supabase } from './supabase';

/**
 * Base Supabase service with common operations
 */
export class SupabaseService<T extends { id?: number }> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Get all records from the table
   */
  async getAll(): Promise<T[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*');

    if (error) {
      console.error(`Error fetching ${this.tableName}:`, error);
      throw error;
    }

    return data as T[];
  }

  /**
   * Get a record by ID
   */
  async getById(id: number): Promise<T | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return null;
      }
      console.error(`Error fetching ${this.tableName} by ID:`, error);
      throw error;
    }

    return data as T;
  }

  /**
   * Add a new record
   */
  async add(item: Omit<T, 'id'>): Promise<T> {
    try {
      console.log(`[${this.tableName}] Adding new record:`, item);
      
      // Ensure created_at and updated_at are set if this table uses timestamps
      const itemWithTimestamps = {
        ...item
      };
      
      // Add timestamps if the table supports them
      if (this.tableName !== 'api_credentials') { // Skip for tables that don't have timestamps
        (itemWithTimestamps as any).created_at = (item as any).created_at || new Date();
        (itemWithTimestamps as any).updated_at = (item as any).updated_at || new Date();
      }
      
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(itemWithTimestamps)
        .select()
        .single();

      if (error) {
        console.error(`Error adding to ${this.tableName}:`, error);
        throw error;
      }

      console.log(`[${this.tableName}] Successfully added new record with ID ${(data as any).id}`);
      return data as T;
    } catch (err) {
      console.error(`Unexpected error in add for ${this.tableName}:`, err);
      throw err;
    }
  }

  /**
   * Add multiple records
   */
  async bulkAdd(items: Omit<T, 'id'>[]): Promise<T[]> {
    if (items.length === 0) return [];

    console.log(`[${this.tableName}] Attempting to bulk add ${items.length} items`);
    
    try {
      // Special handling for inventory table to check for empty SKUs
      if (this.tableName === 'inventory') {
        // Check for empty SKUs and log them
        const emptySkuItems = items.filter((item: any) => !item.sku || item.sku === '');
        if (emptySkuItems.length > 0) {
          console.warn(`[${this.tableName}] Found ${emptySkuItems.length} items with empty SKUs`);
          
          // Generate unique SKUs for items with empty SKUs
          items = items.map((item: any, index) => {
            if (!item.sku || item.sku === '') {
              if (item.variation_id) {
                item.sku = `variation_${item.variation_id}`;
              } else if (item.product_id) {
                item.sku = `product_${item.product_id}`;
              } else {
                item.sku = `generated_${Date.now()}_${index}`;
              }
              console.log(`[${this.tableName}] Generated SKU ${item.sku} for item with empty SKU`);
            }
            return item;
          });
        }
      }
      
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(items)
        .select();

      if (error) {
        console.error(`Error bulk adding to ${this.tableName}:`, error);
        
        // Log more details about the error
        if (error.details) {
          console.error(`Error details: ${error.details}`);
        }
        
        if (error.hint) {
          console.error(`Error hint: ${error.hint}`);
        }
        
        // Log the first item that might be causing issues
        if (items.length > 0) {
          console.error(`First item in batch:`, JSON.stringify(items[0], null, 2));
        }
        
        throw error;
      }

      console.log(`[${this.tableName}] Successfully added ${data?.length || 0} items`);
      return data as T[];
    } catch (err) {
      console.error(`Unexpected error in bulkAdd for ${this.tableName}:`, err);
      throw err;
    }
  }

  /**
   * Update a record
   */
  async update(id: number, changes: Partial<T>): Promise<T> {
    try {
      console.log(`[${this.tableName}] Updating record with ID ${id}:`, changes);
      
      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          ...changes,
          updated_at: new Date() // Ensure updated_at is always set
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${this.tableName}:`, error);
        throw error;
      }

      console.log(`[${this.tableName}] Successfully updated record with ID ${id}`);
      return data as T;
    } catch (err) {
      console.error(`Unexpected error in update for ${this.tableName}:`, err);
      throw err;
    }
  }

  /**
   * Delete a record
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting from ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete all records
   */
  async deleteAll(): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .neq('id', 0); // Delete all records

    if (error) {
      console.error(`Error deleting all from ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Count records
   */
  async count(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`Error counting ${this.tableName}:`, error);
      throw error;
    }

    return count || 0;
  }
} 