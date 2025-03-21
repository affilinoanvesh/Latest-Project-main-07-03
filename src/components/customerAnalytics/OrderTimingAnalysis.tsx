import React, { useState } from 'react';
import { Calendar, Clock, TrendingUp, TrendingDown, Download, RefreshCw, BarChart2 } from 'lucide-react';
import { OrderTimingData } from '../../types';

interface OrderTimingAnalysisProps {
  timingData: OrderTimingData;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

const OrderTimingAnalysis: React.FC<OrderTimingAnalysisProps> = ({ 
  timingData, 
  loading = false, 
  error = '', 
  onRefresh 
}) => {
  const [activeTab, setActiveTab] = useState<'weekday' | 'timeOfDay' | 'hourly'>('weekday');

  // Display loading state
  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium mb-2">Order Timing Analysis</h3>
        <div className="text-center py-8 flex flex-col items-center">
          <RefreshCw className="h-12 w-12 text-gray-300 animate-spin mb-2" />
          <p className="text-gray-500 mb-4">Loading order timing data...</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium mb-2">Order Timing Analysis</h3>
        <div className="text-center py-8 flex flex-col items-center">
          <div className="bg-rose-50 text-rose-500 p-3 rounded-lg mb-2">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm">{error}</p>
          </div>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="mt-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!timingData || !timingData.weekdayDistribution || timingData.weekdayDistribution.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium mb-2">Order Timing Analysis</h3>
        <div className="text-center py-8 flex flex-col items-center">
          <Clock className="h-12 w-12 text-gray-300 mb-2" />
          <p className="text-gray-500 mb-4">No order timing data available</p>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="mt-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm"
            >
              Refresh Data
            </button>
          )}
        </div>
      </div>
    );
  }

  // Find max count for scaling the bars
  const weekdayMaxCount = Math.max(...timingData.weekdayDistribution.map(day => day.count));
  const weekdayMaxRevenue = Math.max(...timingData.weekdayDistribution.map(day => day.revenue));
  const timeOfDayMaxCount = Math.max(...timingData.timeOfDayDistribution.map(time => time.count));
  
  // Filter out zero order days
  const filteredWorstDays = timingData.worstPerformingDays.filter(day => day.count > 0);
  
  // Filter out zero order hours
  const filteredWorstHours = timingData.worstPerformingHours.filter(hour => hour.count > 0);

  // Get all days of week
  const allDaysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  // Sort data arrays by day of week for consistent display
  const sortedWeekdayDistribution = [...timingData.weekdayDistribution].sort(
    (a, b) => allDaysOfWeek.indexOf(a.day) - allDaysOfWeek.indexOf(b.day)
  );

  // Calculate performance differences for insights
  const calculatePerformanceDiff = () => {
    if (timingData.bestPerformingDays.length === 0 || filteredWorstDays.length === 0) {
      return { days: null };
    }
    
    const bestDay = timingData.bestPerformingDays[0];
    const worstDay = filteredWorstDays[0];
    const daysDiff = {
      countDiff: bestDay.count - worstDay.count,
      countPercent: Math.round((bestDay.count / worstDay.count - 1) * 100),
      revenueDiff: bestDay.revenue - worstDay.revenue,
      revenuePercent: Math.round((bestDay.revenue / worstDay.revenue - 1) * 100)
    };
    
    if (timingData.bestPerformingHours.length === 0 || filteredWorstHours.length === 0) {
      return { days: daysDiff, hours: null };
    }
    
    const bestHour = timingData.bestPerformingHours[0];
    const worstHour = filteredWorstHours[0];
    const hoursDiff = {
      countDiff: bestHour.count - worstHour.count,
      countPercent: Math.round((bestHour.count / worstHour.count - 1) * 100),
      revenueDiff: bestHour.revenue - worstHour.revenue,
      revenuePercent: Math.round((bestHour.revenue / worstHour.revenue - 1) * 100)
    };
    
    return { days: daysDiff, hours: hoursDiff };
  };
  
  const performanceDiff = calculatePerformanceDiff();

  // Consistent color system
  const colors = {
    // Primary metrics colors
    primary: 'bg-blue-500',
    secondary: 'bg-indigo-500',
    
    // Performance indicators
    best: 'bg-emerald-500',
    worst: 'bg-amber-400',
    revenue: 'bg-purple-500',
    
    // Time categories
    morning: 'bg-blue-500',
    afternoon: 'bg-amber-500',
    evening: 'bg-violet-500',
    night: 'bg-indigo-900',
    
    // Special periods
    weekend: 'bg-indigo-500',
    weekday: 'bg-blue-500',
    
    // Card gradients
    bestGradient: 'from-emerald-50 to-teal-50 border-emerald-100',
    worstGradient: 'from-amber-50 to-orange-50 border-amber-100',
    
    // Accent colors for recommendations
    adTip: 'bg-blue-50 text-blue-700',
    opsTip: 'bg-amber-50 text-amber-700',
    marketingTip: 'bg-purple-50 text-purple-700',
    analysisTip: 'bg-indigo-50 text-indigo-700'
  };

  // Export timing data to CSV
  const exportTimingData = () => {
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add weekday data
    csvContent += 'Weekday Analysis\n';
    csvContent += 'Day,Orders,Percentage,Revenue,Average Order Value\n';
    sortedWeekdayDistribution.forEach(day => {
      csvContent += `${day.day},${day.count},${day.percentage}%,${day.revenue},${day.averageOrderValue}\n`;
    });
    
    // Add time of day data
    csvContent += '\nTime of Day Analysis\n';
    csvContent += 'Time Range,Orders,Percentage,Revenue,Average Order Value\n';
    timingData.timeOfDayDistribution.forEach(time => {
      csvContent += `${time.timeRange},${time.count},${time.percentage}%,${time.revenue},${time.averageOrderValue}\n`;
    });
    
    // Add hourly data if available
    if (timingData.hourlyDistribution) {
      csvContent += '\nHourly Analysis\n';
      csvContent += 'Hour,Orders,Revenue,Average Order Value\n';
      timingData.hourlyDistribution.forEach(hour => {
        csvContent += `${hour.hour},${hour.count},${hour.revenue},${hour.averageOrderValue}\n`;
      });
    }
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `order_timing_analysis_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDayColor = (day: string) => {
    const isWeekend = day === 'Saturday' || day === 'Sunday';
    const isTop = timingData.bestPerformingDays.some(d => d.day === day);
    const isBottom = timingData.worstPerformingDays.some(d => d.day === day);
    
    if (isTop) return colors.best;
    if (isBottom) return colors.worst;
    if (isWeekend) return colors.weekend;
    return colors.weekday;
  };
  
  // Time of day color function
  const getTimeOfDayColor = (timeRange: string) => {
    // Determine if this is a peak time
    const isPeak = timingData.bestPerformingHours.some(h => h.hour.includes(timeRange.split('-')[0].trim()));
    const isLow = timingData.worstPerformingHours.some(h => h.hour.includes(timeRange.split('-')[0].trim()));
    
    if (isPeak) return colors.best;
    if (isLow) return colors.worst;
    
    if (timeRange.includes('AM')) return colors.morning;
    if (timeRange.includes('PM') && !timeRange.includes('12:00 PM')) return colors.evening;
    return colors.afternoon;
  };

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <h3 className="text-xl font-medium">Order Timing Analysis</h3>
          {timingData.dateRange && (
            <p className="text-sm text-gray-500 mt-1">
              Data from {timingData.dateRange.from} to {timingData.dateRange.to}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportTimingData}
            className="flex items-center gap-2 px-3 py-2 bg-white border rounded shadow-sm hover:bg-gray-50"
            title="Export to CSV"
          >
            <Download className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Export Data</span>
          </button>
          
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="flex items-center gap-2 px-3 py-2 bg-white border rounded shadow-sm hover:bg-gray-50"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="flex overflow-x-auto p-1 bg-gray-100 rounded-lg">
          <button
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'weekday' 
                ? 'bg-white shadow text-indigo-700' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('weekday')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Weekdays
          </button>
          <button
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'timeOfDay' 
                ? 'bg-white shadow text-indigo-700' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('timeOfDay')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Time of Day
          </button>
          <button
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'hourly' 
                ? 'bg-white shadow text-indigo-700' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('hourly')}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            Hourly Breakdown
          </button>
        </div>
      </div>

      {/* Weekday Analysis */}
      {activeTab === 'weekday' && (
        <div className="space-y-8">
          {/* All Days of Week visualization */}
          <div>
            <h4 className="text-base font-medium text-gray-700 mb-4">Orders by Day of Week</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">Day</span>
                  <span className="text-sm font-medium text-gray-500">Orders</span>
                </div>
                {sortedWeekdayDistribution.map((day) => (
                  <div key={`order-${day.day}`} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{day.day}</span>
                      <span className="text-sm font-medium">{day.count} ({day.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div 
                        className={`${getDayColor(day.day)} h-full rounded-full transition-all group-hover:brightness-110`}
                        style={{ width: `${Math.max((day.count / weekdayMaxCount) * 100, 3)}%` }}
                      ></div>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-500">
                      <span>${day.revenue.toLocaleString()} revenue</span>
                      <span>AOV: ${day.averageOrderValue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">Day</span>
                  <span className="text-sm font-medium text-gray-500">Revenue</span>
                </div>
                {sortedWeekdayDistribution.map((day) => (
                  <div key={`revenue-${day.day}`} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{day.day}</span>
                      <span className="text-sm font-medium">${day.revenue.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all group-hover:brightness-110"
                        style={{ width: `${Math.max((day.revenue / weekdayMaxRevenue) * 100, 3)}%` }}
                      ></div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 text-right">
                      <span>{(day.revenue / timingData.weekdayDistribution.reduce((sum, d) => sum + d.revenue, 0) * 100).toFixed(1)}% of total revenue</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Best Performing Days */}
              <div className={`bg-gradient-to-br ${colors.bestGradient} p-4 rounded-lg border`}>
                <h4 className="text-base font-medium text-gray-700 mb-3 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-emerald-500" />
                  Best Performing Days
                </h4>
                <div className="space-y-4">
                  {timingData.bestPerformingDays.map((day, idx) => (
                    <div key={day.day} className={`bg-white p-4 rounded-lg shadow-sm ${idx === 0 ? 'border-l-4 border-emerald-500' : ''}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-base">{day.day}</span>
                        <div className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {idx === 0 ? 'Top Day' : `#${idx + 1}`}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <span className="block text-xs text-gray-500">Orders</span>
                          <span className="block text-sm font-semibold">{day.count}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <span className="block text-xs text-gray-500">Revenue</span>
                          <span className="block text-sm font-semibold">${day.revenue.toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <span className="block text-xs text-gray-500">AOV</span>
                          <span className="block text-sm font-semibold">${day.averageOrderValue.toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <span className="block text-xs text-gray-500">% of Total</span>
                          <span className="block text-sm font-semibold">{day.percentage}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Worst Performing Days */}
              <div className={`bg-gradient-to-br ${colors.worstGradient} p-4 rounded-lg border`}>
                <h4 className="text-base font-medium text-gray-700 mb-3 flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2 text-amber-500" />
                  Lowest Performing Days
                </h4>
                <div className="space-y-4">
                  {filteredWorstDays.map((day, idx) => (
                    <div key={day.day} className={`bg-white p-4 rounded-lg shadow-sm ${idx === 0 ? 'border-l-4 border-amber-500' : ''}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-base">{day.day}</span>
                        <div className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          Needs Focus
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <span className="block text-xs text-gray-500">Orders</span>
                          <span className="block text-sm font-semibold">{day.count}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <span className="block text-xs text-gray-500">Revenue</span>
                          <span className="block text-sm font-semibold">${day.revenue.toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <span className="block text-xs text-gray-500">AOV</span>
                          <span className="block text-sm font-semibold">${day.averageOrderValue.toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <span className="block text-xs text-gray-500">% of Top Day</span>
                          <span className="block text-sm font-semibold">{Math.round((day.count / timingData.bestPerformingDays[0]?.count) * 100) || 0}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time of Day Analysis */}
      {activeTab === 'timeOfDay' && (
        <div className="space-y-8">
          {/* Time of Day visualization */}
          <div>
            <h4 className="text-base font-medium text-gray-700 mb-4">Orders by Time of Day</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">Time Range</span>
                  <span className="text-sm font-medium text-gray-500">Orders</span>
                </div>
                {timingData.timeOfDayDistribution.map((time) => {
                  const barColor = getTimeOfDayColor(time.timeRange);
                  
                  return (
                    <div key={`order-${time.timeRange}`} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{time.timeRange}</span>
                        <span className="text-sm font-medium">{time.count} ({time.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div 
                          className={`${barColor} h-full rounded-full transition-all group-hover:brightness-110`}
                          style={{ width: `${Math.max((time.count / timeOfDayMaxCount) * 100, 3)}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-gray-500">
                        <span>${time.revenue.toLocaleString()} revenue</span>
                        <span>AOV: ${time.averageOrderValue.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">Time Range</span>
                  <span className="text-sm font-medium text-gray-500">Revenue</span>
                </div>
                {timingData.timeOfDayDistribution.map((time) => {
                  const maxRevenue = Math.max(...timingData.timeOfDayDistribution.map(t => t.revenue));
                  return (
                    <div key={`revenue-${time.timeRange}`} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{time.timeRange}</span>
                        <span className="text-sm font-medium">${time.revenue.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div 
                          className={`${colors.revenue} h-full rounded-full transition-all group-hover:brightness-110`}
                          style={{ width: `${Math.max((time.revenue / maxRevenue) * 100, 3)}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 text-right">
                        <span>{(time.revenue / timingData.timeOfDayDistribution.reduce((sum, t) => sum + t.revenue, 0) * 100).toFixed(1)}% of total revenue</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Best Performing Time Periods */}
              <div className={`bg-gradient-to-br ${colors.bestGradient} p-4 rounded-lg border`}>
                <h4 className="text-base font-medium text-gray-700 mb-3 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-emerald-500" />
                  Best Performing Time Periods
                </h4>
                <div className="space-y-4">
                  {timingData.bestPerformingHours.slice(0, 3).map((hour, idx) => (
                    <div key={hour.hour} className={`bg-white p-3 rounded-lg shadow-sm ${idx === 0 ? 'border-l-4 border-emerald-500' : ''}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-base">{hour.hour}</span>
                        <div className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full">
                          {idx === 0 ? 'Peak Time' : `#${idx + 1}`}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <span className="block text-xs text-gray-500">Orders</span>
                          <span className="block text-sm font-semibold">{hour.count}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <span className="block text-xs text-gray-500">Revenue</span>
                          <span className="block text-sm font-semibold">${hour.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Time-based Recommendations */}
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h4 className="text-base font-medium text-gray-700 mb-3">Time-Based Optimization</h4>
                <div className="space-y-3">
                  <div className={`p-3 ${colors.adTip.split(' ')[0]} rounded-lg`}>
                    <h5 className={`text-sm font-medium ${colors.adTip.split(' ')[1]} mb-1`}>Ad Spend Allocation</h5>
                    <p className="text-sm text-gray-600">
                      Increase ad budget by 25-40% during {timingData.bestPerformingHours[0]?.hour || 'morning'} 
                      when customers are most likely to purchase. This could boost conversion rates significantly.
                    </p>
                  </div>
                  <div className={`p-3 ${colors.opsTip.split(' ')[0]} rounded-lg`}>
                    <h5 className={`text-sm font-medium ${colors.opsTip.split(' ')[1]} mb-1`}>Customer Service Hours</h5>
                    <p className="text-sm text-gray-600">
                      Ensure customer service is fully staffed during peak hours. Having immediate
                      support available can increase conversion rates by 10-15%.
                    </p>
                  </div>
                  <div className={`p-3 ${colors.marketingTip.split(' ')[0]} rounded-lg`}>
                    <h5 className={`text-sm font-medium ${colors.marketingTip.split(' ')[1]} mb-1`}>Promotion Timing</h5>
                    <p className="text-sm text-gray-600">
                      Schedule email campaigns and special promotions to arrive {filteredWorstHours[0]?.hour ? 'just before ' + filteredWorstHours[0].hour : 'during non-peak hours'} 
                      to help stimulate sales during typically slower periods.
                    </p>
                  </div>
                </div>
                
                {/* Performance Gap Analysis */}
                {performanceDiff.hours && (
                  <div className={`mt-4 p-3 ${colors.analysisTip.split(' ')[0]} rounded-lg`}>
                    <h5 className={`text-sm font-medium ${colors.analysisTip.split(' ')[1]} mb-1`}>Performance Gap Analysis</h5>
                    <p className="text-sm text-gray-600">
                      Your best hour ({timingData.bestPerformingHours[0]?.hour || 'peak period'}) outperforms your worst active hour by{' '}
                      <span className="font-semibold">{performanceDiff.hours.countPercent}%</span> in order volume and{' '}
                      <span className="font-semibold">{performanceDiff.hours.revenuePercent}%</span> in revenue.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hourly Analysis */}
      {activeTab === 'hourly' && timingData.hourlyDistribution && (
        <div className="space-y-6">
          <h4 className="text-base font-medium text-gray-700 mb-3">Hourly Order Distribution</h4>
          
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="mb-6">
              <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
                <span>Hour of Day</span>
                <span>Order Volume</span>
              </div>
              
              {/* Hourly Bar Chart */}
              <div className="space-y-3">
                {timingData.hourlyDistribution?.sort((a, b) => {
                  const hourA = parseInt(a.hour.split(':')[0]);
                  const hourB = parseInt(b.hour.split(':')[0]);
                  return hourA - hourB;
                }).map((hour) => {
                  const hourNum = parseInt(hour.hour.split(':')[0]);
                  const hourFormatted = hour.hour;
                  const maxCount = Math.max(...(timingData.hourlyDistribution || []).map(h => h.count));
                  const isPeak = hour.count === maxCount;
                  const isLow = hour.count === Math.min(...(timingData.hourlyDistribution || []).filter(h => h.count > 0).map(h => h.count));
                  
                  // Time of day classification
                  let timeCategory;
                  if (hourNum >= 5 && hourNum < 12) timeCategory = 'morning';
                  else if (hourNum >= 12 && hourNum < 17) timeCategory = 'afternoon';
                  else if (hourNum >= 17 && hourNum < 21) timeCategory = 'evening';
                  else timeCategory = 'night';
                  
                  // Color based on time of day
                  let barColor;
                  if (isPeak) barColor = colors.best;
                  else if (isLow && hour.count > 0) barColor = colors.worst;
                  else if (timeCategory === 'morning') barColor = colors.morning;
                  else if (timeCategory === 'afternoon') barColor = colors.afternoon;
                  else if (timeCategory === 'evening') barColor = colors.evening;
                  else barColor = colors.night;
                  
                  return (
                    <div key={hour.hour} className="group">
                      <div className="flex items-center mb-1">
                        <div className="w-14 text-sm font-medium">{hourFormatted}</div>
                        <div className="flex-1 relative">
                          <div className="flex items-center">
                            <div 
                              className={`${barColor} h-7 rounded-md transition-all group-hover:brightness-110`}
                              style={{ width: `${Math.max((hour.count / maxCount) * 100, 1)}%` }}
                            >
                              {hour.count > 0 && (hour.count / maxCount) * 100 > 20 && (
                                <span className="text-white text-xs pl-2 leading-7">{hour.count} orders</span>
                              )}
                            </div>
                            {hour.count > 0 && (hour.count / maxCount) * 100 <= 20 && (
                              <span className="ml-2 text-sm">{hour.count}</span>
                            )}
                          </div>
                          
                          {/* Tooltip on hover */}
                          <div className="absolute opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs rounded py-1 px-2 -bottom-16 left-0 pointer-events-none transition-opacity z-10 w-48">
                            <div className="font-medium mb-1">{hourFormatted}</div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                              <span>Orders:</span>
                              <span className="text-right">{hour.count}</span>
                              <span>Revenue:</span>
                              <span className="text-right">${hour.revenue.toLocaleString()}</span>
                              <span>AOV:</span>
                              <span className="text-right">${hour.averageOrderValue.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${colors.morning} mr-1`}></div>
                  <span className="text-xs text-gray-600">Morning (5-12)</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${colors.afternoon} mr-1`}></div>
                  <span className="text-xs text-gray-600">Afternoon (12-17)</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${colors.evening} mr-1`}></div>
                  <span className="text-xs text-gray-600">Evening (17-21)</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${colors.night} mr-1`}></div>
                  <span className="text-xs text-gray-600">Night (21-5)</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${colors.best} mr-1`}></div>
                  <span className="text-xs text-gray-600">Peak Hours</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-rose-400 mr-1"></div>
                  <span className="text-xs text-gray-600">Lowest Hours</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Peak Hours Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`bg-gradient-to-br ${colors.bestGradient} p-4 rounded-lg border`}>
              <h4 className="text-base font-medium text-gray-700 mb-3 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-emerald-500" />
                Top Performing Hours
              </h4>
              <div className="space-y-3">
                {timingData.bestPerformingHours.slice(0, 3).map((hour, idx) => (
                  <div key={hour.hour} className={`bg-white p-3 rounded-lg shadow-sm ${idx === 0 ? 'border-l-4 border-emerald-500' : ''}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{hour.hour}</span>
                      <div className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {idx === 0 ? 'Top Hour' : `#${idx + 1}`}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <span className="block text-xs text-gray-500">Orders</span>
                        <span className="block text-sm font-semibold">{hour.count}</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <span className="block text-xs text-gray-500">Revenue</span>
                        <span className="block text-sm font-semibold">${hour.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Hour-based Recommendations */}
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h4 className="text-base font-medium text-gray-700 mb-3">Hour-Based Recommendations</h4>
              <div className="space-y-3">
                <div className={`p-3 ${colors.adTip.split(' ')[0]} rounded-lg`}>
                  <h5 className={`text-sm font-medium ${colors.adTip.split(' ')[1]} mb-1`}>Ad Scheduling</h5>
                  <p className="text-sm text-gray-600">
                    Increase ad budget by 30-50% during peak hours ({timingData.bestPerformingHours[0]?.hour || 'peak time'}) 
                    to maximize visibility when customers are most active.
                  </p>
                </div>
                <div className={`p-3 ${colors.opsTip.split(' ')[0]} rounded-lg`}>
                  <h5 className={`text-sm font-medium ${colors.opsTip.split(' ')[1]} mb-1`}>Flash Sales</h5>
                  <p className="text-sm text-gray-600">
                    Schedule limited-time promotions during the second-best performing hour 
                    ({timingData.bestPerformingHours[1]?.hour || 'second peak'}) to boost sales during 
                    already-strong periods.
                  </p>
                </div>
                <div className={`p-3 ${colors.marketingTip.split(' ')[0]} rounded-lg`}>
                  <h5 className={`text-sm font-medium ${colors.marketingTip.split(' ')[1]} mb-1`}>Email Marketing</h5>
                  <p className="text-sm text-gray-600">
                    Send promotional emails 1-2 hours before your peak ordering times to ensure 
                    they're seen before customers make purchasing decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTimingAnalysis;