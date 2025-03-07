import { OverheadCost } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

/**
 * Overhead costs service for Supabase
 */
export class OverheadCostsService extends SupabaseService<OverheadCost> {
  constructor() {
    super('overhead_costs');
  }

  /**
   * Get overhead costs by type
   */
  async getOverheadCostsByType(type: string): Promise<OverheadCost[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('type', type);

    if (error) {
      console.error('Error fetching overhead costs by type:', error);
      throw error;
    }

    return data as OverheadCost[];
  }

  /**
   * Get overhead cost by name
   */
  async getOverheadCostByName(name: string): Promise<OverheadCost | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return null;
      }
      console.error('Error fetching overhead cost by name:', error);
      throw error;
    }

    return data as OverheadCost;
  }
}

// Export an instance of the service
export const overheadCostsService = new OverheadCostsService(); 