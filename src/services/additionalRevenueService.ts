import { AdditionalRevenue, AdditionalRevenueCategory } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

/**
 * Additional revenue service for Supabase
 */
export class AdditionalRevenueService extends SupabaseService<AdditionalRevenue> {
  constructor() {
    super('additional_revenue');
  }

  /**
   * Override add method to handle category vs category_id
   */
  async add(item: Omit<AdditionalRevenue, 'id'>): Promise<AdditionalRevenue> {
    // Create a copy of the item to avoid modifying the original
    const itemToAdd = { ...item };
    
    // If category is provided but category_id is not, try to find the category_id
    if (itemToAdd.category && !itemToAdd.category_id) {
      try {
        const category = await additionalRevenueCategoriesService.getCategoryByName(itemToAdd.category);
        if (category) {
          itemToAdd.category_id = category.id as number;
        }
      } catch (error) {
        console.error('Error finding category_id for category:', itemToAdd.category, error);
      }
    }
    
    // Call the parent class add method
    return super.add(itemToAdd);
  }

  /**
   * Override update method to handle category vs category_id
   */
  async update(id: number, changes: Partial<AdditionalRevenue>): Promise<AdditionalRevenue> {
    // Create a copy of the changes to avoid modifying the original
    const changesToApply = { ...changes };
    
    // If category is provided but category_id is not, try to find the category_id
    if (changesToApply.category && !changesToApply.category_id) {
      try {
        const category = await additionalRevenueCategoriesService.getCategoryByName(changesToApply.category);
        if (category) {
          changesToApply.category_id = category.id as number;
        }
      } catch (error) {
        console.error('Error finding category_id for category:', changesToApply.category, error);
      }
    }
    
    // Call the parent class update method
    return super.update(id, changesToApply);
  }

  /**
   * Get additional revenue by category ID
   */
  async getRevenueByCategory(categoryId: number): Promise<AdditionalRevenue[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('category_id', categoryId);

    if (error) {
      console.error('Error fetching additional revenue by category ID:', error);
      throw error;
    }

    return data as AdditionalRevenue[];
  }

  /**
   * Get additional revenue by date range
   */
  async getRevenueByDateRange(startDate: Date, endDate: Date): Promise<AdditionalRevenue[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error) {
      console.error('Error fetching additional revenue by date range:', error);
      throw error;
    }

    return data as AdditionalRevenue[];
  }

  /**
   * Get additional revenue with category details
   */
  async getRevenueWithCategories(): Promise<(AdditionalRevenue & { category: AdditionalRevenueCategory })[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        category:additional_revenue_categories(*)
      `);

    if (error) {
      console.error('Error fetching additional revenue with categories:', error);
      throw error;
    }

    return data as (AdditionalRevenue & { category: AdditionalRevenueCategory })[];
  }
}

/**
 * Additional revenue categories service for Supabase
 */
export class AdditionalRevenueCategoriesService extends SupabaseService<AdditionalRevenueCategory> {
  constructor() {
    super('additional_revenue_categories');
  }

  /**
   * Get a category by name
   */
  async getCategoryByName(name: string): Promise<AdditionalRevenueCategory | null> {
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
      console.error('Error fetching additional revenue category by name:', error);
      throw error;
    }

    return data as AdditionalRevenueCategory;
  }
}

// Export instances of the services
export const additionalRevenueService = new AdditionalRevenueService();
export const additionalRevenueCategoriesService = new AdditionalRevenueCategoriesService(); 