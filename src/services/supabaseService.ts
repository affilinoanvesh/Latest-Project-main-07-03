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
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(item)
      .select()
      .single();

    if (error) {
      console.error(`Error adding to ${this.tableName}:`, error);
      throw error;
    }

    return data as T;
  }

  /**
   * Add multiple records
   */
  async bulkAdd(items: Omit<T, 'id'>[]): Promise<T[]> {
    if (items.length === 0) return [];

    console.log(`[${this.tableName}] Attempting to bulk add ${items.length} items`);
    
    try {
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
    const { data, error } = await supabase
      .from(this.tableName)
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw error;
    }

    return data as T;
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