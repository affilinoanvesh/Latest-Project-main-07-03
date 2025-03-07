import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';
import { toSupabaseDateString, fromSupabaseDate, validateDate } from './api/utils';

const DEBUG = true;

/**
 * Debug utility for sync operations
 */
const debugSync = (context: string, data: any = null, error: any = null) => {
  if (!DEBUG) return;

  console.group(`🔄 Sync Debug: ${context}`);
  
  if (data !== null) {
    console.log('Data:', {
      value: data,
      type: typeof data,
      isDate: data instanceof Date,
      timestamp: data instanceof Date ? data.getTime() : undefined,
      isoString: data instanceof Date ? data.toISOString() : undefined,
      rawToString: data?.toString?.()
    });
  }
  
  if (error !== null) {
    console.log('Error:', {
      message: error.message,
      stack: error.stack,
      raw: error
    });
  }
  
  console.groupEnd();
};

interface SyncRecord {
  id?: number;
  timestamp: Date;
  type: string;
}

/**
 * Sync service for Supabase
 */
export class SyncService extends SupabaseService<SyncRecord> {
  constructor() {
    super('last_sync');
    debugSync('Service initialized');
  }

  /**
   * Get current date in NZ timezone
   * @private
   */
  private getNZDate(): Date {
    debugSync('getNZDate - start');
    
    // Create date with NZ timezone offset (UTC+12 or UTC+13 during daylight saving)
    const now = new Date();
    debugSync('getNZDate - current date', now);
    
    // Determine if NZ is currently in daylight saving time
    // NZ DST typically runs from late September to early April
    const isDST = now.getMonth() > 8 || now.getMonth() < 4;
    debugSync('getNZDate - DST check', { month: now.getMonth(), isDST });
    
    // Apply NZ offset (UTC+12 or UTC+13 during DST)
    const nzOffset = isDST ? 13 : 12;
    debugSync('getNZDate - offset calculation', { isDST, nzOffset });
    
    // Create a date with the NZ offset and validate it
    const nzDate = new Date(now.getTime() + (nzOffset * 60 * 60 * 1000));
    debugSync('getNZDate - adjusted date', nzDate);
    
    if (isNaN(nzDate.getTime())) {
      console.error('Failed to create valid NZ date');
      debugSync('getNZDate - invalid date, using fallback', new Date());
      return new Date(); // Fallback to current system date
    }
    
    debugSync('getNZDate - success', nzDate);
    return nzDate;
  }

  /**
   * Get the last sync record by type
   */
  async getLastSyncByType(type: string): Promise<SyncRecord | null> {
    debugSync('getLastSyncByType - start', { type });
    
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('type', type)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        debugSync('getLastSyncByType - no record found', { type });
        return null;
      }
      debugSync('getLastSyncByType - error', null, error);
      console.error('Error fetching last sync by type:', error);
      throw error;
    }

    // If no data, return null
    if (!data) {
      debugSync('getLastSyncByType - no data', { type });
      return null;
    }

    debugSync('getLastSyncByType - raw data', data);

    try {
      // Parse and validate the timestamp
      const timestamp = fromSupabaseDate(data.timestamp);
      debugSync('getLastSyncByType - parsed timestamp', timestamp);
      
      // If we couldn't parse the timestamp, use current NZ date
      if (!timestamp) {
        debugSync('getLastSyncByType - invalid timestamp, using current date', data.timestamp);
        const currentDate = this.getNZDate();
        return {
          ...data,
          timestamp: currentDate
        };
      }

      // Additional validation to ensure we have a valid Date object
      if (isNaN(timestamp.getTime())) {
        debugSync('getLastSyncByType - invalid timestamp after parsing', timestamp);
        const currentDate = this.getNZDate();
        return {
          ...data,
          timestamp: currentDate
        };
      }

      const result = {
        ...data,
        timestamp
      };
      debugSync('getLastSyncByType - success', result);
      return result;
    } catch (e) {
      debugSync('getLastSyncByType - processing error', null, e);
      console.error('Error processing sync record:', e);
      // Return a valid record with current date rather than failing
      const result = {
        ...data,
        timestamp: this.getNZDate()
      };
      debugSync('getLastSyncByType - fallback result', result);
      return result;
    }
  }

  /**
   * Update the last sync timestamp for a type
   */
  async updateLastSync(type: string, timestamp: Date = this.getNZDate()): Promise<SyncRecord> {
    debugSync('updateLastSync - start', { type, timestamp });
    
    // Validate the input timestamp
    const validTimestamp = validateDate(timestamp) || this.getNZDate();
    debugSync('updateLastSync - validated timestamp', validTimestamp);
    
    // Convert to ISO string for Supabase
    const isoTimestamp = toSupabaseDateString(validTimestamp);
    debugSync('updateLastSync - ISO timestamp', isoTimestamp);
    
    if (!isoTimestamp) {
      const error = new Error('Invalid timestamp format');
      debugSync('updateLastSync - invalid timestamp error', { timestamp }, error);
      console.error('Failed to convert timestamp to ISO string:', timestamp);
      throw error;
    }
    
    // First check if we have a sync record for this type
    const existing = await this.getLastSyncByType(type).catch(() => null);
    debugSync('updateLastSync - existing record', existing);

    if (existing) {
      debugSync('updateLastSync - updating existing record', { id: existing.id, isoTimestamp });
      
      // Update existing sync record
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ timestamp: isoTimestamp })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        debugSync('updateLastSync - update error', null, error);
        console.error('Error updating sync record:', error);
        throw error;
      }

      // Parse and validate the timestamp from the response
      const parsedTimestamp = data?.timestamp ? fromSupabaseDate(data.timestamp) : null;
      debugSync('updateLastSync - parsed response timestamp', parsedTimestamp);
      
      const finalTimestamp = validateDate(parsedTimestamp) || this.getNZDate();
      debugSync('updateLastSync - final validated timestamp', finalTimestamp);
      
      const result = {
        ...data,
        timestamp: finalTimestamp
      } as SyncRecord;
      
      debugSync('updateLastSync - update success', result);
      return result;
    } else {
      debugSync('updateLastSync - creating new record', { type, isoTimestamp });
      
      // Create new sync record
      const { data, error } = await supabase
        .from(this.tableName)
        .insert({ 
          type, 
          timestamp: isoTimestamp,
          created_at: this.getNZDate().toISOString()
        })
        .select()
        .single();

      if (error) {
        debugSync('updateLastSync - insert error', null, error);
        console.error('Error creating sync record:', error);
        throw error;
      }

      // Parse and validate the timestamp from the response
      const parsedTimestamp = data?.timestamp ? fromSupabaseDate(data.timestamp) : null;
      debugSync('updateLastSync - parsed response timestamp', parsedTimestamp);
      
      const finalTimestamp = validateDate(parsedTimestamp) || this.getNZDate();
      debugSync('updateLastSync - final validated timestamp', finalTimestamp);
      
      const result = {
        ...data,
        timestamp: finalTimestamp
      } as SyncRecord;
      
      debugSync('updateLastSync - insert success', result);
      return result;
    }
  }
}

// Export an instance of the service
export const syncService = new SyncService(); 