import { supabase } from '../../../services/supabase';

interface TaskStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  total_time_spent: number; // in seconds
  time_by_project: { project_name: string; time_spent: number; }[];
  time_by_day: { date: string; time_spent: number; }[];
}

// Statistics and reports
export const getTaskStats = async (
  startDate?: string, 
  endDate?: string, 
  projectId?: number
): Promise<TaskStats> => {
  // Build date range filter
  const dateFilter = [];
  if (startDate) {
    dateFilter.push(`created_at.gte.${startDate}`);
  }
  if (endDate) {
    dateFilter.push(`created_at.lte.${endDate}`);
  }
  
  // Get tasks
  let query = supabase
    .from('tasks')
    .select(`
      *,
      project:projects(*),
      time_entries(*)
    `);
  
  if (dateFilter.length > 0) {
    query = query.or(dateFilter.join(','));
  }
  
  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  
  const { data: tasks, error } = await query;
  
  if (error) throw error;
  
  // Get time entries in the date range
  let timeQuery = supabase
    .from('time_entries')
    .select(`
      *,
      task:tasks(*, project:projects(*))
    `);
  
  if (startDate) {
    timeQuery = timeQuery.gte('start_time', startDate);
  }
  
  if (endDate) {
    timeQuery = timeQuery.lte('start_time', endDate);
  }
  
  if (projectId) {
    timeQuery = timeQuery.eq('task.project_id', projectId);
  }
  
  const { data: timeEntries, error: timeError } = await timeQuery;
  
  if (timeError) throw timeError;
  
  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  
  // Calculate total time spent
  const totalTimeSpent = timeEntries.reduce((total, entry) => {
    return total + (entry.duration || 0);
  }, 0);
  
  // Time spent by project
  const timeByProject: Record<string, number> = {};
  timeEntries.forEach(entry => {
    const projectName = entry.task?.project?.name || 'No Project';
    if (!timeByProject[projectName]) {
      timeByProject[projectName] = 0;
    }
    timeByProject[projectName] += entry.duration || 0;
  });
  
  const timeByProjectArray = Object.keys(timeByProject).map(project_name => ({
    project_name,
    time_spent: timeByProject[project_name]
  }));
  
  // Time spent by day
  const timeByDay: Record<string, number> = {};
  timeEntries.forEach(entry => {
    const date = new Date(entry.start_time).toISOString().split('T')[0];
    if (!timeByDay[date]) {
      timeByDay[date] = 0;
    }
    timeByDay[date] += entry.duration || 0;
  });
  
  const timeByDayArray = Object.keys(timeByDay).map(date => ({
    date,
    time_spent: timeByDay[date]
  })).sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    in_progress_tasks: inProgressTasks,
    total_time_spent: totalTimeSpent,
    time_by_project: timeByProjectArray,
    time_by_day: timeByDayArray
  };
}; 