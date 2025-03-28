import { supabase } from '../../../services/supabase';
import { 
  TaskTag,
  CreateTaskTagInput
} from '../types';

// Task tags queries
export const getTaskTags = async (): Promise<TaskTag[]> => {
  const { data, error } = await supabase
    .from('task_tags')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data as TaskTag[];
};

export const createTaskTag = async (tag: CreateTaskTagInput): Promise<TaskTag> => {
  const { data, error } = await supabase
    .from('task_tags')
    .insert(tag)
    .select()
    .single();
  
  if (error) throw error;
  return data as TaskTag;
};

export const updateTaskTag = async (id: number, tag: Partial<CreateTaskTagInput>): Promise<TaskTag> => {
  const { data, error } = await supabase
    .from('task_tags')
    .update(tag)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as TaskTag;
};

export const deleteTaskTag = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('task_tags')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}; 