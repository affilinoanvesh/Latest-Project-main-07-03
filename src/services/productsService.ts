import { Product, ProductVariation } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

/**
 * Products service for Supabase
 */
export class ProductsService extends SupabaseService<Product> {
  constructor() {
    super('products');
  }

  /**
   * Get a product by SKU
   */
  async getProductBySku(sku: string): Promise<Product | null> {
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
      console.error('Error fetching product by SKU:', error);
      throw error;
    }

    return data as Product;
  }

  /**
   * Get products by type
   */
  async getProductsByType(type: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('type', type);

    if (error) {
      console.error('Error fetching products by type:', error);
      throw error;
    }

    return data as Product[];
  }

  /**
   * Search products by name or SKU
   */
  async searchProducts(query: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%`);

    if (error) {
      console.error('Error searching products:', error);
      throw error;
    }

    return data as Product[];
  }
}

/**
 * Product variations service for Supabase
 */
export class ProductVariationsService extends SupabaseService<ProductVariation> {
  constructor() {
    super('product_variations');
  }

  /**
   * Get variations by parent product ID
   */
  async getVariationsByProductId(productId: number): Promise<ProductVariation[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('parent_id', productId);

    if (error) {
      console.error('Error fetching variations by product ID:', error);
      throw error;
    }

    return data as ProductVariation[];
  }

  /**
   * Get a variation by SKU
   */
  async getVariationBySku(sku: string): Promise<ProductVariation | null> {
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
      console.error('Error fetching variation by SKU:', error);
      throw error;
    }

    return data as ProductVariation;
  }
}

// Export instances of the services
export const productsService = new ProductsService();
export const productVariationsService = new ProductVariationsService(); 