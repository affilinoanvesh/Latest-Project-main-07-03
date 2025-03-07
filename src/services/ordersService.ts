import { Order } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

/**
 * Orders service for Supabase
 */
export class OrdersService extends SupabaseService<Order> {
  constructor() {
    super('orders');
  }

  /**
   * Get an order by number
   */
  async getOrderByNumber(number: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('number', number)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return null;
      }
      console.error('Error fetching order by number:', error);
      throw error;
    }

    return data as Order;
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('status', status);

    if (error) {
      console.error('Error fetching orders by status:', error);
      throw error;
    }

    return data as Order[];
  }

  /**
   * Get orders by date range
   */
  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .gte('date_created', startDate.toISOString())
      .lte('date_created', endDate.toISOString());

    if (error) {
      console.error('Error fetching orders by date range:', error);
      throw error;
    }

    return data as Order[];
  }
}

// Export an instance of the service
export const ordersService = new OrdersService(); 