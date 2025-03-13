import { supabase } from './supabase';
import { invalidateReconciliationCache } from '../db/operations/stockReconciliation';

// Interface for application settings
export interface AppSettings {
  exclude_on_hold_orders: boolean;
  last_order_processing_time?: Date | null;
}

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  exclude_on_hold_orders: true,
  last_order_processing_time: null
};

/**
 * Settings service for managing application settings
 */
export class SettingsService {
  private tableName = 'app_settings';
  
  /**
   * Get all application settings
   */
  async getSettings(): Promise<AppSettings> {
    try {
      // First try to get settings with id=1 specifically
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', 1)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors if no record exists
      
      if (error) {
        console.error('Error fetching settings:', error);
        throw error;
      }
      
      // If no settings found with id=1, return defaults
      if (!data) {
        return { ...DEFAULT_SETTINGS };
      }
      
      // Merge with defaults to ensure all properties exist
      return { ...DEFAULT_SETTINGS, ...data };
    } catch (error) {
      console.error('Error in getSettings:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }
  
  /**
   * Update application settings
   */
  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      // First check if settings with id=1 exist
      const { data: existingData, error: checkError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', 1)
        .maybeSingle(); // Use maybeSingle instead of single
      
      if (checkError) {
        console.error('Error checking settings existence:', checkError);
        throw checkError;
      }
      
      let result;
      
      if (!existingData) {
        // Create new settings record with a key value
        result = await supabase
          .from(this.tableName)
          .insert([{ 
            id: 1, 
            key: 'app_settings', // Add a key value to satisfy the not-null constraint
            ...DEFAULT_SETTINGS, 
            ...settings 
          }])
          .select()
          .single();
      } else {
        // Update existing settings
        result = await supabase
          .from(this.tableName)
          .update({
            ...settings,
            key: existingData.key || 'app_settings' // Ensure key is preserved or set if null
          })
          .eq('id', 1)
          .select()
          .single();
      }
      
      if (result.error) {
        console.error('Error updating settings:', result.error);
        throw result.error;
      }
      
      return result.data as AppSettings;
    } catch (error) {
      console.error('Error in updateSettings:', error);
      throw error;
    }
  }
  
  /**
   * Get the exclude on-hold orders setting
   */
  async getExcludeOnHoldOrders(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.exclude_on_hold_orders;
  }
  
  /**
   * Update the exclude on-hold orders setting
   */
  async setExcludeOnHoldOrders(exclude: boolean): Promise<void> {
    await this.updateSettings({ exclude_on_hold_orders: exclude });
    
    // Invalidate the reconciliation cache to ensure stock calculations are updated
    invalidateReconciliationCache();
    
    console.log(`Updated exclude on-hold orders setting to: ${exclude}`);
  }

  /**
   * Get the last order processing time
   */
  async getLastOrderProcessingTime(): Promise<Date | null> {
    try {
      const settings = await this.getSettings();
      return settings.last_order_processing_time || null;
    } catch (error) {
      console.error('Error getting last order processing time:', error);
      return null;
    }
  }

  /**
   * Set the last order processing time
   */
  async setLastOrderProcessingTime(timestamp: Date): Promise<void> {
    try {
      await this.updateSettings({ last_order_processing_time: timestamp });
      console.log(`Updated last order processing time to: ${timestamp.toISOString()}`);
    } catch (error) {
      console.error('Error setting last order processing time:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const settingsService = new SettingsService(); 