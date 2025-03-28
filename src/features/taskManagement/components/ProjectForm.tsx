import React, { useState } from 'react';
import { Project, CreateProjectInput } from '../types';
import { createProject, updateProject, deleteProject } from '../api/projectQueries';
import { AlertCircle, X, Trash2 } from 'lucide-react';

interface ProjectFormProps {
  project?: Project;
  onSave: () => void;
  onCancel: () => void;
}

// Color options for project
const colorOptions = [
  '#F87171', // red
  '#FB923C', // orange
  '#FBBF24', // amber
  '#A3E635', // lime
  '#34D399', // emerald
  '#22D3EE', // cyan
  '#60A5FA', // blue
  '#818CF8', // indigo
  '#A78BFA', // violet
  '#F472B6', // pink
];

// Function to get a random color
const getRandomColor = (): string => {
  return colorOptions[Math.floor(Math.random() * colorOptions.length)];
};

const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSave, onCancel }) => {
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: project?.name || '',
    description: project?.description || null,
    color: project?.color || getRandomColor()
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorChange = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }
    
    const projectData = {
      name: formData.name,
      description: formData.description || null,
      color: formData.color || getRandomColor(),
      archived: false
    };
    
    try {
      setLoading(true);
      if (project) {
        await updateProject(project.id, projectData);
      } else {
        await createProject(projectData);
      }
      setError(null);
      onSave();
    } catch (err) {
      setError(`Failed to ${project ? 'update' : 'create'} project`);
      console.error(`Error ${project ? 'updating' : 'creating'} project:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      if (project) {
        await deleteProject(project.id);
        setError(null);
        onSave(); // Close the form and refresh the board
      }
    } catch (err) {
      setError('Failed to delete project');
      console.error('Error deleting project:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {project ? 'Edit Project' : 'Create New Project'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-500"
        >
          <span className="sr-only">Close</span>
          <X className="h-6 w-6" />
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Project Name*
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
            placeholder="Enter project name"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
            placeholder="Describe your project"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Color
          </label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-8 h-8 rounded-full ${formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(color)}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && project && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Project</h3>
            <p className="mb-6">
              Are you sure you want to delete project "{project.name}"? This action cannot be undone and will remove all associated tasks.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 flex justify-between">
        {/* Show delete button only for existing projects */}
        <div>
          {project && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="h-4 w-4 mr-1 inline-block" />
              Delete Project
            </button>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProjectForm; 