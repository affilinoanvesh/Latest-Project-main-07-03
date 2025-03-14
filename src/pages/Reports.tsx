import React, { useState, useEffect } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart, Area
} from 'recharts';
import { 
  Download, Filter, Calendar, RefreshCw, ChevronDown, ChevronUp, 
  BarChart3, ShoppingCart, DollarSign, PieChart, TrendingUp, Check,
  Clock, CalendarDays, CalendarRange
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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

// Report type configuration with icons and descriptions
const reportTypeConfig = {
  sales: {
    label: 'Sales Report',
    icon: <BarChart3 className="h-5 w-5" />,
    description: 'View sales trends, revenue, and order metrics over time'
  },
  products: {
    label: 'Products Report',
    icon: <ShoppingCart className="h-5 w-5" />,
    description: 'Analyze product performance, inventory, and sales by product'
  },
  expenses: {
    label: 'Expenses Report',
    icon: <DollarSign className="h-5 w-5" />,
    description: 'Track expenses by category and time period'
  },
  additionalRevenue: {
    label: 'Additional Revenue',
    icon: <PieChart className="h-5 w-5" />,
    description: 'Monitor non-product revenue sources and their contribution'
  },
  profitability: {
    label: 'Profitability Report',
    icon: <TrendingUp className="h-5 w-5" />,
    description: 'Analyze overall business profitability and margins'
  }
};

// Period type configuration with icons and descriptions
const periodTypeConfig: Record<PeriodType, {
  label: string;
  icon: React.ReactNode;
  description: string;
}> = {
  daily: {
    label: 'Daily',
    icon: <Clock className="h-5 w-5" />,
    description: 'View data aggregated by day'
  },
  weekly: {
    label: 'Weekly',
    icon: <Calendar className="h-5 w-5" />,
    description: 'View data aggregated by week'
  },
  monthly: {
    label: 'Monthly',
    icon: <Calendar className="h-5 w-5" />,
    description: 'View data aggregated by month'
  },
  quarterly: {
    label: 'Quarterly',
    icon: <CalendarRange className="h-5 w-5" />,
    description: 'View data aggregated by quarter (3 months)'
  },
  yearly: {
    label: 'Yearly',
    icon: <CalendarDays className="h-5 w-5" />,
    description: 'View data aggregated by year'
  },
  custom: {
    label: 'Custom',
    icon: <Clock className="h-5 w-5" />,
    description: 'View data for a custom date range'
  }
};

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
    <div className="p-6 bg-gray-50">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center mb-2">
        <h1 className="text-2xl font-bold">Reports</h1>
        </div>
        
        <div className="flex flex-col space-y-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 mb-2">Report Type:</span>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button 
                    className="flex items-center justify-between w-[250px] px-4 py-2 text-left bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
                    aria-label="Select report type"
                  >
                    <div className="flex items-center">
                      {reportTypeConfig[reportType].icon}
                      <span className="ml-2 font-medium">{reportTypeConfig[reportType].label}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                </DropdownMenu.Trigger>
                
                <DropdownMenu.Portal>
                  <DropdownMenu.Content 
                    className="min-w-[300px] bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
                    sideOffset={5}
                  >
                    {(Object.entries(reportTypeConfig) as [ReportType, typeof reportTypeConfig[keyof typeof reportTypeConfig]][]).map(([type, config]) => (
                      <DropdownMenu.Item 
                        key={type}
                        className={`flex flex-col px-4 py-3 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none cursor-pointer ${reportType === type ? 'bg-indigo-50' : ''}`}
                        onClick={() => setReportType(type)}
                      >
                        <div className="flex items-center">
                          <div className={`${reportType === type ? 'text-indigo-600' : 'text-gray-600'}`}>
                            {config.icon}
                          </div>
                          <span className={`ml-2 font-medium ${reportType === type ? 'text-indigo-600' : 'text-gray-800'}`}>
                            {config.label}
                          </span>
                          {reportType === type && (
                            <Check className="ml-auto h-4 w-4 text-indigo-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-7">{config.description}</p>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
          </div>
          
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 mb-2">Period:</span>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button 
                    className="flex items-center justify-between w-[250px] px-4 py-2 text-left bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
                    aria-label="Select period type"
                  >
                    <div className="flex items-center">
                      {periodTypeConfig[periodType].icon}
                      <span className="ml-2 font-medium">{periodTypeConfig[periodType].label}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                </DropdownMenu.Trigger>
                
                <DropdownMenu.Portal>
                  <DropdownMenu.Content 
                    className="min-w-[250px] bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
                    sideOffset={5}
                  >
                    {(Object.entries(periodTypeConfig) as [PeriodType, typeof periodTypeConfig[keyof typeof periodTypeConfig]][]).map(([type, config]) => (
                      <DropdownMenu.Item 
                        key={type}
                        className={`flex flex-col px-4 py-3 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none cursor-pointer ${periodType === type ? 'bg-indigo-50' : ''}`}
                        onClick={() => setPeriodType(type)}
                      >
                        <div className="flex items-center">
                          <div className={`${periodType === type ? 'text-indigo-600' : 'text-gray-600'}`}>
                            {config.icon}
                          </div>
                          <span className={`ml-2 font-medium ${periodType === type ? 'text-indigo-600' : 'text-gray-800'}`}>
                            {config.label}
                          </span>
                          {periodType === type && (
                            <Check className="ml-auto h-4 w-4 text-indigo-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-7">{config.description}</p>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
          </div>
          
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 mb-2 opacity-0">Date Range:</span>
              <div className="w-[400px]">
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
              </div>
            </div>
          
            <div className="flex gap-2 self-end mb-0.5">
          <button
            onClick={loadData}
                className="flex items-center justify-center px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm min-w-[120px]"
          >
                <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          <button
            onClick={exportReportCSV}
                className="flex items-center justify-center px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm min-w-[120px]"
          >
                <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 mt-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      {/* Report Content */}
      <div className="space-y-8 mt-6">
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