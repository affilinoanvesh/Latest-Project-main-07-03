import { supabase } from '../../../services/supabase';
import { 
  Task,
  CreateTaskInput,
  TaskStatus,
  Tag
} from '../types';

// Task queries
export const getTasks = async (filters: { 
  project_id?: number, 
  status?: string,
  priority?: string, 
  search?: string,
  assignee?: string
} = {}): Promise<Task[]> => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      project:projects(*),
      time_entries(*)
    `);
  
  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id);
  }
  
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }
  
  if (filters.assignee) {
    query = query.eq('assignee', filters.assignee);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Calculate total time spent for each task
  const tasksWithTimeCalculated = (data as Task[]).map(task => {
    const timeEntries = task.time_entries || [];
    const totalTimeSpent = timeEntries.reduce((total, entry) => {
      return total + (entry.duration || 0);
    }, 0);
    
    return {
      ...task,
      total_time_spent: totalTimeSpent
    };
  });
  
  return tasksWithTimeCalculated;
};

export const getTaskById = async (id: number): Promise<Task | null> => {
  try {
    // First fetch the task with basic details
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    // Fetch time entries for this task
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('task_id', id);
      
    if (timeEntriesError) throw timeEntriesError;
    
    // Fetch tags separately
    const { data: tagRelations, error: tagsError } = await supabase
      .from('task_tag_relations')
      .select('tag_id')
      .eq('task_id', id);
      
    if (tagsError) throw tagsError;
    
    const tagIds = tagRelations.map(rel => rel.tag_id);
    
    let tags: Tag[] = [];
    if (tagIds.length > 0) {
      const { data: tagsData, error: fetchTagsError } = await supabase
        .from('task_tags')
        .select('*')
        .in('id', tagIds);
        
      if (fetchTagsError) throw fetchTagsError;
      
      tags = tagsData as Tag[];
    }
    
    // Calculate total time spent
    const totalTimeSpent = timeEntries.reduce((total, entry) => {
      return total + (entry.duration || 0);
    }, 0);
    
    // Combine all data
    return {
      ...data as Task,
      time_entries: timeEntries,
      total_time_spent: totalTimeSpent,
      tags
    };
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    throw error;
  }
};

export const createTask = async (task: CreateTaskInput): Promise<Task> => {
  // Start a transaction
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: task.project_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      estimated_time: task.estimated_time,
      assignee: task.assignee
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // If tags are provided, create relations
  if (task.tag_ids && task.tag_ids.length > 0) {
    const tagRelations = task.tag_ids.map(tag_id => ({
      task_id: data.id,
      tag_id
    }));
    
    const { error: tagError } = await supabase
      .from('task_tag_relations')
      .insert(tagRelations);
    
    if (tagError) throw tagError;
  }
  
  return data as Task;
};

export const updateTask = async (id: number, task: Partial<CreateTaskInput>): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      project_id: task.project_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      estimated_time: task.estimated_time,
      assignee: task.assignee,
      updated_at: new Date().toISOString(),
      ...(task.status === 'completed' ? { completed_at: new Date().toISOString() } : {})
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  // If tags are provided, update relations
  if (task.tag_ids) {
    // First, delete existing relations
    const { error: deleteError } = await supabase
      .from('task_tag_relations')
      .delete()
      .eq('task_id', id);
    
    if (deleteError) throw deleteError;
    
    // Then, create new relations if there are tags
    if (task.tag_ids.length > 0) {
      const tagRelations = task.tag_ids.map(tag_id => ({
        task_id: id,
        tag_id
      }));
      
      const { error: tagError } = await supabase
        .from('task_tag_relations')
        .insert(tagRelations);
      
      if (tagError) throw tagError;
    }
  }
  
  return data as Task;
};

export const deleteTask = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

/**
 * Updates the status of a task
 * @param taskId The ID of the task to update
 * @param status The new status for the task
 * @returns The updated task
 */
export const updateTaskStatus = async (taskId: number, status: TaskStatus): Promise<Task> => {
  try {
    console.log(`Updating task ${taskId} with status ${status}`);
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // If status is completed, also set completed_at
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select('*');
    
    if (error) {
      console.error('Error in updateTaskStatus:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    console.log(`Successfully updated task ${taskId} to status ${status}`);
    
    // Fetch the complete task with relations
    const updatedTask = await getTaskById(taskId);
    if (!updatedTask) {
      throw new Error(`Failed to fetch updated task ${taskId}`);
    }
    
    return updatedTask;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw new Error(`Failed to update task status: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 