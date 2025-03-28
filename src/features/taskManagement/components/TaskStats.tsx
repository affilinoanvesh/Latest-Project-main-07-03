import React, { useState, useEffect } from 'react';
import { getTasks } from '../api/taskQueries';
import { Task, TaskStatus } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { CheckCircle2, Clock, Circle, User2, Calendar, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';

interface TaskStatsByUser {
  assignee: string;
  total: number;
  completed: number;
  not_started: number;
  in_progress: number;
  cancelled: number;
}

interface TaskStatsProps {
  onClose: () => void;
}

type TabType = 'overview' | 'comparison' | 'timeline';

const STATUS_COLORS = {
  not_started: '#9CA3AF', // gray
  in_progress: '#3B82F6', // blue
  completed: '#10B981',  // green
  cancelled: '#EF4444'   // red
};

const ASSIGNEE_COLORS = {
  'Eunice': '#8884d8', // purple
  'Anvesh': '#82ca9d', // green
  'Unassigned': '#ffc658' // yellow
};

const TaskStats: React.FC<TaskStatsProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStatsByUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timelineData, setTimelineData] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      // Get all tasks
      const tasks = await getTasks();

      // Initialize stats for each user
      const statsByUser: { [key: string]: TaskStatsByUser } = {
        'Eunice': {
          assignee: 'Eunice',
          total: 0,
          completed: 0,
          not_started: 0,
          in_progress: 0,
          cancelled: 0
        },
        'Anvesh': {
          assignee: 'Anvesh',
          total: 0,
          completed: 0,
          not_started: 0,
          in_progress: 0,
          cancelled: 0
        },
        'Unassigned': {
          assignee: 'Unassigned',
          total: 0,
          completed: 0,
          not_started: 0,
          in_progress: 0,
          cancelled: 0
        }
      };

      // Process tasks
      tasks.forEach(task => {
        const assignee = task.assignee || 'Unassigned';
        
        // Skip if user not in our predefined list
        if (!statsByUser[assignee]) {
          return;
        }
        
        // Increment total
        statsByUser[assignee].total++;
        
        // Increment by status
        if (task.status === 'completed') {
          statsByUser[assignee].completed++;
        } else if (task.status === 'not_started') {
          statsByUser[assignee].not_started++;
        } else if (task.status === 'in_progress') {
          statsByUser[assignee].in_progress++;
        } else if (task.status === 'cancelled') {
          statsByUser[assignee].cancelled++;
        }
      });

      // Create timeline data (last 7 days)
      const timeline = generateTimelineData(tasks);
      setTimelineData(timeline);

      // Convert to array for charts
      setStats(Object.values(statsByUser));
      setError(null);
    } catch (err) {
      setError('Failed to load statistics');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateTimelineData = (tasks: Task[]) => {
    // Create a date range for the last 7 days
    const dateRange = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dateRange.push(date.toISOString().split('T')[0]);
    }

    // Initialize timeline data
    const timeline = dateRange.map(date => ({
      date,
      Eunice: 0,
      Anvesh: 0,
      Unassigned: 0,
      total: 0
    }));

    // Count tasks updated on each date
    tasks.forEach(task => {
      const taskDate = new Date(task.updated_at).toISOString().split('T')[0];
      const timelineEntry = timeline.find(entry => entry.date === taskDate);
      
      if (timelineEntry) {
        const assignee = task.assignee || 'Unassigned';
        if (assignee === 'Eunice' || assignee === 'Anvesh' || assignee === 'Unassigned') {
          timelineEntry[assignee]++;
        }
        timelineEntry.total++;
      }
    });

    // Format dates for display
    return timeline.map(entry => ({
      ...entry,
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  };

  const getCompletionPercentage = (user: TaskStatsByUser) => {
    if (user.total === 0) return 0;
    return Math.round((user.completed / user.total) * 100);
  };

  const getProductivityScore = (user: TaskStatsByUser) => {
    if (user.total === 0) return 0;
    // Weighted score: completed tasks count more, cancelled tasks count against
    return Math.min(
      100,
      Math.round(
        ((user.completed * 1.5) + (user.in_progress * 0.8) - (user.cancelled * 0.5)) / user.total * 100
      )
    );
  };

  const getStatusData = (assignee: string) => {
    const user = stats.find(s => s.assignee === assignee);
    if (!user) return [];
    
    return [
      { name: 'Not Started', value: user.not_started, color: STATUS_COLORS.not_started },
      { name: 'In Progress', value: user.in_progress, color: STATUS_COLORS.in_progress },
      { name: 'Completed', value: user.completed, color: STATUS_COLORS.completed },
      { name: 'Cancelled', value: user.cancelled, color: STATUS_COLORS.cancelled }
    ].filter(item => item.value > 0);  // Only include statuses with tasks
  };

  const getTotalStatusData = () => {
    const totals = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    };

    stats.forEach(user => {
      totals.not_started += user.not_started;
      totals.in_progress += user.in_progress;
      totals.completed += user.completed;
      totals.cancelled += user.cancelled;
    });

    return [
      { name: 'Not Started', value: totals.not_started, color: STATUS_COLORS.not_started },
      { name: 'In Progress', value: totals.in_progress, color: STATUS_COLORS.in_progress },
      { name: 'Completed', value: totals.completed, color: STATUS_COLORS.completed },
      { name: 'Cancelled', value: totals.cancelled, color: STATUS_COLORS.cancelled }
    ].filter(item => item.value > 0);
  };

  const getComparisonData = () => {
    return [
      { name: 'Total Tasks', Eunice: stats.find(s => s.assignee === 'Eunice')?.total || 0, Anvesh: stats.find(s => s.assignee === 'Anvesh')?.total || 0 },
      { name: 'Completed', Eunice: stats.find(s => s.assignee === 'Eunice')?.completed || 0, Anvesh: stats.find(s => s.assignee === 'Anvesh')?.completed || 0 },
      { name: 'In Progress', Eunice: stats.find(s => s.assignee === 'Eunice')?.in_progress || 0, Anvesh: stats.find(s => s.assignee === 'Anvesh')?.in_progress || 0 },
      { name: 'Not Started', Eunice: stats.find(s => s.assignee === 'Eunice')?.not_started || 0, Anvesh: stats.find(s => s.assignee === 'Anvesh')?.not_started || 0 }
    ];
  };

  const getTotalTasks = () => {
    return stats.reduce((sum, user) => sum + user.total, 0);
  };

  const getCompletedTasks = () => {
    return stats.reduce((sum, user) => sum + user.completed, 0);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Task Statistics</h2>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Task Analytics Dashboard
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 m-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs navigation */}
      <div className="px-6 pt-4 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            className={`pb-4 px-1 flex items-center font-medium text-sm transition-colors duration-200 ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </button>
          <button
            className={`pb-4 px-1 flex items-center font-medium text-sm transition-colors duration-200 ${
              activeTab === 'comparison'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('comparison')}
          >
            <User2 className="h-4 w-4 mr-2" />
            Team Comparison
          </button>
          <button
            className={`pb-4 px-1 flex items-center font-medium text-sm transition-colors duration-200 ${
              activeTab === 'timeline'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('timeline')}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Activity Timeline
          </button>
        </div>
      </div>

      <div className="p-6">
        {stats.length > 0 && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                        <BarChart3 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                        <h3 className="text-3xl font-bold text-gray-900">{getTotalTasks()}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Completed Tasks</p>
                        <h3 className="text-3xl font-bold text-gray-900">{getCompletedTasks()}</h3>
                        <span className="text-xs text-gray-500">
                          {getTotalTasks() ? `${Math.round((getCompletedTasks() / getTotalTasks()) * 100)}% completion rate` : '0% completion rate'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">In Progress</p>
                        <h3 className="text-3xl font-bold text-gray-900">
                          {stats.reduce((sum, user) => sum + user.in_progress, 0)}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Distribution Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <PieChartIcon className="h-5 w-5 mr-2 text-gray-500" />
                    Overall Task Status Distribution
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getTotalStatusData()}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getTotalStatusData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} tasks`, '']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* User Stats Cards */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User2 className="h-5 w-5 mr-2 text-gray-500" />
                    Team Member Performance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats.filter(user => user.assignee !== 'Unassigned').map(user => (
                      <div 
                        key={user.assignee} 
                        className="bg-white p-6 rounded-lg shadow-sm border border-gray-100"
                      >
                        <div className="flex justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">{user.assignee}</h3>
                          <span 
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getProductivityScore(user) > 75 
                                ? 'bg-green-100 text-green-800' 
                                : getProductivityScore(user) > 50 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            Productivity: {getProductivityScore(user)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center">
                              <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
                                <BarChart3 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Total Tasks</p>
                                <p className="text-lg font-bold">{user.total}</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center">
                              <div className="p-2 rounded-full bg-green-100 text-green-600 mr-3">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Completed</p>
                                <p className="text-lg font-bold">{user.completed}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center">
                              <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
                                <Clock className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">In Progress</p>
                                <p className="text-lg font-bold">{user.in_progress}</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center">
                              <div className="p-2 rounded-full bg-gray-200 text-gray-600 mr-3">
                                <Circle className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Not Started</p>
                                <p className="text-lg font-bold">{user.not_started}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Comparison Tab */}
            {activeTab === 'comparison' && (
              <div className="space-y-6">
                {/* Bar chart comparison */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Task Comparison: Eunice vs Anvesh</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getComparisonData()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip contentStyle={{ borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="Eunice" fill={ASSIGNEE_COLORS['Eunice']} name="Eunice" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Anvesh" fill={ASSIGNEE_COLORS['Anvesh']} name="Anvesh" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie charts comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['Eunice', 'Anvesh'].map(assignee => {
                    const data = getStatusData(assignee);
                    if (data.length === 0) return null;
                    
                    return (
                      <div key={assignee} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">{assignee}'s Task Breakdown</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {data.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} tasks`, '']} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                    Task Activity (Last 7 Days)
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={timelineData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip contentStyle={{ borderRadius: '8px' }} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Eunice"
                          stroke={ASSIGNEE_COLORS['Eunice']}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Anvesh"
                          stroke={ASSIGNEE_COLORS['Anvesh']}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    This chart shows task activity over the past week, measured by tasks updated each day.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {stats.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="mb-2">No task data available</p>
            <p className="text-sm">Create and assign tasks to see statistics</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskStats; 