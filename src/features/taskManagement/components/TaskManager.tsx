import React, { useState, useEffect } from 'react';
import Board from './Board';
import TaskDetails from './TaskDetails';
import TaskForm from './TaskForm';
import ProjectForm from './ProjectForm';
import TaskStats from './TaskStats';
import TaskManagerHeader from './TaskManagerHeader';
import { Task, TaskStatus, Project } from '../types';
import { X } from 'lucide-react';
import { getProjects } from '../api/projectQueries';

const TaskManager: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isShowingStats, setIsShowingStats] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [initialTaskStatus, setInitialTaskStatus] = useState<TaskStatus | undefined>(undefined);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  
  useEffect(() => {
    loadProjects();
  }, [refreshTrigger]);
  
  const loadProjects = async () => {
    try {
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskClose = () => {
    setSelectedTask(null);
    refreshBoard();
  };

  const handleCreateTask = (initialStatus?: TaskStatus) => {
    setInitialTaskStatus(initialStatus);
    setIsCreatingTask(true);
  };

  const handleTaskSave = () => {
    setIsCreatingTask(false);
    refreshBoard();
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsCreatingProject(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsCreatingProject(true);
  };

  const handleProjectSave = () => {
    setIsCreatingProject(false);
    setEditingProject(null);
    refreshBoard();
  };

  const refreshBoard = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const toggleStats = () => {
    setIsShowingStats(!isShowingStats);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Task Manager Header */}
      <TaskManagerHeader 
        projects={projects}
        onCreateTask={() => handleCreateTask()}
        onCreateProject={handleCreateProject}
        onEditProject={handleEditProject}
        onToggleStats={toggleStats}
      />

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Board view */}
        <div className="flex-1 overflow-auto p-4">
          <Board 
            onTaskSelect={handleTaskSelect}
            onCreateTask={handleCreateTask}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>

      {/* Task details modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0" aria-hidden="true"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  onClick={handleTaskClose}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <TaskDetails
                taskId={selectedTask.id}
                onClose={handleTaskClose}
                onUpdate={refreshBoard}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create task modal */}
      {isCreatingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0" aria-hidden="true"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <TaskForm
                initialProjectId={null}
                initialStatus={initialTaskStatus}
                onSave={handleTaskSave}
                onCancel={() => setIsCreatingTask(false)}
                task={undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create project modal */}
      {isCreatingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0" aria-hidden="true"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <ProjectForm
                project={editingProject || undefined}
                onSave={() => {
                  setIsCreatingProject(false);
                  setEditingProject(null);
                  refreshBoard();
                }}
                onCancel={() => {
                  setIsCreatingProject(false);
                  setEditingProject(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats modal */}
      {isShowingStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0" aria-hidden="true"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <TaskStats onClose={toggleStats} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager; 