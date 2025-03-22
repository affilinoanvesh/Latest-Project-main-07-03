import React, { useState, useEffect } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  Download, Filter, Calendar, RefreshCw, Users,
  UserPlus, Activity, UserCheck, UserX, Heart,
  BarChart2, Layers, ShoppingBag, Clock
} from 'lucide-react';
import DateRangePicker from '../components/common/DateRangePicker';
import { 
  customerBasicService, 
  customerRFMService, 
  customerCohortService, 
  customerPurchaseFrequencyService,
  customerProductAffinityService,
  customerOrderTimingService
} from '../services/customer';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'segments' | 'rfm' | 'advanced'>('overview');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Load customer analytics data - use state date range
  const loadData = async () => {
    // Just call loadDataWithRange with the current state
    await loadDataWithRange(dateRange);
  };

  // Sync customer data from WooCommerce
  const handleSync = async () => {
    try {
      setSyncLoading(true);
      setError(null);
      
      await syncCustomers((progress) => {
        console.log(`Sync progress: ${progress}%`);
      });
      
      // Reload data after sync using current date range
      await loadDataWithRange(dateRange);
    } catch (err) {
      console.error('Error syncing customer data:', err);
      setError('Failed to sync customer data. Please try again.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (newRange: DateRange) => {
    console.log('Date range changed:', newRange);
    // Set the date range and load data directly with the new range
    // rather than waiting for state update
    setDateRange(newRange);
    
    // Instead of using setTimeout, we'll call loadData with the new range directly
    loadDataWithRange(newRange);
  };

  // New function to load data with explicit date range
  const loadDataWithRange = async (range: DateRange) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading data with explicit date range:', range);
      
      // Get basic customer data - pass date range
      const basicData = await customerBasicService.getBasicAnalytics(
        range.startDate,
        range.endDate
      );
      
      // Get orders filtered by date range - using the provided range, not state
      const orders = await customerBasicService.getFilteredOrders(
        range.startDate,
        range.endDate
      );
      
      console.log('Filtered orders:', orders.length);
      
      // Get products for product-related analysis
      const products = await customerBasicService.getProducts();
      
      // Get RFM data
      const rfmData = await customerRFMService.getRFMData();
      
      // Get cohort analysis data
      const cohortData = await customerCohortService.getCohortData();
      
      // Analyze purchase frequency patterns
      const purchaseFrequency = customerPurchaseFrequencyService.analyzePurchaseFrequency(orders);
      
      // Analyze product affinity patterns
      const productAffinity = customerProductAffinityService.analyzeProductAffinity(orders, products);
      
      // Analyze order timing patterns
      const orderTiming = customerOrderTimingService.analyzeOrderTiming(orders);
      
      // Combine all data
      const data: CustomerAnalyticsData = {
        ...basicData,
        rfmData,
        cohortAnalysis: cohortData,
        purchaseFrequency,
        productAffinity,
        orderTiming
      };
      
      console.log('Analytics data loaded successfully');
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error loading customer analytics data:', err);
      setError('Failed to load customer analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
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

  // Load data on initial render only, the date range change will trigger loadData explicitly
  useEffect(() => {
    loadData();
  }, []); // Remove dateRange dependency since we're handling it explicitly

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
        </div>
      )}
    </div>
  );
};

export default CustomerAnalytics; 