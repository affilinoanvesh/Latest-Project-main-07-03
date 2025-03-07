import { ApiCredentials } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

/**
 * API Credentials service for Supabase
 */
export class CredentialsService extends SupabaseService<ApiCredentials & { id?: number }> {
  constructor() {
    super('api_credentials');
  }

  /**
   * Get the first set of credentials (most applications only need one set)
   */
  async getCredentials(): Promise<(ApiCredentials & { id?: number }) | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return null;
      }
      console.error('Error fetching credentials:', error);
      throw error;
    }

    return data as (ApiCredentials & { id?: number });
  }

  /**
   * Save credentials (upsert - create if not exists, update if exists)
   */
  async saveCredentials(credentials: ApiCredentials): Promise<(ApiCredentials & { id?: number })> {
    // First check if we have any credentials
    const existing = await this.getCredentials();

    if (existing) {
      // Update existing credentials
      const { data, error } = await supabase
        .from(this.tableName)
        .update(credentials)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating credentials:', error);
        throw error;
      }

      return data as (ApiCredentials & { id?: number });
    } else {
      // Create new credentials
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(credentials)
        .select()
        .single();

      if (error) {
        console.error('Error creating credentials:', error);
        throw error;
      }

      return data as (ApiCredentials & { id?: number });
    }
  }

  /**
   * Delete all credentials
   */
  async deleteCredentials(): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .neq('id', 0); // Delete all records

    if (error) {
      console.error('Error deleting credentials:', error);
      throw error;
    }
  }
}

// Export an instance of the service
export const credentialsService = new CredentialsService(); 