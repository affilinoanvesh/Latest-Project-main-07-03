import React, { useState, useEffect } from 'react';
import { Draggable, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { Plus, Clock, Calendar, Tag } from 'lucide-react';
import { Task, TaskStatus } from '../types';
import { getTasks, createTask } from '../api/taskQueries';
import { format } from 'date-fns';

interface TaskListProps {
  projectId: number;
  onTaskClick: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({ projectId, onTaskClick }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const fetchedTasks = await getTasks({ project_id: projectId });
      setTasks(fetchedTasks);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const newTask = await createTask({
        title: newTaskTitle.trim(),
        project_id: projectId,
        status: 'not_started' as TaskStatus,
        priority: 'medium',
      });
      
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
      setIsAddingTask(false);
    } catch (err) {
      setError('Failed to create task');
      console.error('Error creating task:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-sm text-red-600 mb-2">
          {error}
        </div>
      )}

      {tasks.map((task, index) => (
        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
          {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
                snapshot.isDragging ? 'shadow-lg' : ''
              }`}
              onClick={() => onTaskClick(task)}
            >
              <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
              
              <div className="flex items-center space-x-4 text-sm">
                {task.deadline && (
                  <div className="flex items-center text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{format(new Date(task.deadline), 'MMM d')}</span>
                  </div>
                )}
                
                {task.estimated_time && (
                  <div className="flex items-center text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{task.estimated_time}m</span>
                  </div>
                )}

                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </div>
              </div>

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {task.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: tag.color || '#E5E7EB', color: '#1F2937' }}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </Draggable>
      ))}

      {/* Add Task Button/Form */}
      {isAddingTask ? (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            className="w-full p-2 border rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={handleAddTask}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Task
            </button>
            <button
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle('');
              }}
              className="px-3 py-1.5 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingTask(true)}
          className="w-full p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-center space-x-1"
        >
          <Plus className="h-4 w-4" />
          <span>Add Task</span>
        </button>
      )}
    </div>
  );
};

export default TaskList; 