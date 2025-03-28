import React, { useState } from 'react';
import { BarChart3, Plus, FolderPlus, ChevronDown, User2, Edit } from 'lucide-react';
import { Project } from '../types';

interface TaskManagerHeaderProps {
  projects: Project[];
  onCreateTask: () => void;
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
  onToggleStats: () => void;
}

const TaskManagerHeader: React.FC<TaskManagerHeaderProps> = ({
  projects,
  onCreateTask,
  onCreateProject,
  onEditProject,
  onToggleStats
}) => {
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const toggleProjectDropdown = () => {
    setShowProjectDropdown(!showProjectDropdown);
  };

  return (
    <div className="bg-white shadow-sm z-10">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-lg font-bold text-gray-900">Task Management</h1>
            </div>
            
            {/* Navigation Links */}
            <nav className="flex space-x-4">
              <a href="#" className="px-3 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-100">
                Dashboard
              </a>
              <a href="#" className="px-3 py-2 text-sm font-medium text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-900">
                Tasks
              </a>
              <a 
                href="#" 
                className="px-3 py-2 text-sm font-medium text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-900 flex items-center"
                onClick={(e) => {
                  e.preventDefault();
                  onToggleStats();
                }}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </a>
            </nav>
          </div>
          
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={toggleProjectDropdown}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Projects
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
              
              {showProjectDropdown && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onCreateProject();
                        setShowProjectDropdown(false);
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </button>
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    {projects.map(project => (
                      <div key={project.id} className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <span className="flex items-center">
                          <span 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: project.color }}
                          ></span>
                          {project.name}
                        </span>
                        <div className="flex">
                          <button 
                            onClick={() => {
                              onEditProject(project);
                              setShowProjectDropdown(false);
                            }}
                            className="text-gray-500 hover:text-gray-700 mr-2"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={onCreateTask}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskManagerHeader; 