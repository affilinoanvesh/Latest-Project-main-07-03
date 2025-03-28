import React, { useState, useEffect } from 'react';
import { Task, TimeEntry } from '../types';
import { startTimer, stopTimer, getActiveTimeEntry } from '../api/timeEntryQueries';

interface TaskTimerProps {
  task: Task;
  onTimeUpdate: () => void;
}

const TaskTimer: React.FC<TaskTimerProps> = ({ task, onTimeUpdate }) => {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkActiveTimer();
  }, [task.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeEntry && !activeEntry.end_time) {
      interval = setInterval(() => {
        const startTime = new Date(activeEntry.start_time).getTime();
        const now = new Date().getTime();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeEntry]);

  const checkActiveTimer = async () => {
    try {
      const entry = await getActiveTimeEntry(task.id);
      setActiveEntry(entry);
      if (entry && !entry.end_time) {
        const startTime = new Date(entry.start_time).getTime();
        const now = new Date().getTime();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }
    } catch (error) {
      console.error('Error checking active timer:', error);
      setError('Failed to check active timer');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimer = async () => {
    try {
      setLoading(true);
      setError(null);
      const entry = await startTimer({
        task_id: task.id,
        start_time: new Date().toISOString()
      });
      setActiveEntry(entry);
      setElapsedTime(0);
      onTimeUpdate();
    } catch (error) {
      console.error('Error starting timer:', error);
      setError('Failed to start timer');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTimer = async () => {
    if (!activeEntry) return;

    try {
      setLoading(true);
      setError(null);
      await stopTimer(activeEntry.id);
      setActiveEntry(null);
      setElapsedTime(0);
      onTimeUpdate();
    } catch (error) {
      console.error('Error stopping timer:', error);
      setError('Failed to stop timer');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-12">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const isActiveTask = activeEntry?.task_id === task.id;

  return (
    <div className="flex flex-col space-y-2">
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center space-x-4">
        <div className="text-2xl font-mono">
          {formatTime(elapsedTime)}
        </div>
        
        {isActiveTask ? (
          <button
            onClick={handleStopTimer}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Stop Timer
          </button>
        ) : (
          <button
            onClick={handleStartTimer}
            disabled={loading || (activeEntry !== null && !isActiveTask)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Start Timer
          </button>
        )}
      </div>

      {activeEntry && !isActiveTask && (
        <div className="text-sm text-yellow-600">
          Timer is currently running for another task
        </div>
      )}
    </div>
  );
};

export default TaskTimer; 