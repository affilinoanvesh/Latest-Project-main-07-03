import { SupplierPriceImport, SupplierPriceItem } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

interface Supplier {
  id?: number;
  name: string;
  email: string;
  phone: string;
  created_at?: Date;
}

/**
 * Suppliers service for Supabase
 */
export class SuppliersService extends SupabaseService<Supplier> {
  constructor() {
    super('suppliers');
  }

  /**
   * Get a supplier by name
   */
  async getSupplierByName(name: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .ilike('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return null;
      }
      console.error('Error fetching supplier by name:', error);
      throw error;
    }

    return data as Supplier;
  }
}

/**
 * Supplier imports service for Supabase
 */
export class SupplierImportsService extends SupabaseService<{ id?: number; date: Date; supplier_name: string }> {
  constructor() {
    super('supplier_imports');
  }

  /**
   * Get imports by supplier name
   */
  async getImportsBySupplierName(supplierName: string): Promise<{ id?: number; date: Date; supplier_name: string }[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .ilike('supplier_name', supplierName);

    if (error) {
      console.error('Error fetching supplier imports by name:', error);
      throw error;
    }

    return data as { id?: number; date: Date; supplier_name: string }[];
  }

  /**
   * Get imports by date range
   */
  async getImportsByDateRange(startDate: Date, endDate: Date): Promise<{ id?: number; date: Date; supplier_name: string }[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error) {
      console.error('Error fetching supplier imports by date range:', error);
      throw error;
    }

    return data as { id?: number; date: Date; supplier_name: string }[];
  }
}

/**
 * Supplier import items service for Supabase
 */
export class SupplierImportItemsService extends SupabaseService<{ id?: number; import_id: number; sku: string; supplier_price?: number }> {
  constructor() {
    super('supplier_import_items');
  }

  /**
   * Get items by import ID
   */
  async getItemsByImportId(importId: number): Promise<{ id?: number; import_id: number; sku: string; supplier_price?: number }[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('import_id', importId);

    if (error) {
      console.error('Error fetching supplier import items by import ID:', error);
      throw error;
    }

    return data as { id?: number; import_id: number; sku: string; supplier_price?: number }[];
  }

  /**
   * Get items by SKU
   */
  async getItemsBySku(sku: string): Promise<{ id?: number; import_id: number; sku: string; supplier_price?: number }[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('sku', sku);

    if (error) {
      console.error('Error fetching supplier import items by SKU:', error);
      throw error;
    }

    return data as { id?: number; import_id: number; sku: string; supplier_price?: number }[];
  }
}

// Export instances of the services
export const suppliersService = new SuppliersService();
export const supplierImportsService = new SupplierImportsService();
export const supplierImportItemsService = new SupplierImportItemsService(); 