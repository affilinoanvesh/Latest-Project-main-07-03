import { SupabaseService } from '../supabaseService';
import { Customer } from '../../types';
import { supabase } from '../supabase';

// Base class for all customer services to provide shared functionality
export class CustomerBaseService extends SupabaseService<Customer> {
  // All customer services can access this
  protected supabase = supabase;
  
  constructor(tableName: string) {
    super(tableName);
  }
} 