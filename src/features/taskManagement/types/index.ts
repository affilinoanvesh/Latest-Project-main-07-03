// Task management types

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: number;
  task_id: number;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id?: number | null;
  project?: Project;
  deadline?: string;
  estimated_time?: number;
  total_time_spent?: number;
  tags?: Tag[];
  time_entries?: TimeEntry[];
  tag_ids?: number[];
  assignee?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface TaskDependency {
  id: number;
  dependent_task_id: number;
  dependency_task_id: number;
  created_at: string;
  dependent_task?: Task;
  dependency_task?: Task;
}

// Form submission types
export interface CreateProjectInput {
  name: string;
  description: string | null;
  color: string;
  archived?: boolean;
}

export interface CreateTaskInput {
  project_id?: number | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  estimated_time?: number;
  tag_ids?: number[];
  assignee?: string;
}

export interface CreateTimeEntryInput {
  task_id: number;
  start_time: string;
  end_time?: string;
  notes?: string;
}

export interface CreateTaskTagInput {
  name: string;
  color: string;
}

export interface TaskTag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDependencyInput {
  dependent_task_id: number;
  dependency_task_id: number;
}

export interface TaskStats {
  total_tasks: number;
  completed_tasks: number;
  time_spent_by_project: {
    project_id: number;
    project_name: string;
    total_time: number;
  }[];
  time_spent_by_day: {
    date: string;
    total_time: number;
  }[];
} 