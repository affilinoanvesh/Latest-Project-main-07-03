import { PurchaseOrder, PurchaseOrderItem } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

/**
 * Purchase orders service for Supabase
 */
export class PurchaseOrdersService extends SupabaseService<PurchaseOrder> {
  constructor() {
    super('purchase_orders');
  }

  /**
   * Get purchase orders by supplier ID
   */
  async getPurchaseOrdersBySupplier(supplierId: number): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('supplier_id', supplierId);

    if (error) {
      console.error('Error fetching purchase orders by supplier ID:', error);
      throw error;
    }

    return data as PurchaseOrder[];
  }

  /**
   * Get purchase orders by status
   */
  async getPurchaseOrdersByStatus(status: string): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('status', status);

    if (error) {
      console.error('Error fetching purchase orders by status:', error);
      throw error;
    }

    return data as PurchaseOrder[];
  }

  /**
   * Get purchase orders by date range
   */
  async getPurchaseOrdersByDateRange(startDate: Date, endDate: Date): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error) {
      console.error('Error fetching purchase orders by date range:', error);
      throw error;
    }

    return data as PurchaseOrder[];
  }

  /**
   * Get purchase orders with items
   */
  async getPurchaseOrdersWithItems(): Promise<(PurchaseOrder & { items: PurchaseOrderItem[] })[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        items:purchase_order_items(*)
      `);

    if (error) {
      console.error('Error fetching purchase orders with items:', error);
      throw error;
    }

    return data as (PurchaseOrder & { items: PurchaseOrderItem[] })[];
  }

  /**
   * Get a purchase order with items by ID
   */
  async getPurchaseOrderWithItemsById(id: number): Promise<(PurchaseOrder & { items: PurchaseOrderItem[] }) | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        items:purchase_order_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return null;
      }
      console.error('Error fetching purchase order with items by ID:', error);
      throw error;
    }

    return data as (PurchaseOrder & { items: PurchaseOrderItem[] });
  }
}

/**
 * Purchase order items service for Supabase
 */
export class PurchaseOrderItemsService extends SupabaseService<PurchaseOrderItem> {
  constructor() {
    super('purchase_order_items');
  }

  /**
   * Get items by purchase order ID
   */
  async getItemsByPurchaseOrderId(purchaseOrderId: number): Promise<PurchaseOrderItem[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('purchase_order_id', purchaseOrderId);

    if (error) {
      console.error('Error fetching purchase order items by purchase order ID:', error);
      throw error;
    }

    return data as PurchaseOrderItem[];
  }

  /**
   * Get items by SKU
   */
  async getItemsBySku(sku: string): Promise<PurchaseOrderItem[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('sku', sku);

    if (error) {
      console.error('Error fetching purchase order items by SKU:', error);
      throw error;
    }

    return data as PurchaseOrderItem[];
  }
}

// Export instances of the services
export const purchaseOrdersService = new PurchaseOrdersService();
export const purchaseOrderItemsService = new PurchaseOrderItemsService(); 