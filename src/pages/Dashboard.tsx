import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { format, subDays } from 'date-fns';
import { DollarSign, TrendingUp, ShoppingCart, Percent, RefreshCw, Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import DateRangePicker from '../components/common/DateRangePicker';
import StatCard from '../components/common/StatCard';
import PnLSummary from '../components/dashboard/PnLSummary';
import { DateRange, Order, PnLSummary as PnLSummaryType } from '../types';
import { 
  fetchOrders, 
  fetchInventory, 
  fetchOverheadCosts, 
  hasApiCredentials 
} from '../services/api';
import { calculateProfitAndLoss } from '../services/pnl';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date()
  });
  
  const [previousDateRange, setPreviousDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 60)),
    endDate: new Date(new Date().setDate(new Date().getDate() - 31))
  });
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [pnlSummary, setPnlSummary] = useState<PnLSummaryType>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    averageMargin: 0,
    orderCount: 0,
    itemCount: 0,
    periodStart: '',
    periodEnd: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({});
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [previousPeriodData, setPreviousPeriodData] = useState<{
    totalRevenue: number;
    totalProfit: number;
    netProfit: number;
  } | null>(null);

  // Add this state for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Update previous date range when current date range changes
  useEffect(() => {
    const daysDiff = Math.round((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    setPreviousDateRange({
      startDate: new Date(dateRange.startDate.getTime() - (daysDiff * 24 * 60 * 60 * 1000)),
      endDate: new Date(dateRange.startDate.getTime() - (24 * 60 * 60 * 1000))
    });
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if API credentials are set
      const hasCredentials = await hasApiCredentials();
      if (!hasCredentials) {
        setError('API credentials not set. Please go to Settings to configure your API credentials.');
        setLoading(false);
        return;
      }
      
      // Fetch data
      const ordersData = await fetchOrders();
      const inventoryData = await fetchInventory();
      const overheadCosts = await fetchOverheadCosts();
      
      // Calculate profit and margins with expenses for current period
      const result = await calculateProfitAndLoss(
        ordersData,
        inventoryData,
        overheadCosts,
        dateRange
      );
      
      // Filter orders by date range
      const filteredOrders = result.orders.filter(order => {
        if (!order.date_created) return false;
        const orderDate = new Date(order.date_created);
        return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
      });
      
      // Sort orders by date (newest first)
      const sortedOrders = [...filteredOrders].sort((a, b) => {
        if (!a.date_created || !b.date_created) return 0;
        return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
      });
      
      setOrders(sortedOrders);
      setExpensesByCategory(result.summary.expensesByCategory);
      setTotalExpenses(result.summary.totalExpenses);
      
      // Calculate P&L summary
      const totalRevenue = sortedOrders.reduce((sum, order) => {
        const orderTotal = parseFloat(order.total);
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
      }, 0);
      
      const totalCost = sortedOrders.reduce((sum, order) => {
        const orderCost = (order as any).cost_total || 0;
        return sum + (isNaN(orderCost) ? 0 : orderCost);
      }, 0);
      
      const totalProfit = totalRevenue - totalCost;
      
      // Calculate net profit based on the filtered orders' gross profit and expenses
      // This ensures consistency between the displayed values
      const calculatedNetProfit = totalProfit - result.summary.totalExpenses;
      setNetProfit(calculatedNetProfit);
      
      const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const orderCount = sortedOrders.length;
      const itemCount = sortedOrders.reduce(
        (sum, order) => sum + order.line_items.reduce((itemSum, item) => {
          const quantity = item.quantity || 0;
          return itemSum + (isNaN(quantity) ? 0 : quantity);
        }, 0), 
        0
      );
      
      setPnlSummary({
        totalRevenue,
        totalCost,
        totalProfit,
        averageMargin,
        orderCount,
        itemCount,
        periodStart: format(dateRange.startDate, 'MMM dd, yyyy'),
        periodEnd: format(dateRange.endDate, 'MMM dd, yyyy')
      });
      
      // Calculate previous period data for comparison
      const previousPeriodOrders = ordersData.filter(order => {
        if (!order.date_created) return false;
        const orderDate = new Date(order.date_created);
        return orderDate >= previousDateRange.startDate && orderDate <= previousDateRange.endDate;
      });
      
      const previousTotalRevenue = previousPeriodOrders.reduce((sum, order) => {
        const orderTotal = parseFloat(order.total);
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
      }, 0);
      
      const previousTotalCost = previousPeriodOrders.reduce((sum, order) => {
        const orderCost = (order as any).cost_total || 0;
        return sum + (isNaN(orderCost) ? 0 : orderCost);
      }, 0);
      
      const previousTotalProfit = previousTotalRevenue - previousTotalCost;
      
      // Calculate previous period expenses
      const previousPeriodResult = await calculateProfitAndLoss(
        ordersData,
        inventoryData,
        overheadCosts,
        previousDateRange
      );
      
      const previousNetProfit = previousTotalProfit - previousPeriodResult.summary.totalExpenses;
      
      setPreviousPeriodData({
        totalRevenue: previousTotalRevenue,
        totalProfit: previousTotalProfit,
        netProfit: previousNetProfit
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please check your API credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  // Prepare data for charts
  const prepareRevenueVsCostData = () => {
    // Group by date
    const dataByDate = orders.reduce((acc, order) => {
      if (!order.date_created) return acc;
      const date = format(new Date(order.date_created), 'MMM dd');
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, cost: 0, profit: 0 };
      }
      acc[date].revenue += parseFloat(order.total);
      acc[date].cost += (order as any).cost_total || 0;
      acc[date].profit += (order as any).profit || 0;
      return acc;
    }, {} as Record<string, { date: string; revenue: number; cost: number; profit: number }>);
    
    return Object.values(dataByDate);
  };

  // Prepare data for expense breakdown chart
  const prepareExpenseData = () => {
    return Object.entries(expensesByCategory || {}).map(([category, amount]) => ({
      name: category,
      value: amount
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Add this function to handle pagination
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Calculate pagination values
  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);

  // Generate pagination buttons with ellipsis for large number of pages
  const getPaginationButtons = () => {
    const buttons = [];
    const maxButtonsToShow = 5; // Show at most 5 page buttons
    
    if (totalPages <= maxButtonsToShow) {
      // If we have 5 or fewer pages, show all page buttons
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
    } else {
      // Always show first page button
      buttons.push(1);
      
      // Calculate start and end of the middle section
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if we're at the beginning or end
      if (currentPage <= 2) {
        endPage = 3;
      } else if (currentPage >= totalPages - 1) {
        startPage = totalPages - 2;
      }
      
      // Add ellipsis before middle section if needed
      if (startPage > 2) {
        buttons.push('ellipsis1');
      }
      
      // Add middle section
      for (let i = startPage; i <= endPage; i++) {
        buttons.push(i);
      }
      
      // Add ellipsis after middle section if needed
      if (endPage < totalPages - 1) {
        buttons.push('ellipsis2');
      }
      
      // Always show last page button
      buttons.push(totalPages);
    }
    
    return buttons;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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

  const periodLabel = `${format(dateRange.startDate, 'MMM dd, yyyy')} - ${format(dateRange.endDate, 'MMM dd, yyyy')}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
          <button 
            onClick={loadData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>
      
      {/* P&L Summary */}
      <PnLSummary 
        summary={{
          totalRevenue: pnlSummary.totalRevenue,
          totalCost: pnlSummary.totalCost,
          totalProfit: pnlSummary.totalProfit,
          totalExpenses: totalExpenses,
          netProfit: netProfit,
          averageMargin: pnlSummary.averageMargin,
          orderCount: pnlSummary.orderCount,
          itemCount: pnlSummary.itemCount,
          expensesByCategory: expensesByCategory
        }}
        previousPeriod={previousPeriodData || undefined}
        periodLabel={periodLabel}
      />
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart className="h-5 w-5 mr-2 text-blue-600" />
            Revenue vs. Cost
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prepareRevenueVsCostData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                <Bar dataKey="cost" name="Cost" fill="#ef4444" />
                <Bar dataKey="profit" name="Profit" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Profit Trend
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={prepareRevenueVsCostData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  name="Profit" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Order Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2 text-indigo-600" />
            Recent Orders
          </h2>
          <Link to="/orders" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
            View All Orders <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margin
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentOrders.map((order) => {
                const orderTotal = parseFloat(order.total);
                const orderCost = (order as any).cost_total || 0;
                const orderProfit = (order as any).profit || 0;
                const orderMargin = orderTotal > 0 ? (orderProfit / orderTotal) * 100 : 0;
                
                return (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.date_created ? format(new Date(order.date_created), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.line_items.reduce((sum, item) => sum + item.quantity, 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(orderTotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(orderCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={orderProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(orderProfit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        orderMargin >= 20 ? 'bg-green-100 text-green-800' : 
                        orderMargin >= 10 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {orderMargin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              {getPaginationButtons().map((page, index) => (
                page === 'ellipsis1' || page === 'ellipsis2' ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={index}
                    onClick={() => handlePageChange(page as number)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;