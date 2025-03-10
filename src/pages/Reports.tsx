import React, { useState, useEffect } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart, Area
} from 'recharts';
import { Download, Filter, Calendar, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import DateRangePicker from '../components/common/DateRangePicker';
import { DateRange, Order, Product, Expense, ReportData, AdditionalRevenue } from '../types';
import { 
  fetchOrders, 
  fetchProducts, 
  fetchInventory, 
  fetchOverheadCosts, 
  hasApiCredentials 
} from '../services/api';
import { calculateProfitAndLoss } from '../services/pnl';
import { getExpenses } from '../db/operations/expenses';
import { loadReportData } from '../services/reports';
import SalesReport from '../components/reports/SalesReport';
import ProductsReport from '../components/reports/ProductsReport';
import ExpensesReport from '../components/reports/ExpensesReport';
import ProfitabilityReport from '../components/reports/ProfitabilityReport';
import AdditionalRevenueReport from '../components/reports/AdditionalRevenueReport';

// Report types
type ReportType = 'sales' | 'products' | 'expenses' | 'additionalRevenue' | 'profitability';

// Report period types
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

const Reports: React.FC = () => {
  // State for report configuration
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subMonths(new Date(), 6),
    endDate: new Date()
  });
  
  // State for report data
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if API credentials are set
      const hasCredentials = await hasApiCredentials();
      if (!hasCredentials) {
        setError('API credentials not set. Please go to Settings to configure your WooCommerce API credentials.');
        setLoading(false);
        return;
      }
      
      // Load report data
      const data = await loadReportData(dateRange, periodType);
      setReportData(data);
    } catch (error) {
      console.error('Error loading report data:', error);
      setError('Failed to load report data. Please check your API credentials and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Export report as CSV
  const exportReportCSV = () => {
    if (!reportData) return;
    
    let data: any[] = [];
    let filename = '';
    
    switch (reportType) {
      case 'sales':
        data = reportData.salesData;
        filename = 'sales-report';
        break;
      case 'products':
        data = reportData.productData;
        filename = 'products-report';
        break;
      case 'expenses':
        data = reportData.expenseData.filter(item => !item.period); // Only category data
        filename = 'expenses-report';
        break;
      case 'additionalRevenue':
        data = reportData.additionalRevenueReport.filter(item => !item.period); // Only category data
        filename = 'additional-revenue-report';
        break;
      case 'profitability':
        data = reportData.profitabilityData;
        filename = 'profitability-report';
        break;
    }
    
    if (data.length === 0) return;
    
    // Convert data to CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(','));
    const csv = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };
  
  // Effect to load data when report type or date range changes
  useEffect(() => {
    loadData();
  }, [reportType, dateRange, periodType]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }
  
  if (!reportData) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">No Data:</strong>
          <span className="block sm:inline"> No report data available. Please try a different date range or report type.</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Reports</h1>
        
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Report Type:</span>
            <select
              className="p-2 border rounded"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              <option value="sales">Sales Report</option>
              <option value="products">Products Report</option>
              <option value="expenses">Expenses Report</option>
              <option value="additionalRevenue">Additional Revenue</option>
              <option value="profitability">Profitability Report</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Period:</span>
            <select
              className="p-2 border rounded"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
          
          <button
            onClick={loadData}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
          
          <button
            onClick={exportReportCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </button>
        </div>
      </div>
      
      {/* Report Content */}
      <div className="space-y-8">
        {reportType === 'sales' && (
          <SalesReport data={reportData.salesData} />
        )}
        
        {reportType === 'products' && (
          <ProductsReport data={reportData.productData} />
        )}
        
        {reportType === 'expenses' && (
          <ExpensesReport 
            categoryData={reportData.expenseData.filter(item => item.category)} 
            timeData={reportData.expenseData.filter(item => item.period)} 
          />
        )}
        
        {reportType === 'additionalRevenue' && (
          <AdditionalRevenueReport 
            categoryData={reportData.additionalRevenueReport.filter(item => item.category)} 
            timeData={reportData.additionalRevenueReport.filter(item => item.period)} 
          />
        )}
        
        {reportType === 'profitability' && (
          <ProfitabilityReport data={reportData.profitabilityData} />
        )}
      </div>
    </div>
  );
};

export default Reports;