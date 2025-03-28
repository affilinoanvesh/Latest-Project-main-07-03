import React, { useState, useEffect } from 'react';
import { DragDropContext, Draggable, DropResult, DroppableProvided } from 'react-beautiful-dnd';
import { StrictModeDroppable } from '../utils/StrictModeDroppable';
import { Task, TaskStatus } from '../types';
import { getTasks, updateTaskStatus } from '../api/taskQueries';
import { Plus, AlertCircle, CheckCircle2, Circle, Clock, CalendarClock } from 'lucide-react';

interface BoardProps {
  onTaskSelect: (task: Task) => void;
  onCreateTask: (initialStatus?: TaskStatus) => void;
  refreshTrigger?: number;
}

interface Column {
  id: TaskStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
}

const Board: React.FC<BoardProps> = ({ onTaskSelect, onCreateTask, refreshTrigger }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterProject, setFilterProject] = useState<number | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>('');

  const columns: Column[] = [
    { 
      id: 'not_started', 
      title: 'Not Started', 
      icon: <Circle className="h-4 w-4 text-gray-500" />,
      color: 'bg-gray-100'
    },
    { 
      id: 'in_progress', 
      title: 'In Progress', 
      icon: <Clock className="h-4 w-4 text-blue-500" />,
      color: 'bg-blue-100'
    },
    { 
      id: 'completed', 
      title: 'Completed', 
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      color: 'bg-green-100'
    },
    { 
      id: 'cancelled', 
      title: 'Cancelled', 
      icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      color: 'bg-red-100'
    }
  ];

  useEffect(() => {
    loadTasks();
  }, [refreshTrigger]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const fetchedTasks = await getTasks({
        search: searchTerm || undefined,
        priority: filterPriority || undefined,
        project_id: filterProject || undefined,
        assignee: filterAssignee || undefined
      });
      setTasks(fetchedTasks);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    console.log('Drag end result:', result);

    // Return if dropped outside a droppable area
    if (!destination) {
      console.log('No destination found, dropping outside droppable area');
      return;
    }
    
    // Return if dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      console.log('Dropped in same position, no changes needed');
      return;
    }

    try {
      // Convert draggableId to number (task id)
      const taskId = parseInt(draggableId);
      if (isNaN(taskId)) {
        console.error('Invalid task ID:', draggableId);
        return;
      }
      
      // Get new status from destination droppableId
      const newStatus = destination.droppableId as TaskStatus;
      
      console.log(`Moving task ${taskId} from ${source.droppableId} to status: ${newStatus}`);

      // Optimistically update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus } 
            : task
        )
      );

      // Update in the database
      await updateTaskStatus(taskId, newStatus);
      console.log(`Successfully updated task ${taskId} to status: ${newStatus}`);
    } catch (err) {
      // Revert on error
      setError(`Failed to update task status: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error updating task status:', err);
      loadTasks(); // Reload to get actual state
    }
  };

  const getTasksByStatus = (status: TaskStatus) => {
    let filteredTasks = tasks.filter(task => task.status === status);
    
    // Apply assignee filter if selected
    if (filterAssignee) {
      filteredTasks = filteredTasks.filter(task => task.assignee === filterAssignee);
    }
    
    return filteredTasks;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'priority') {
      setFilterPriority(value);
    } else if (name === 'project') {
      setFilterProject(value ? parseInt(value) : null);
    } else if (name === 'assignee') {
      setFilterAssignee(value);
    }
  };

  const applyFilters = () => {
    loadTasks();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterPriority('');
    setFilterProject(null);
    setFilterAssignee('');
    loadTasks();
  };

  const getUniqueProjects = () => {
    const projectsSet = new Set();
    const uniqueProjects: { id: number; name: string }[] = [];
    
    tasks.forEach(task => {
      if (task.project && !projectsSet.has(task.project.id)) {
        projectsSet.add(task.project.id);
        uniqueProjects.push({ id: task.project.id, name: task.project.name });
      }
    });
    
    return uniqueProjects;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDeadline = (deadline: string | undefined) => {
    if (!deadline) return null;
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const deadlineDay = new Date(deadlineDate);
    deadlineDay.setHours(0, 0, 0, 0);
    
    if (deadlineDay.getTime() === today.getTime()) {
      return { text: 'Today', variant: 'warning' };
    } else if (deadlineDay.getTime() === tomorrow.getTime()) {
      return { text: 'Tomorrow', variant: 'warning' };
    } else if (deadlineDay < today) {
      return { text: 'Overdue', variant: 'danger' };
    } else {
      // Format: May 15, 2023
      return { 
        text: deadlineDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric' 
        }),
        variant: 'normal'
      };
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters and search */}
      <div className="bg-white p-4 mb-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search tasks..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-3 pr-10 py-2 border border-gray-300 bg-white"
              />
              <button
                onClick={applyFilters}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="w-auto">
            <select
              name="priority"
              value={filterPriority}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          
          <div className="w-auto">
            <select
              name="project"
              value={filterProject || ''}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
            >
              <option value="">All Projects</option>
              {getUniqueProjects().map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="w-auto">
            <select
              name="assignee"
              value={filterAssignee}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border border-gray-300 bg-white px-3 py-2"
            >
              <option value="">All Assignees</option>
              <option value="Eunice">Eunice</option>
              <option value="Anvesh">Anvesh</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={applyFilters}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}
      
      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
          {columns.map(column => (
            <div key={column.id} className="flex flex-col h-full rounded-lg overflow-hidden bg-white shadow">
              {/* Column header */}
              <div className={`p-3 flex items-center justify-between ${column.color}`}>
                <div className="flex items-center">
                  {column.icon}
                  <h3 className="font-medium ml-2">{column.title}</h3>
                  <span className="ml-2 text-xs font-semibold rounded-full bg-white px-2 py-1 text-gray-600">
                    {getTasksByStatus(column.id).length}
                  </span>
                </div>
                <button
                  onClick={() => onCreateTask(column.id)}
                  className="p-1 rounded-full hover:bg-white/30"
                  aria-label={`Add task to ${column.title}`}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              
              {/* Column content */}
              <StrictModeDroppable droppableId={column.id}>
                {(provided: DroppableProvided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 overflow-y-auto p-2"
                    style={{ minHeight: "100px" }}
                  >
                    {getTasksByStatus(column.id).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                        <p>No tasks yet</p>
                        <button
                          onClick={() => onCreateTask(column.id)}
                          className="mt-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-600 hover:text-blue-800"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Task
                        </button>
                      </div>
                    ) : (
                      getTasksByStatus(column.id).map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={String(task.id)}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onTaskSelect(task)}
                              className={`p-3 mb-2 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                                snapshot.isDragging ? 'shadow-md' : ''
                              }`}
                              style={{
                                ...provided.draggableProps.style,
                                borderLeft: task.project?.color ? `4px solid ${task.project.color}` : undefined
                              }}
                            >
                              <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                                {task.title}
                              </div>
                              
                              {task.description && (
                                <div className="text-xs text-gray-500 mb-2 line-clamp-2">
                                  {task.description}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                  
                                  {task.project && (
                                    <span 
                                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                      style={{
                                        backgroundColor: task.project.color ? `${task.project.color}30` : undefined,
                                        color: task.project.color ? `${task.project.color}` : undefined
                                      }}
                                    >
                                      {task.project.name}
                                    </span>
                                  )}
                                  
                                  {task.assignee && (
                                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      {task.assignee}
                                    </span>
                                  )}
                                </div>
                                
                                {task.deadline && (
                                  <div 
                                    className={`flex items-center text-xs ${
                                      formatDeadline(task.deadline)?.variant === 'danger' ? 'text-red-600' :
                                      formatDeadline(task.deadline)?.variant === 'warning' ? 'text-orange-600' :
                                      'text-gray-500'
                                    }`}
                                  >
                                    <CalendarClock className="h-3 w-3 mr-1" />
                                    {formatDeadline(task.deadline)?.text}
                                  </div>
                                )}
                              </div>
                              
                              {task.tags && task.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {task.tags.slice(0, 3).map(tag => (
                                    <span
                                      key={tag.id}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
                                      style={{
                                        backgroundColor: tag.color || '#E5E7EB',
                                        color: '#1F2937'
                                      }}
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                  {task.tags.length > 3 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                      +{task.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default Board;