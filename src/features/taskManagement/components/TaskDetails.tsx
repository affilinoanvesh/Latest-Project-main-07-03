import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { 
  X, Calendar, Clock, Tag, AlertCircle, CheckCircle2, 
  MoreVertical, Edit2, Trash2, PlayCircle, PauseCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Task, TimeEntry, TaskStatus, TaskPriority } from '../types';
import { getTaskById, updateTask, deleteTask } from '../api/taskQueries';
import { getTimeEntries, startTimer, stopTimer, deleteTimeEntry } from '../api/timeEntryQueries';
import TaskForm from './TaskForm';

interface TaskDetailsProps {
  taskId: number;
  onClose: () => void;
  onUpdate: () => void;
}

const TaskDetails: React.FC<TaskDetailsProps> = ({ taskId, onClose, onUpdate }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showAllTimeEntries, setShowAllTimeEntries] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadTaskDetails();
    
    // Clean up the previous interval if it exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Set up a new interval
    intervalRef.current = window.setInterval(() => {
      updateElapsedTime();
    }, 1000);
    
    // Clean up on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const [fetchedTask, fetchedTimeEntries] = await Promise.all([
        getTaskById(taskId),
        getTimeEntries(taskId)
      ]);
      setTask(fetchedTask);
      setTimeEntries(fetchedTimeEntries);
      
      // Find active timer
      const active = fetchedTimeEntries.find(entry => !entry.end_time);
      setActiveTimer(active || null);
      
      if (active) {
        const startTime = new Date(active.start_time).getTime();
        const now = new Date().getTime();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      } else {
        setElapsedTime(0);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to load task details');
      console.error('Error loading task details:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateElapsedTime = () => {
    if (activeTimer) {
      try {
        const startTime = new Date(activeTimer.start_time).getTime();
        const now = new Date().getTime();
        const newElapsedTime = Math.floor((now - startTime) / 1000);
        setElapsedTime(newElapsedTime);
      } catch (err) {
        console.error('Error updating elapsed time:', err);
      }
    }
  };

  const handleStartTimer = async () => {
    try {
      const timerResult = await startTimer({
        task_id: taskId,
        start_time: new Date().toISOString()
      });
      
      // Immediately set the active timer so the UI updates
      setActiveTimer(timerResult);
      // Reset elapsed time to 0 and it will start counting
      setElapsedTime(0);
      
      // Then refresh all data
      loadTaskDetails();
    } catch (err) {
      setError('Failed to start timer');
      console.error('Error starting timer:', err);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    
    try {
      await stopTimer(activeTimer.id);
      
      // Immediately clear the active timer so the UI updates
      setActiveTimer(null);
      
      // Then refresh all data
      loadTaskDetails();
      onUpdate();
    } catch (err) {
      setError('Failed to stop timer');
      console.error('Error stopping timer:', err);
    }
  };

  const handleDeleteTimeEntry = async (entryId: number) => {
    if (!window.confirm('Are you sure you want to delete this time entry?')) return;
    
    try {
      await deleteTimeEntry(entryId);
      loadTaskDetails();
      onUpdate();
    } catch (err) {
      setError('Failed to delete time entry');
      console.error('Error deleting time entry:', err);
    }
  };

  const handleStatusChange = async (status: TaskStatus) => {
    if (!task) return;

    try {
      await updateTask(task.id, { status });
      loadTaskDetails();
      onUpdate();
    } catch (err) {
      setError('Failed to update task status');
      console.error('Error updating task status:', err);
    }
  };

  const handleDelete = async () => {
    if (!task || !window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(task.id);
      onClose();
      onUpdate();
    } catch (err) {
      setError('Failed to delete task');
      console.error('Error deleting task:', err);
    }
  };

  const handleTaskUpdate = () => {
    setIsEditing(false);
    loadTaskDetails();
    onUpdate();
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-4 text-center text-gray-500">
        Task not found
      </div>
    );
  }

  if (isEditing) {
    return (
      <TaskForm
        task={task}
        onSave={handleTaskUpdate}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const timeEntriesToShow = showAllTimeEntries 
    ? timeEntries 
    : timeEntries.slice(0, 3);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between">
        <div className="flex-1 pr-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{task.title}</h2>
          {task.project && (
            <p className="text-sm text-gray-500">
              {task.project.name}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              aria-label="More options"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Task
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Status and Priority */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ').toUpperCase()}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority.toUpperCase()}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
            <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {task.deadline && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Deadline
              </h3>
              <p className="text-gray-900">
                {format(new Date(task.deadline), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          )}
          
          {task.estimated_time && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Estimated Time
              </h3>
              <p className="text-gray-900">{task.estimated_time} minutes</p>
            </div>
          )}
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
              <Tag className="h-4 w-4 mr-1" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {task.tags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: tag.color || '#E5E7EB', color: '#1F2937' }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timer */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Time Tracking</h3>
            <div className="text-2xl font-mono" data-testid="timer-display">
              {activeTimer ? formatTime(elapsedTime) : '00:00:00'}
            </div>
          </div>
          
          <div className="flex justify-center">
            {activeTimer ? (
              <button
                onClick={handleStopTimer}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 bg-white rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <PauseCircle className="h-5 w-5 mr-2" />
                Stop Timer
              </button>
            ) : (
              <button
                onClick={handleStartTimer}
                className="inline-flex items-center px-4 py-2 border border-green-300 text-green-700 bg-white rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <PlayCircle className="h-5 w-5 mr-2" />
                Start Timer
              </button>
            )}
          </div>
        </div>

        {/* Time Entries */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-500">Time Entries</h3>
            {timeEntries.length > 3 && (
              <button 
                onClick={() => setShowAllTimeEntries(!showAllTimeEntries)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                {showAllTimeEntries ? (
                  <>Show Less <ChevronUp className="h-4 w-4 ml-1" /></>
                ) : (
                  <>Show All ({timeEntries.length}) <ChevronDown className="h-4 w-4 ml-1" /></>
                )}
              </button>
            )}
          </div>
          
          {timeEntries.length === 0 ? (
            <p className="text-sm text-gray-500">No time entries yet</p>
          ) : (
            <div className="space-y-3">
              {timeEntriesToShow.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white border rounded-lg p-3 flex justify-between items-start"
                >
                  <div>
                    <div className="text-sm text-gray-900">
                      {format(new Date(entry.start_time), 'MMM d, yyyy HH:mm')}
                      {entry.end_time && ` - ${format(new Date(entry.end_time), 'HH:mm')}`}
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <div className="text-sm text-gray-500 mr-3">
                      {entry.duration ? formatTime(entry.duration) : 'In Progress'}
                    </div>
                    <button
                      onClick={() => handleDeleteTimeEntry(entry.id)}
                      className="text-gray-400 hover:text-red-600"
                      aria-label="Delete time entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => handleStatusChange('not_started')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                task.status === 'not_started'
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Not Started
            </button>
            <button
              onClick={() => handleStatusChange('in_progress')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                task.status === 'in_progress'
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => handleStatusChange('completed')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                task.status === 'completed'
                  ? 'bg-green-200 text-green-800'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 inline-block mr-1" />
              Complete
            </button>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            <Edit2 className="h-4 w-4 inline-block mr-1" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;