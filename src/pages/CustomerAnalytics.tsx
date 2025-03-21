import React, { useState, useEffect } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  Download, Filter, Calendar, RefreshCw, Users,
  UserPlus, Activity, UserCheck, UserX, Heart,
  BarChart2, Layers, ShoppingBag, Clock
} from 'lucide-react';
import DateRangePicker from '../components/common/DateRangePicker';
import { customersService } from '../services';
import { syncCustomers } from '../services/api/customers';
import { DateRange, CustomerAnalyticsData, Customer } from '../types';
import CustomerOverview from '../components/customerAnalytics/CustomerOverview';
import CustomerSegmentChart from '../components/customerAnalytics/CustomerSegmentChart';
import RFMAnalysis from '../components/customerAnalytics/RFMAnalysis';
import CustomerValueMetrics from '../components/customerAnalytics/CustomerValueMetrics';
import CustomerList from '../components/customerAnalytics/CustomerList';
import AcquisitionSourceChart from '../components/customerAnalytics/AcquisitionSourceChart';
import CustomerSegmentList from '../components/customerAnalytics/CustomerSegmentList';
import RFMSegmentList from '../components/customerAnalytics/RFMSegmentList';
import CustomerOrderProducts from '../components/customerAnalytics/CustomerOrderProducts';
import CustomerCohortAnalysis from '../components/customerAnalytics/CustomerCohortAnalysis';
import PurchaseFrequencyAnalysis from '../components/customerAnalytics/PurchaseFrequencyAnalysis';
import ProductAffinityAnalysis from '../components/customerAnalytics/ProductAffinityAnalysis';
import OrderTimingAnalysis from '../components/customerAnalytics/OrderTimingAnalysis';

const CustomerAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<CustomerAnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfMonth(subMonths(new Date(), 3)),
    endDate: endOfMonth(new Date())
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'segments' | 'rfm' | 'advanced' | 'order-timing'>('overview');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Load customer analytics data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await customersService.getCustomerAnalytics(
        dateRange.startDate,
        dateRange.endDate
      );
      
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error loading customer analytics data:', err);
      setError('Failed to load customer analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Sync customer data from WooCommerce
  const handleSync = async () => {
    try {
      setSyncLoading(true);
      setError(null);
      
      await syncCustomers((progress) => {
        console.log(`Sync progress: ${progress}%`);
      });
      
      // Reload data after sync
      await loadData();
    } catch (err) {
      console.error('Error syncing customer data:', err);
      setError('Failed to sync customer data. Please try again.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  // Export data as CSV
  const exportCSV = () => {
    if (!analyticsData) return;
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add headers
    csvContent += 'Metric,Value\n';
    
    // Add basic metrics
    csvContent += `Total Customers,${analyticsData.totalCustomers}\n`;
    csvContent += `New Customers,${analyticsData.newCustomers}\n`;
    csvContent += `Active Customers,${analyticsData.activeCustomers}\n`;
    csvContent += `At-Risk Customers,${analyticsData.atRiskCustomers}\n`;
    csvContent += `Lost Customers,${analyticsData.lostCustomers}\n`;
    csvContent += `Average Order Value,${analyticsData.averageOrderValue.toFixed(2)}\n`;
    csvContent += `Customer Lifetime Value,${analyticsData.customerLifetimeValue.toFixed(2)}\n`;
    
    // Add segment data
    csvContent += '\nCustomer Segments\n';
    csvContent += 'Segment,Count,Percentage\n';
    analyticsData.customerSegments.forEach(segment => {
      csvContent += `${segment.name},${segment.count},${segment.percentage}%\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load data on initial render and when date range changes
  useEffect(() => {
    loadData();
  }, [dateRange]);

  // Define segment labels and colors
  const segmentLabels: Record<string, string> = {
    'loyal': 'Loyal Customers',
    'active': 'Active Customers',
    'at-risk': 'At-Risk Customers',
    'lost': 'Lost Customers',
    'new': 'New Customers',
    'high-value': 'High Value Customers',
    'one-time': 'One-Time Purchasers', 
    'occasional': 'Occasional Customers',
    'dormant': 'Dormant Customers',
    'vip': 'VIP Customers'
  };
  
  const segmentColors: Record<string, string> = {
    'loyal': 'rose',
    'active': 'blue',
    'at-risk': 'amber',
    'lost': 'gray',
    'new': 'emerald',
    'high-value': 'purple',
    'one-time': 'teal',
    'occasional': 'lime',
    'dormant': 'orange',
    'vip': 'indigo'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customer Analytics</h1>
          <p className="text-gray-500">
            Analyze customer behavior, segments, and lifetime value
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Date Range Picker */}
          <div className="relative">
            <DateRangePicker 
              dateRange={dateRange}
              onChange={handleDateRangeChange}
            />
          </div>
          
          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
            <span>{syncLoading ? 'Syncing...' : 'Sync Customers'}</span>
          </button>
          
          {/* Export Button */}
          <button
            onClick={exportCSV}
            disabled={!analyticsData || loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-gray-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('segments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'segments' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Customer Segments
          </button>
          <button
            onClick={() => setActiveTab('rfm')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rfm' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            RFM Analysis
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'advanced' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Advanced Analytics
          </button>
          <button
            onClick={() => setActiveTab('order-timing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'order-timing' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="h-4 w-4 mr-1" />
            Order Timing
          </button>
        </nav>
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
      
      {/* Analytics Content */}
      {!loading && analyticsData && (
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Customer Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <CustomerOverview
                  icon={<Users className="h-5 w-5 text-indigo-600" />}
                  title="Total Customers"
                  value={analyticsData.totalCustomers}
                  color="indigo"
                />
                <CustomerOverview
                  icon={<UserPlus className="h-5 w-5 text-emerald-600" />}
                  title="New Customers"
                  value={analyticsData.newCustomers}
                  color="emerald"
                />
                <CustomerOverview
                  icon={<Activity className="h-5 w-5 text-blue-600" />}
                  title="Active Customers"
                  value={analyticsData.activeCustomers}
                  color="blue"
                />
                <CustomerOverview
                  icon={<UserX className="h-5 w-5 text-amber-600" />}
                  title="At-Risk Customers"
                  value={analyticsData.atRiskCustomers}
                  color="amber"
                />
                <CustomerOverview
                  icon={<Heart className="h-5 w-5 text-rose-600" />}
                  title="Loyal Customers"
                  value={analyticsData.customerSegments.find(s => s.name === 'loyal')?.count || 0}
                  color="rose"
                />
              </div>
              
              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CustomerSegmentChart segments={analyticsData.customerSegments} />
                <CustomerValueMetrics
                  averageOrderValue={analyticsData.averageOrderValue}
                  customerLifetimeValue={analyticsData.customerLifetimeValue}
                />
              </div>
              
              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RFMAnalysis rfmData={analyticsData.rfmData} />
                <AcquisitionSourceChart sources={analyticsData.acquisitionSources} />
              </div>
              
              {/* Customer Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CustomerList
                  title="Top Spending Customers"
                  customers={analyticsData.topSpendingCustomers}
                  valueLabel="Total Spent"
                  valueType="currency"
                />
                <CustomerList
                  title="Most Frequent Customers"
                  customers={analyticsData.mostFrequentCustomers}
                  valueLabel="Order Count"
                  valueType="number"
                />
              </div>
            </>
          )}
          
          {activeTab === 'segments' && (
            <>
              {/* Customer Segments */}
              <CustomerSegmentList
                customersBySegment={analyticsData.customersBySegment || {}}
                segmentLabels={segmentLabels}
                segmentColors={segmentColors}
                onSelectCustomer={setSelectedCustomer}
              />
              
              {/* Customer Orders with Products - For the selected customer - Modal style */}
              {selectedCustomer && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b">
                      <h3 className="text-xl font-medium">
                        Orders for {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </h3>
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="overflow-auto p-4 flex-grow">
                      <CustomerOrderProducts customer={selectedCustomer} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'rfm' && (
            <RFMSegmentList segmentColors={segmentColors} />
          )}
          
          {activeTab === 'advanced' && (
            <>
              {/* Advanced Analytics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center space-x-4">
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <Layers className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Cohort Analysis</h3>
                    <p className="text-sm text-gray-500">Track customer retention over time</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center space-x-4">
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <BarChart2 className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Purchase Frequency</h3>
                    <p className="text-sm text-gray-500">Optimize re-engagement timing</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center space-x-4">
                  <div className="bg-emerald-100 p-3 rounded-lg">
                    <ShoppingBag className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Product Affinity</h3>
                    <p className="text-sm text-gray-500">Find cross-selling opportunities</p>
                  </div>
                </div>
              </div>
              
              {/* Customer Cohort Analysis */}
              {analyticsData.cohortAnalysis ? (
                <CustomerCohortAnalysis cohortData={analyticsData.cohortAnalysis} />
              ) : (
                <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
                  <h3 className="text-lg font-medium mb-2">Customer Cohort Analysis</h3>
                  <div className="text-center py-8 flex flex-col items-center">
                    <Layers className="h-12 w-12 text-gray-300 mb-2" />
                    <p className="text-gray-500 mb-4">No cohort data available</p>
                    <p className="text-sm text-gray-500 max-w-lg">
                      Cohort analysis tracks how customers acquired in the same time period behave over time.
                      This helps identify which acquisition periods produce the most valuable customers.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Purchase Frequency Analysis */}
              {analyticsData.purchaseFrequency ? (
                <PurchaseFrequencyAnalysis frequencyData={analyticsData.purchaseFrequency} />
              ) : (
                <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
                  <h3 className="text-lg font-medium mb-2">Purchase Frequency Analysis</h3>
                  <div className="text-center py-8 flex flex-col items-center">
                    <BarChart2 className="h-12 w-12 text-gray-300 mb-2" />
                    <p className="text-gray-500 mb-4">No purchase frequency data available</p>
                    <p className="text-sm text-gray-500 max-w-lg">
                      Purchase frequency analysis shows how often customers make repeat purchases.
                      This helps determine optimal timing for re-engagement campaigns and predicts future buying behavior.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Product Affinity Analysis */}
              {analyticsData.productAffinity ? (
                <ProductAffinityAnalysis affinityData={analyticsData.productAffinity} />
              ) : (
                <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
                  <h3 className="text-lg font-medium mb-2">Product Affinity Analysis</h3>
                  <div className="text-center py-8 flex flex-col items-center">
                    <ShoppingBag className="h-12 w-12 text-gray-300 mb-2" />
                    <p className="text-gray-500 mb-4">No product affinity data available</p>
                    <p className="text-sm text-gray-500 max-w-lg">
                      Product affinity analysis reveals which products are commonly purchased together.
                      This helps identify cross-selling opportunities and optimize product recommendations.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Order Timing Analysis Tab */}
          {activeTab === 'order-timing' && (
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
                  
                  {analyticsData.orderTiming && (
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
                  )}
                </div>
                
                {analyticsData.orderTiming ? (
                  <>
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
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-start">
                              <span className="text-emerald-500 font-bold mr-2 mt-1">•</span>
                              <span>Increase ad budget by 30% on {analyticsData.orderTiming.bestPerformingDays[0]?.day || 'weekends'} during {analyticsData.orderTiming.bestPerformingHours[0]?.hour || 'peak hours'}</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-emerald-500 font-bold mr-2 mt-1">•</span>
                              <span>Run flash promotions between {analyticsData.orderTiming.bestPerformingHours[0]?.hour || 'peak hours'} to maximize conversion rates</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-emerald-500 font-bold mr-2 mt-1">•</span>
                              <span>Reduce ad spend during {analyticsData.orderTiming.worstPerformingHours.filter(h => h.count > 0)[0]?.hour || 'off-hours'} when conversion rates are lowest</span>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="bg-white p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-full bg-blue-100">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              </svg>
                            </div>
                            <h4 className="font-medium">Operational Improvements</h4>
                          </div>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-start">
                              <span className="text-blue-500 font-bold mr-2 mt-1">•</span>
                              <span>Schedule additional staff during {analyticsData.orderTiming.bestPerformingHours[0]?.hour || 'peak hours'} to handle increased order volume</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-blue-500 font-bold mr-2 mt-1">•</span>
                              <span>Ensure inventory levels are well-stocked before {analyticsData.orderTiming.bestPerformingDays[0]?.day || 'busy days'}</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-blue-500 font-bold mr-2 mt-1">•</span>
                              <span>Plan fulfillment process improvements for high-volume periods</span>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="bg-white p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-full bg-purple-100">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                              </svg>
                            </div>
                            <h4 className="font-medium">Customer Engagement</h4>
                          </div>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-start">
                              <span className="text-purple-500 font-bold mr-2 mt-1">•</span>
                              <span>Send personalized offers during {analyticsData.orderTiming.timeOfDayDistribution.sort((a, b) => b.averageOrderValue - a.averageOrderValue)[0]?.timeRange || 'high-value periods'} when AOV is highest</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-purple-500 font-bold mr-2 mt-1">•</span>
                              <span>Schedule email campaigns to arrive just before peak ordering hours</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-purple-500 font-bold mr-2 mt-1">•</span>
                              <span>Use SMS reminders for limited-time offers during known high-purchase periods</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* ROI Impact Analysis */}
                    <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-5 rounded-lg border shadow-sm">
                      <h3 className="text-lg font-medium mb-2">Expected ROI Impact</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Implementing these timing-based optimizations could result in:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Ad Spend Efficiency</span>
                            <span className="text-emerald-500 font-bold">+15-20%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            By targeting high-converting time slots
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Conversion Rate</span>
                            <span className="text-emerald-500 font-bold">+10-15%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Through perfectly timed promotions
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Average Order Value</span>
                            <span className="text-emerald-500 font-bold">+5-8%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            By targeting high-AOV time periods
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <div className="text-center py-8 flex flex-col items-center">
                      <div className="bg-rose-100 p-4 rounded-full mb-4">
                        <Clock className="h-12 w-12 text-rose-600" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">No Order Timing Data Available</h3>
                      <p className="text-gray-500 mb-6 max-w-lg mx-auto">
                        Order timing analysis reveals when your customers are most likely to place orders,
                        helping you optimize advertising schedules and staffing for peak order times.
                      </p>
                      <button
                        onClick={loadData}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Generate Analysis</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerAnalytics; 