import { Order } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';
import { settingsService } from './settingsService';

/**
 * Orders service for Supabase
 */
export class OrdersService extends SupabaseService<Order> {
  constructor() {
    super('orders');
  }

  /**
   * Get all orders, optionally filtering out on-hold orders based on settings
   */
  async getAll(): Promise<Order[]> {
    try {
      // Check if we should exclude on-hold orders
      const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
      
      let query = supabase
        .from(this.tableName)
        .select('*');
      
      // Add filter for on-hold orders if needed
      if (excludeOnHold) {
        query = query.neq('status', 'on-hold');
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`Error fetching all ${this.tableName}:`, error);
        throw error;
      }
      
      return data as Order[];
    } catch (error) {
      console.error(`Error in getAll for ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get an order by number
   */
  async getOrderByNumber(number: string): Promise<Order | null> {
    try {
      // Check if we should exclude on-hold orders
      const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
      
      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('number', number);
      
      // Add filter for on-hold orders if needed
      if (excludeOnHold) {
        query = query.neq('status', 'on-hold');
      }
      
      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return null;
        }
        console.error('Error fetching order by number:', error);
        throw error;
      }

      return data as Order;
    } catch (error: any) {
      console.error('Error in getOrderByNumber:', error);
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: string): Promise<Order[]> {
    try {
      // Check if we should exclude on-hold orders
      const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
      
      // If we're specifically requesting on-hold orders and they should be excluded
      if (status === 'on-hold' && excludeOnHold) {
        return [];
      }
      
      let query = supabase
        .from(this.tableName)
        .select('*');
      
      // Add status filter
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      
      // Add filter for on-hold orders if needed
      if (excludeOnHold && status !== 'on-hold') {
        query = query.neq('status', 'on-hold');
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching orders by status:', error);
        throw error;
      }

      return data as Order[];
    } catch (error) {
      console.error('Error in getOrdersByStatus:', error);
      throw error;
    }
  }

  /**
   * Get orders by date range
   */
  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    try {
      // Check if we should exclude on-hold orders
      const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
      
      let query = supabase
        .from(this.tableName)
        .select('*')
        .gte('date_created', startDate.toISOString())
        .lte('date_created', endDate.toISOString());
      
      // Add filter for on-hold orders if needed
      if (excludeOnHold) {
        query = query.neq('status', 'on-hold');
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching orders by date range:', error);
        throw error;
      }

      return data as Order[];
    } catch (error) {
      console.error('Error in getOrdersByDateRange:', error);
      throw error;
    }
  }

  /**
   * Find a checkout draft order by total amount and items
   * This is used to identify draft orders that should be updated instead of creating new orders
   */
  async findMatchingDraftOrder(order: Order): Promise<Order | null> {
    try {
      // Only look for checkout-draft orders
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('status', 'checkout-draft')
        .eq('total', order.total);

      if (error) {
        console.error('Error finding matching draft order:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Find the most recent draft order that matches
      // Sort by date created in descending order
      const sortedDrafts = data.sort((a, b) => {
        const dateA = a.date_created ? new Date(a.date_created).getTime() : 0;
        const dateB = b.date_created ? new Date(b.date_created).getTime() : 0;
        return dateB - dateA;
      });

      // Return the most recent draft order
      return sortedDrafts[0] as Order;
    } catch (error) {
      console.error('Error in findMatchingDraftOrder:', error);
      return null;
    }
  }

  /**
   * Update a checkout draft order to a completed/processing status
   * This prevents duplicate orders from being created
   */
  async updateDraftOrder(draftOrderId: number, orderData: Partial<Order>): Promise<Order | null> {
    try {
      console.log(`Updating draft order #${draftOrderId} to status: ${orderData.status}`);
      
      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          ...orderData,
          updated_at: new Date()
        })
        .eq('id', draftOrderId)
        .select()
        .single();

      if (error) {
        console.error(`Error updating draft order #${draftOrderId}:`, error);
        throw error;
      }

      console.log(`Successfully updated order #${draftOrderId} from draft to ${orderData.status}`);
      return data as Order;
    } catch (error) {
      console.error('Error in updateDraftOrder:', error);
      throw error;
    }
  }
}

// Export an instance of the service
export const ordersService = new OrdersService(); 