import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { 
  X, Calendar, Clock, Tag, AlertCircle, CheckCircle2, 
  MoreVertical, Edit2, Trash2, PlayCircle, PauseCircle,
  ChevronDown, ChevronUp, ArrowLeft, ArrowUp, CheckSquare, PlusCircle, MessageSquare
} from 'lucide-react';
import { Task, TimeEntry, TaskStatus, TaskPriority } from '../types';
import { getTaskById, updateTask, deleteTask } from '../api/taskQueries';
import { getTimeEntries, startTimer, stopTimer, deleteTimeEntry } from '../api/timeEntryQueries';
import TaskForm from './TaskForm';
import TaskComments from './TaskComments';
import TaskChecklist from './TaskChecklist';

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
  const [showChecklist, setShowChecklist] = useState(false);
  const [showTimeTracking, setShowTimeTracking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [newDeadline, setNewDeadline] = useState<string>('');
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

  const handleUpdateDeadline = async () => {
    if (!task || !newDeadline) return;
    
    try {
      await updateTask(task.id, { deadline: newDeadline });
      setIsEditingDeadline(false);
      loadTaskDetails();
      onUpdate();
    } catch (err) {
      setError('Failed to update deadline');
      console.error('Error updating deadline:', err);
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
      <div className="p-4 border-b flex items-start justify-between sticky top-0 bg-white z-10">
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
      <div className="flex-1 overflow-y-auto p-4 max-h-[calc(100vh-210px)]">
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

        {/* Metadata - Compact Version */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            {task.deadline && (
              <div 
                className="bg-white rounded-md p-2 border border-gray-200 flex items-center group hover:border-amber-300 cursor-pointer"
                onClick={() => {
                  if (!isEditingDeadline && task.deadline) {
                    setNewDeadline(task.deadline);
                    setIsEditingDeadline(true);
                  }
                }}
              >
                {isEditingDeadline ? (
                  <div className="flex-1 flex flex-col">
                    <div className="text-xs text-gray-500 mb-1">Update Deadline</div>
                    <div className="flex space-x-2">
                      <input
                        type="datetime-local"
                        value={newDeadline.slice(0, 16)}
                        onChange={(e) => setNewDeadline(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                        autoFocus
                      />
                      <div className="flex space-x-1">
                        <button 
                          onClick={handleUpdateDeadline}
                          className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => setIsEditingDeadline(false)}
                          className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2 text-amber-600" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Deadline</div>
                      <div className="text-sm font-medium">
                        {format(new Date(task.deadline), 'MMM d, yyyy HH:mm')}
                      </div>
                    </div>
                    <Edit2 className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 ml-2" />
                  </>
                )}
              </div>
            )}
            
            {task.estimated_time && (
              <div className="bg-white rounded-md p-2 border border-gray-200 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-green-600" />
                <div>
                  <div className="text-xs text-gray-500">Est. Time</div>
                  <div className="text-sm font-medium">{task.estimated_time} min</div>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1 mb-1.5">
                <Tag className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-500">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: tag.color || '#E5E7EB', color: '#1F2937' }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Checklist Section - Now directly in the details view */}
        <div className="mb-6 bg-white rounded-md shadow p-4 border-l-4 border-blue-500">
          <div className="flex justify-between items-center mb-3">
            <h3 
              className="text-sm font-medium text-gray-700 flex items-center cursor-pointer"
              onClick={() => setShowChecklist(!showChecklist)}
            >
              <CheckSquare className="h-5 w-5 mr-2 text-blue-600" />
              Checklist
              <ChevronDown 
                className={`ml-2 h-4 w-4 text-gray-500 transition-transform duration-200 ${showChecklist ? 'rotate-180' : ''}`} 
              />
            </h3>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">Click on items to edit</span>
              <button 
                onClick={() => setIsEditing(true)} 
                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                title="Edit task details"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {showChecklist && <TaskChecklist taskId={taskId} hideHeader={true} />}
        </div>

        {/* Time Entries */}
        <div className="mb-6 bg-white rounded-md shadow p-4 border-l-4 border-green-500">
          <div className="flex justify-between items-center mb-3">
            <h3 
              className="text-sm font-medium text-gray-700 flex items-center cursor-pointer"
              onClick={() => setShowTimeTracking(!showTimeTracking)}
            >
              <Clock className="h-5 w-5 mr-2 text-green-600" />
              Time Tracking
              {timeEntries.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                  {timeEntries.length} {timeEntries.length === 1 ? 'entry' : 'entries'}
                </span>
              )}
              <ChevronDown 
                className={`ml-2 h-4 w-4 text-gray-500 transition-transform duration-200 ${showTimeTracking ? 'rotate-180' : ''}`} 
              />
            </h3>
            
            {activeTimer ? (
              <button
                onClick={handleStopTimer}
                className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-150"
              >
                <div className="relative">
                  <PauseCircle className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                </div>
                <span>Stop Timer</span>
              </button>
            ) : (
              <button
                onClick={handleStartTimer}
                className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-150"
              >
                <PlayCircle className="h-4 w-4" />
                <span>Start Timer</span>
              </button>
            )}
          </div>

          {/* Only show timer content when expanded */}
          {showTimeTracking && (
            <>
              {/* Active timer display */}
              {activeTimer && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="h-2 w-2 bg-blue-600 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-sm text-blue-700">Timer active</span>
                    </div>
                    <div className="text-lg font-mono font-semibold text-blue-800">
                      {formatTime(elapsedTime)}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    Started {format(new Date(activeTimer.start_time), 'MMM d, yyyy HH:mm:ss')}
                  </div>
                </div>
              )}

              {/* Time entries list */}
              {timeEntries.length > 0 ? (
                <div className="space-y-2">
                  {timeEntriesToShow.map((entry) => (
                    <div 
                      key={entry.id} 
                      className="group p-3 bg-gray-50 border border-gray-100 rounded-lg hover:border-gray-200 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Clock className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
                            <div className="text-sm font-medium">
                              {entry.end_time ? (
                                <>
                                  {format(new Date(entry.start_time), 'MMM d, HH:mm')} - {format(new Date(entry.end_time), 'HH:mm')}
                                </>
                              ) : (
                                <>
                                  {format(new Date(entry.start_time), 'MMM d, HH:mm')} - In progress
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.end_time ? (
                              <>
                                Duration: {formatTime(Math.floor((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 1000))}
                              </>
                            ) : (
                              <>Running</>
                            )}
                          </div>
                          {entry.notes && (
                            <div className="text-xs italic text-gray-600 mt-1">
                              {entry.notes}
                            </div>
                          )}
                        </div>
                        {entry.end_time && (
                          <button
                            onClick={() => handleDeleteTimeEntry(entry.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title="Delete entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {timeEntries.length > 3 && (
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setShowAllTimeEntries(!showAllTimeEntries)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center mx-auto"
                      >
                        {showAllTimeEntries ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Show all {timeEntries.length} entries
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No time entries yet</p>
                  <p className="text-xs mt-1">Click "Start Timer" to begin tracking time</p>
                </div>
              )}
              
              {/* Total time */}
              {timeEntries.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total time spent:</span>
                  <span className="text-sm font-medium font-mono">
                    {formatTime(timeEntries.reduce((total, entry) => {
                      if (!entry.end_time) return total;
                      const duration = Math.floor(
                        (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 1000
                      );
                      return total + duration;
                    }, 0))}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Comments Section */}
        <div className="mb-6 bg-white rounded-md shadow p-4 border-l-4 border-purple-500">
          <div 
            className="flex items-center cursor-pointer mb-3"
            onClick={() => setShowComments(!showComments)}
          >
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
              Comments
              <ChevronDown 
                className={`ml-2 h-4 w-4 text-gray-500 transition-transform duration-200 ${showComments ? 'rotate-180' : ''}`} 
              />
            </h3>
          </div>
          {showComments && <TaskComments taskId={taskId} />}
        </div>

        {/* "Back to top" button */}
        <button 
          onClick={() => document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-4 right-6 bg-white shadow-md rounded-full p-2 hover:bg-gray-100 transition-colors z-10"
          title="Back to top"
        >
          <ArrowUp className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-gray-50 sticky bottom-0 z-10">
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