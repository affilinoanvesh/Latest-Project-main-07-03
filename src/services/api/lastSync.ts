import { supabase } from '../supabase';

export const getLastSyncByType = async (type: string) => {
  try {
    const { data, error } = await supabase
      .from('last_sync')
      .select('*')
      .eq('type', type)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return null;
      }
      console.error('Error fetching last sync by type:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`Error getting last sync for type ${type}:`, error);
    return null;
  }
};

export const updateLastSync = async (type: string) => {
  try {
    const timestamp = new Date().toISOString();
    
    // Check if record exists
    const existing = await getLastSyncByType(type);
    
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('last_sync')
        .update({ timestamp })
        .eq('type', type);
        
      if (error) throw error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('last_sync')
        .insert([{ type, timestamp, created_at: timestamp }]);
        
      if (error) throw error;
    }
  } catch (error) {
    console.error(`Error updating last sync for type ${type}:`, error);
    throw error;
  }
}; 