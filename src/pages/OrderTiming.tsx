import React, { useState, useEffect } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Download, RefreshCw, Clock, Calendar } from 'lucide-react';
import DateRangePicker from '../components/common/DateRangePicker';
import { customerBasicService, customerOrderTimingService } from '../services/customer';
import { DateRange, CustomerAnalyticsData, OrderTimingData } from '../types';
import OrderTimingAnalysis from '../components/customerAnalytics/OrderTimingAnalysis';

const OrderTiming: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<CustomerAnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfMonth(subMonths(new Date(), 3)),
    endDate: endOfMonth(new Date())
  });
  const [isAllTime, setIsAllTime] = useState(false);

  // Load order timing data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get orders filtered by date range
      const orders = await customerBasicService.getFilteredOrders(
        isAllTime ? undefined : dateRange.startDate,
        isAllTime ? undefined : dateRange.endDate
      );
      
      // Analyze order timing patterns
      const orderTiming = customerOrderTimingService.analyzeOrderTiming(orders);
      
      // Create customer analytics data structure with the minimum required fields
      const data: CustomerAnalyticsData = {
        orderTiming,
        totalCustomers: 0,
        newCustomers: 0,
        activeCustomers: 0,
        atRiskCustomers: 0,
        lostCustomers: 0,
        customerSegments: [],
        rfmData: {
          rfmDistribution: [],
          recencyDistribution: [],
          frequencyDistribution: [],
          monetaryDistribution: []
        },
        averageOrderValue: 0,
        customerLifetimeValue: 0,
        topSpendingCustomers: [],
        mostFrequentCustomers: [],
        acquisitionSources: []
      };
      
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error loading order timing data:', err);
      setError('Failed to load order timing data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (newRange: DateRange) => {
    setIsAllTime(false);
    setDateRange(newRange);
  };

  // Handle all time selection
  const handleAllTimeClick = () => {
    setIsAllTime(true);
  };

  // Load data on initial render and when date range changes or all time is selected
  useEffect(() => {
    loadData();
  }, [dateRange, isAllTime]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Order Timing Analysis</h1>
          <p className="text-gray-500">
            Analyze when customers place orders to optimize your operations
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          {/* Date Range Picker */}
          <div className="relative">
            <DateRangePicker 
              dateRange={dateRange}
              onChange={handleDateRangeChange}
            />
          </div>
          
          {/* All Time Button */}
          <button
            onClick={handleAllTimeClick}
            className={`px-4 py-2 rounded-md text-sm border ${
              isAllTime 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Time
          </button>
        </div>
      </div>
      
      {/* Date Range Indicator */}
      <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-md flex items-center">
        <Calendar className="h-5 w-5 mr-2" />
        <p className="text-sm">
          {isAllTime 
            ? "Showing data for all time" 
            : `Showing data from ${format(dateRange.startDate, 'dd MMMM yyyy')} to ${format(dateRange.endDate, 'dd MMMM yyyy')}`
          }
        </p>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
      
      {/* Order Timing Content */}
      {!loading && analyticsData && analyticsData.orderTiming && (
        <>
          <div className="mb-6">
            {/* Enhanced Header with Key Metrics */}
            <div className="bg-white p-5 rounded-lg border shadow-sm mb-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center">
                  <div className="bg-rose-100 p-3 rounded-lg mr-4">
                    <Clock className="h-7 w-7 text-rose-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium">Order Timing Analysis</h2>
                    <p className="text-gray-500 mt-1">
                      Optimize your ad schedules and staffing based on customer ordering patterns
                    </p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    onClick={loadData}
                    className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md shadow-sm hover:bg-gray-50"
                    title="Refresh Data"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Refresh</span>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-xs text-indigo-600 font-medium">Best Day</p>
                  <p className="text-lg font-semibold">
                    {analyticsData.orderTiming.bestPerformingDays[0]?.day || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analyticsData.orderTiming.bestPerformingDays[0]?.count || 0} orders
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">Best Time</p>
                  <p className="text-lg font-semibold">
                    {analyticsData.orderTiming.bestPerformingHours[0]?.hour || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analyticsData.orderTiming.bestPerformingHours[0]?.count || 0} orders
                  </p>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg">
                  <p className="text-xs text-amber-600 font-medium">Highest Revenue</p>
                  <p className="text-lg font-semibold">
                    {analyticsData.orderTiming.weekdayDistribution.sort((a, b) => b.revenue - a.revenue)[0]?.day || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ${analyticsData.orderTiming.weekdayDistribution.sort((a, b) => b.revenue - a.revenue)[0]?.revenue.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-purple-600 font-medium">Highest AOV</p>
                  <p className="text-lg font-semibold">
                    {analyticsData.orderTiming.timeOfDayDistribution.sort((a, b) => b.averageOrderValue - a.averageOrderValue)[0]?.timeRange || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ${analyticsData.orderTiming.timeOfDayDistribution.sort((a, b) => b.averageOrderValue - a.averageOrderValue)[0]?.averageOrderValue.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Main Analysis Component */}
            <OrderTimingAnalysis 
              timingData={analyticsData.orderTiming} 
              onRefresh={loadData}
            />
            
            {/* Recommendations Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Action Plan</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-emerald-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 12h8"></path>
                        <path d="M12 8v8"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium">Advertising Strategy</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Focus your ad spend on {analyticsData.orderTiming.bestPerformingDays[0]?.day || 'weekdays'} during {analyticsData.orderTiming.bestPerformingHours[0]?.hour || 'peak hours'} to maximize your return on ad spend.
                  </p>
                  <p className="text-sm text-gray-600">
                    Consider running promotions during low-volume times like {analyticsData.orderTiming.worstPerformingDays[0]?.day || 'off-peak days'} to boost sales in slower periods.
                  </p>
                </div>
                
                <div className="bg-white p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <h4 className="font-medium">Staff Scheduling</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Ensure you have adequate staff coverage during peak ordering hours ({analyticsData.orderTiming.bestPerformingHours[0]?.hour || 'busy periods'}) to maintain excellent customer service.
                  </p>
                  <p className="text-sm text-gray-600">
                    Consider adjusting your staffing schedule to align with your busiest and highest-revenue days, especially {analyticsData.orderTiming.weekdayDistribution.sort((a, b) => b.revenue - a.revenue)[0]?.day || 'peak days'}.
                  </p>
                </div>
                
                <div className="bg-white p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-purple-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                    </div>
                    <h4 className="font-medium">Website Optimization</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Schedule your website updates and maintenance during low-volume times like {analyticsData.orderTiming.worstPerformingHours[0]?.hour || 'off-peak hours'} to minimize impact on sales.
                  </p>
                  <p className="text-sm text-gray-600">
                    Consider using targeted promotions during peak browsing hours to encourage more conversions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderTiming; 