import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { format } from 'date-fns';
import { DollarSign, TrendingUp, ShoppingCart, Percent, RefreshCw } from 'lucide-react';
import DateRangePicker from '../components/DateRangePicker';
import StatCard from '../components/StatCard';
import { DateRange, Order, PnLSummary } from '../types';
import { 
  fetchOrders, 
  fetchInventory, 
  fetchOverheadCosts, 
  hasApiCredentials 
} from '../services/api';
import { calculateProfitAndLoss } from '../services/pnl';

const Dashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date()
  });
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [pnlSummary, setPnlSummary] = useState<PnLSummary>({
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
      
      // Calculate profit and margins with expenses
      const result = await calculateProfitAndLoss(
        ordersData,
        inventoryData,
        overheadCosts,
        dateRange
      );
      
      // Filter orders by date range
      const filteredOrders = result.orders.filter(order => {
        const orderDate = new Date(order.date_created);
        return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
      });
      
      setOrders(filteredOrders);
      setExpensesByCategory(result.summary.expensesByCategory);
      setTotalExpenses(result.summary.totalExpenses);
      
      // Calculate P&L summary
      const totalRevenue = filteredOrders.reduce((sum, order) => {
        const orderTotal = parseFloat(order.total);
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
      }, 0);
      
      const totalCost = filteredOrders.reduce((sum, order) => {
        const orderCost = order.cost_total || 0;
        return sum + (isNaN(orderCost) ? 0 : orderCost);
      }, 0);
      
      const totalProfit = totalRevenue - totalCost;
      
      // Calculate net profit based on the filtered orders' gross profit and expenses
      // This ensures consistency between the displayed values
      const calculatedNetProfit = totalProfit - result.summary.totalExpenses;
      setNetProfit(calculatedNetProfit);
      
      const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const orderCount = filteredOrders.length;
      const itemCount = filteredOrders.reduce(
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
      const date = format(new Date(order.date_created), 'MMM dd');
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, cost: 0, profit: 0 };
      }
      acc[date].revenue += parseFloat(order.total);
      acc[date].cost += order.cost_total || 0;
      acc[date].profit += order.profit || 0;
      return acc;
    }, {} as Record<string, { date: string; revenue: number; cost: number; profit: number }>);
    
    return Object.values(dataByDate);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Revenue" 
          value={formatCurrency(pnlSummary.totalRevenue)}
          icon={<DollarSign className="h-6 w-6 text-blue-600" />}
        />
        <StatCard 
          title="Total Profit" 
          value={formatCurrency(pnlSummary.totalProfit)}
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
          change={`${pnlSummary.totalRevenue > 0 ? ((pnlSummary.totalProfit / pnlSummary.totalRevenue) * 100).toFixed(1) + '%' : '0%'} of revenue`}
          isPositive={pnlSummary.totalProfit > 0}
        />
        <StatCard 
          title="Net Profit" 
          value={formatCurrency(netProfit)}
          icon={<DollarSign className="h-6 w-6 text-blue-600" />}
          change={`After ${formatCurrency(totalExpenses)} expenses`}
          isPositive={netProfit > 0}
        />
        <StatCard 
          title="Average Margin" 
          value={`${pnlSummary.averageMargin.toFixed(1)}%`}
          icon={<Percent className="h-6 w-6 text-purple-600" />}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Revenue vs. Cost</h2>
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
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                <Bar dataKey="cost" name="Cost" fill="#10b981" />
                <Bar dataKey="profit" name="Profit" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Profit Trend</h2>
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
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#8b5cf6" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">P&L Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Period
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pnlSummary.periodStart} to {pnlSummary.periodEnd}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Total Revenue
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(pnlSummary.totalRevenue)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Total Cost
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(pnlSummary.totalCost)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Gross Profit
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(pnlSummary.totalProfit)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Total Expenses
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(totalExpenses)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                  <strong>Net Profit</strong>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold bg-gray-50 text-gray-900">
                  {formatCurrency(netProfit)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Average Margin
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pnlSummary.averageMargin.toFixed(2)}%
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Order Count
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pnlSummary.orderCount}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Item Count
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pnlSummary.itemCount}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;