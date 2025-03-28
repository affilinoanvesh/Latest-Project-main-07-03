import React, { useState, useEffect } from 'react';
import { Task, Project, Tag, TaskStatus, TaskPriority, CreateTaskInput } from '../types';
import { getProjects } from '../api/projectQueries';
import { getTaskTags } from '../api/tagQueries';
import { createTask, updateTask } from '../api/taskQueries';
import { AlertCircle, X, Calendar, Clock, Tag as TagIcon } from 'lucide-react';

interface TaskFormProps {
  task?: Task;
  initialProjectId?: number | null;
  initialStatus?: TaskStatus;
  onSave: () => void;
  onCancel: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ 
  task, 
  initialProjectId, 
  initialStatus = 'not_started',
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    status: initialStatus,
    priority: 'medium',
    project_id: initialProjectId || undefined,
    deadline: undefined,
    estimated_time: undefined,
    tag_ids: [],
    assignee: undefined
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'basic' | 'details' | 'tags'>('basic');

  useEffect(() => {
    loadFormData();
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        project_id: task.project?.id,
        deadline: task.deadline,
        estimated_time: task.estimated_time,
        tag_ids: task.tags?.map(tag => tag.id) || [],
        assignee: task.assignee
      });
    } else {
      setFormData(prev => ({
        ...prev,
        status: initialStatus || 'not_started',
        project_id: initialProjectId || undefined
      }));
    }
  }, [task, initialProjectId, initialStatus]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      const [fetchedProjects, fetchedTags] = await Promise.all([
        getProjects(),
        getTaskTags()
      ]);
      setProjects(fetchedProjects.filter(p => !p.archived));
      setTags(fetchedTags);
      setError(null);
    } catch (err) {
      setError('Failed to load form data');
      console.error('Error loading form data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }
    
    try {
      setLoading(true);
      if (task) {
        await updateTask(task.id, formData);
      } else {
        await createTask(formData);
      }
      setError(null);
      onSave();
    } catch (err) {
      setError(`Failed to ${task ? 'update' : 'create'} task`);
      console.error(`Error ${task ? 'updating' : 'creating'} task:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTagChange = (tagId: number) => {
    setFormData(prev => {
      const currentTags = prev.tag_ids || [];
      const newTags = currentTags.includes(tagId)
        ? currentTags.filter(id => id !== tagId)
        : [...currentTags, tagId];
      return { ...prev, tag_ids: newTags };
    });
  };

  const nextStep = () => {
    if (currentStep === 'basic') setCurrentStep('details');
    else if (currentStep === 'details') setCurrentStep('tags');
  };

  const prevStep = () => {
    if (currentStep === 'details') setCurrentStep('basic');
    else if (currentStep === 'tags') setCurrentStep('details');
  };

  const getSelectedProject = () => {
    if (!formData.project_id) return null;
    return projects.find(p => p.id === formData.project_id) || null;
  };

  const getSelectedTags = () => {
    if (!formData.tag_ids || formData.tag_ids.length === 0) return [];
    return tags.filter(tag => formData.tag_ids?.includes(tag.id));
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {task ? 'Edit Task' : 'Create New Task'}
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
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center mb-6">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step indicators */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div 
              className={`flex items-center justify-center h-8 w-8 rounded-full 
                ${currentStep === 'basic' ? 
                  'bg-blue-600 text-white' : 
                  'bg-gray-200 text-gray-700'}`}
            >
              1
            </div>
            <div className={`h-1 w-10 ${currentStep !== 'basic' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div 
              className={`flex items-center justify-center h-8 w-8 rounded-full 
                ${currentStep === 'details' ? 
                  'bg-blue-600 text-white' : 
                  currentStep === 'tags' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              2
            </div>
            <div className={`h-1 w-10 ${currentStep === 'tags' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div 
              className={`flex items-center justify-center h-8 w-8 rounded-full 
                ${currentStep === 'tags' ? 
                  'bg-blue-600 text-white' : 
                  'bg-gray-200 text-gray-700'}`}
            >
              3
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {currentStep === 'basic' ? 'Basic Info' : 
             currentStep === 'details' ? 'Task Details' : 'Tags'}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info Step */}
        {currentStep === 'basic' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Task Title*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter task title"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
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
                placeholder="Describe your task"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-gray-700">
                Project
              </label>
              <select
                id="project_id"
                name="project_id"
                value={formData.project_id || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
              >
                <option value="">No Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status || 'not_started'}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority || 'medium'}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Details Step */}
        {currentStep === 'details' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="assignee" className="block text-sm font-medium text-gray-700">
                Assignee
              </label>
              <select
                id="assignee"
                name="assignee"
                value={formData.assignee || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
              >
                <option value="">Not Assigned</option>
                <option value="Eunice">Eunice</option>
                <option value="Anvesh">Anvesh</option>
              </select>
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Deadline
              </label>
              <input
                type="datetime-local"
                id="deadline"
                name="deadline"
                value={formData.deadline ? new Date(formData.deadline).toISOString().slice(0, 16) : ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="estimated_time" className="block text-sm font-medium text-gray-700 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Estimated Time (minutes)
              </label>
              <input
                type="number"
                id="estimated_time"
                name="estimated_time"
                value={formData.estimated_time || ''}
                onChange={handleInputChange}
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
              />
            </div>

            {/* Summary of Basic Info */}
            <div className="bg-gray-50 p-4 rounded-md mt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Task Summary</h3>
              <p className="text-sm text-gray-900 font-medium">{formData.title}</p>
              {formData.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{formData.description}</p>
              )}
              <div className="flex items-center mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                  ${formData.status === 'not_started' ? 'bg-gray-100 text-gray-800' : 
                    formData.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                    formData.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    'bg-red-100 text-red-800'}`}
                >
                  {formData.status.replace('_', ' ')}
                </span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium 
                  ${formData.priority === 'low' ? 'bg-green-100 text-green-800' : 
                    formData.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                    formData.priority === 'high' ? 'bg-orange-100 text-orange-800' : 
                    'bg-red-100 text-red-800'}`}
                >
                  {formData.priority}
                </span>
              </div>
              {getSelectedProject() && (
                <div className="mt-2 text-xs text-gray-600">
                  Project: {getSelectedProject()?.name}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags Step */}
        {currentStep === 'tags' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <TagIcon className="h-4 w-4 mr-1" />
                Tags
              </label>
              <div className="grid grid-cols-2 gap-2">
                {tags.map(tag => (
                  <label key={tag.id} className="flex items-center p-2 border rounded-md">
                    <input
                      type="checkbox"
                      checked={formData.tag_ids?.includes(tag.id)}
                      onChange={() => handleTagChange(tag.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span
                      className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: tag.color || '#E5E7EB',
                        color: '#1F2937'
                      }}
                    >
                      {tag.name}
                    </span>
                  </label>
                ))}
              </div>

              {tags.length === 0 && (
                <p className="text-sm text-gray-500">No tags available. Create tags in the settings.</p>
              )}
            </div>

            {/* Selected Tags Summary */}
            {getSelectedTags().length > 0 && (
              <div className="bg-gray-50 p-4 rounded-md mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Selected Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {getSelectedTags().map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: tag.color || '#E5E7EB',
                        color: '#1F2937'
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary of Task */}
            <div className="bg-gray-50 p-4 rounded-md mt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Task Preview</h3>
              <p className="text-sm text-gray-900 font-medium">{formData.title}</p>
              {formData.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{formData.description}</p>
              )}
              <div className="flex items-center mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                  ${formData.status === 'not_started' ? 'bg-gray-100 text-gray-800' : 
                    formData.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                    formData.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    'bg-red-100 text-red-800'}`}
                >
                  {formData.status.replace('_', ' ')}
                </span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium 
                  ${formData.priority === 'low' ? 'bg-green-100 text-green-800' : 
                    formData.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                    formData.priority === 'high' ? 'bg-orange-100 text-orange-800' : 
                    'bg-red-100 text-red-800'}`}
                >
                  {formData.priority}
                </span>
              </div>
              {getSelectedProject() && (
                <div className="mt-2 text-xs text-gray-600">
                  Project: {getSelectedProject()?.name}
                </div>
              )}
              {formData.deadline && (
                <div className="mt-2 text-xs text-gray-600 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(formData.deadline).toLocaleString()}
                </div>
              )}
              {formData.estimated_time && (
                <div className="mt-2 text-xs text-gray-600 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formData.estimated_time} minutes
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          {currentStep !== 'basic' ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          )}

          {currentStep !== 'tags' ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Task'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TaskForm; 