import { supabase } from '../../../services/supabase';

export interface TaskComment {
  id: number;
  task_id: number;
  content: string;
  author: string | null;
  created_at: string;
  updated_at: string;
}

export const getTaskComments = async (taskId: number): Promise<TaskComment[]> => {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createTaskComment = async (
  taskId: number,
  content: string,
  author?: string
): Promise<TaskComment> => {
  const { data, error } = await supabase
    .from('task_comments')
    .insert([
      {
        task_id: taskId,
        content,
        author,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTaskComment = async (
  commentId: number,
  content: string
): Promise<TaskComment> => {
  const { data, error } = await supabase
    .from('task_comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTaskComment = async (commentId: number): Promise<void> => {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}; 