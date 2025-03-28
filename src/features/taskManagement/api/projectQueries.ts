import { supabase } from '../../../services/supabase';
import { 
  Project,
  CreateProjectInput
} from '../types';

// Project queries
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw new Error('Failed to fetch projects');
  }

  return data || [];
}

export async function getProjectById(id: number): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    throw new Error('Failed to fetch project');
  }

  if (!data) {
    throw new Error('Project not found');
  }

  return data;
}

export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
  try {
    console.log('Creating project with data:', project); // Debug log
    
    // Create a new object without the archived property
    const { archived, ...projectData } = project;
    
    console.log('Sending to database:', projectData); // Debug log
    
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create project: No data returned');
    }

    return data;
  } catch (error) {
    console.error('Exception in createProject:', error);
    throw error;
  }
}

export async function updateProject(
  id: number,
  project: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
): Promise<Project> {
  try {
    console.log('Updating project with data:', project); // Debug log
    
    // Create a new object without the archived property
    const { archived, ...projectData } = project;
    
    console.log('Sending to database:', projectData); // Debug log
    
    const { data, error } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw new Error(`Failed to update project: ${error.message}`);
    }

    if (!data) {
      throw new Error('Project not found');
    }

    return data;
  } catch (error) {
    console.error('Exception in updateProject:', error);
    throw error;
  }
}

export async function deleteProject(id: number): Promise<void> {
  // First, update all tasks associated with this project to have no project
  const { error: taskUpdateError } = await supabase
    .from('tasks')
    .update({ project_id: null })
    .eq('project_id', id);

  if (taskUpdateError) {
    console.error('Error updating tasks:', taskUpdateError);
    throw new Error('Failed to update associated tasks');
  }

  // Then delete the project
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting project:', deleteError);
    throw new Error('Failed to delete project');
  }
}

export async function archiveProject(id: number): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ archived: true })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error archiving project:', error);
    throw new Error('Failed to archive project');
  }

  if (!data) {
    throw new Error('Project not found');
  }

  return data;
} 