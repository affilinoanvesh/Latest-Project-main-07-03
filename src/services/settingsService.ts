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
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching settings:', error);
        // If no settings exist yet, return defaults
        if (error.code === 'PGRST116') {
          return { ...DEFAULT_SETTINGS };
        }
        throw error;
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
      // First check if settings exist
      const { data: existingData, error: checkError } = await supabase
        .from(this.tableName)
        .select('*')
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking settings existence:', checkError);
        throw checkError;
      }
      
      let result;
      
      if (!existingData) {
        // Create new settings record
        result = await supabase
          .from(this.tableName)
          .insert([{ id: 1, ...DEFAULT_SETTINGS, ...settings }])
          .select()
          .single();
      } else {
        // Update existing settings
        result = await supabase
          .from(this.tableName)
          .update(settings)
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