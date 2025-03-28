import { supabase } from '../../../services/supabase';
import { TimeEntry, CreateTimeEntryInput } from '../types';

export async function getTimeEntries(taskId: number): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('task_id', taskId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching time entries:', error);
    throw new Error('Failed to fetch time entries');
  }

  return data || [];
}

export async function getTimeEntryById(id: number): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching time entry:', error);
    throw new Error('Failed to fetch time entry');
  }

  if (!data) {
    throw new Error('Time entry not found');
  }

  return data;
}

export async function getActiveTimeEntry(taskId: number): Promise<TimeEntry | null> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('task_id', taskId)
    .is('end_time', null)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error code
    console.error('Error fetching active time entry:', error);
    throw new Error('Failed to fetch active time entry');
  }

  return data || null;
}

export async function startTimer(input: CreateTimeEntryInput): Promise<TimeEntry> {
  // First, check if there's an active timer for this task
  const activeTimer = await getActiveTimeEntry(input.task_id);
  
  if (activeTimer) {
    // If there's an active timer, stop it first
    await stopTimer(activeTimer.id);
  }

  // Create new timer
  const { data, error } = await supabase
    .from('time_entries')
    .insert([input])
    .select()
    .single();

  if (error) {
    console.error('Error starting timer:', error);
    throw new Error('Failed to start timer');
  }

  if (!data) {
    throw new Error('Failed to start timer: No data returned');
  }

  return data;
}

export async function stopTimer(timeEntryId: number): Promise<TimeEntry> {
  // First get the time entry to calculate duration
  const { data: timeEntry, error: fetchError } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', timeEntryId)
    .single();

  if (fetchError) {
    console.error('Error fetching time entry for stopping:', fetchError);
    throw new Error('Failed to fetch time entry for stopping');
  }

  if (!timeEntry) {
    throw new Error('Time entry not found');
  }

  const now = new Date();
  const startTime = new Date(timeEntry.start_time);
  const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

  // Now update the time entry
  const { data, error } = await supabase
    .from('time_entries')
    .update({
      end_time: now.toISOString(),
      duration: durationSeconds
    })
    .eq('id', timeEntryId)
    .select()
    .single();

  if (error) {
    console.error('Error stopping timer:', error);
    throw new Error('Failed to stop timer');
  }

  if (!data) {
    throw new Error('Failed to stop timer: No data returned');
  }

  // Update task's total time spent
  if (data.task_id) {
    try {
      await updateTaskTotalTimeSpent(data.task_id);
    } catch (err) {
      console.error('Error updating task total time spent:', err);
    }
  }

  return data;
}

export async function deleteTimeEntry(timeEntryId: number): Promise<void> {
  // First, get the time entry to know the task_id for updating total time
  const { data: timeEntry, error: fetchError } = await supabase
    .from('time_entries')
    .select('task_id')
    .eq('id', timeEntryId)
    .single();

  if (fetchError) {
    console.error('Error fetching time entry:', fetchError);
    throw new Error('Failed to fetch time entry');
  }

  // Delete the time entry
  const { error: deleteError } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', timeEntryId);

  if (deleteError) {
    console.error('Error deleting time entry:', deleteError);
    throw new Error('Failed to delete time entry');
  }

  // Update task's total time spent
  if (timeEntry?.task_id) {
    try {
      await updateTaskTotalTimeSpent(timeEntry.task_id);
    } catch (err) {
      console.error('Error updating task total time spent:', err);
    }
  }
}

export async function updateTimeEntry(
  id: number,
  updates: Partial<Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>>
): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating time entry:', error);
    throw new Error('Failed to update time entry');
  }

  if (!data) {
    throw new Error('Time entry not found');
  }

  // If duration changed, update task's total time spent
  if ('duration' in updates && data.task_id) {
    try {
      await updateTaskTotalTimeSpent(data.task_id);
    } catch (err) {
      console.error('Error updating task total time spent:', err);
    }
  }

  return data;
}

async function updateTaskTotalTimeSpent(taskId: number): Promise<void> {
  // Calculate total time spent on this task
  const { data, error } = await supabase
    .from('time_entries')
    .select('duration')
    .eq('task_id', taskId)
    .not('duration', 'is', null);

  if (error) {
    console.error('Error calculating total time spent:', error);
    return;
  }

  const totalTimeSpent = data.reduce((sum: number, entry: { duration: number }) => sum + (entry.duration || 0), 0);

  // Update the task
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ total_time_spent: totalTimeSpent })
    .eq('id', taskId);

  if (updateError) {
    console.error('Error updating task total time spent:', updateError);
  }
} 