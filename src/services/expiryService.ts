import { ProductExpiry } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

/**
 * Product expiry service for Supabase
 */
export class ProductExpiryService extends SupabaseService<ProductExpiry & { id?: number }> {
  constructor() {
    super('product_expiry');
  }

  /**
   * Get expiry records by product ID
   */
  async getExpiryByProductId(productId: number): Promise<(ProductExpiry & { id?: number })[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching expiry by product ID:', error);
      throw error;
    }

    return data as (ProductExpiry & { id?: number })[];
  }

  /**
   * Get expiry records by variation ID
   */
  async getExpiryByVariationId(variationId: number): Promise<(ProductExpiry & { id?: number })[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('variation_id', variationId);

    if (error) {
      console.error('Error fetching expiry by variation ID:', error);
      throw error;
    }

    return data as (ProductExpiry & { id?: number })[];
  }

  /**
   * Get expiry records by SKU
   */
  async getExpiryBySku(sku: string): Promise<(ProductExpiry & { id?: number })[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('sku', sku);

    if (error) {
      console.error('Error fetching expiry by SKU:', error);
      throw error;
    }

    return data as (ProductExpiry & { id?: number })[];
  }

  /**
   * Get expiry records by date range
   */
  async getExpiryByDateRange(startDate: Date, endDate: Date): Promise<(ProductExpiry & { id?: number })[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .gte('expiry_date', startDate.toISOString())
      .lte('expiry_date', endDate.toISOString());

    if (error) {
      console.error('Error fetching expiry by date range:', error);
      throw error;
    }

    return data as (ProductExpiry & { id?: number })[];
  }

  /**
   * Get expiring products (products that will expire within the given days)
   */
  async getExpiringProducts(days: number): Promise<(ProductExpiry & { id?: number })[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .gte('expiry_date', today.toISOString())
      .lte('expiry_date', futureDate.toISOString());

    if (error) {
      console.error('Error fetching expiring products:', error);
      throw error;
    }

    return data as (ProductExpiry & { id?: number })[];
  }

  /**
   * Get expiry records by batch number and SKU
   */
  async getExpiryByBatchAndSku(batchNumber: string, sku: string): Promise<(ProductExpiry & { id?: number })[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('batch_number', batchNumber)
      .eq('sku', sku);

    if (error) {
      console.error('Error fetching expiry by batch number and SKU:', error);
      throw error;
    }

    return data as (ProductExpiry & { id?: number })[];
  }
}

// Export an instance of the service
export const productExpiryService = new ProductExpiryService(); 