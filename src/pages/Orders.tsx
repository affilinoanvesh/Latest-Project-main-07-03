import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Search, Trash2, RefreshCw, AlertCircle, Filter, ChevronLeft, ChevronRight, BarChart2, CheckCircle } from 'lucide-react';
import DateRangePicker from '../components/common/DateRangePicker';
import { DateRange, Order } from '../types';
import { fetchOrders, fetchInventory, fetchOverheadCosts, hasApiCredentials, deleteOrder } from '../services/api';
import { calculateProfitAndLoss } from '../services/pnl';
import { processOrderStockMovements } from '../db/operations/orders/processOrderStockMovements';

const Orders: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date()
  });
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  
  // Sorting
  const [sortField, setSortField] = useState<keyof Order>('date_created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Add a new state for tracking stock movement processing
  const [processingStockMovements, setProcessingStockMovements] = useState(false);
  const [stockMovementSuccess, setStockMovementSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if API credentials are set
      const hasCredentials = await hasApiCredentials();
      if (!hasCredentials) {
        setError('API credentials not set. Please set them in the settings page.');
        setLoading(false);
        return;
      }
      
      // Fetch orders
      const ordersData = await fetchOrders();
      
      // Filter orders by date range
      const filteredByDate = ordersData.filter(order => {
        if (!order.date_created) return false;
        const orderDate = new Date(order.date_created);
        const start = dateRange.startDate;
        const end = dateRange.endDate;
        return orderDate >= start && orderDate <= end;
      });
      
      // Fetch inventory and overhead costs for profit calculation
      const inventory = await fetchInventory();
      const overheadCosts = await fetchOverheadCosts();
      
      // Calculate profit and loss
      const result = await calculateProfitAndLoss(
        filteredByDate,
        inventory,
        overheadCosts,
        dateRange
      );
      
      setOrders(result.orders);
      setFilteredOrders(result.orders);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Filter orders based on search term and status filter
    let filtered = [...orders];
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.number.toString().includes(lowerSearchTerm) ||
        order.line_items.some(item => 
          item.name.toLowerCase().includes(lowerSearchTerm) ||
          (item.sku && item.sku.toLowerCase().includes(lowerSearchTerm))
        )
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    setFilteredOrders(filtered);
    
    // Calculate total pages
    setTotalPages(Math.ceil(filtered.length / pageSize));
    
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [orders, searchTerm, statusFilter, pageSize]);

  const handleSort = (field: keyof Order) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleOrderExpand = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const formatCurrency = (value: number | string | undefined) => {
    // Ensure we have a number to format
    let numValue: number;
    if (typeof value === 'string') {
      numValue = parseFloat(value) || 0;
    } else if (typeof value === 'number') {
      numValue = value;
    } else {
      numValue = 0;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue);
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    try {
      // Handle different date input types
      const date = typeof dateString === 'string' 
        ? new Date(dateString) 
        : dateString instanceof Date 
          ? dateString 
          : new Date();
      
      return format(date, 'MMM dd, yyyy h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  const handleDeleteOrder = async (orderId: number) => {
    try {
      setLoading(true);
      await deleteOrder(orderId);
      
      // Remove the deleted order from state
      setOrders(orders.filter(order => order.id !== orderId));
      setFilteredOrders(filteredOrders.filter(order => order.id !== orderId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      setError('Failed to delete order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique order statuses for filter
  const orderStatuses = ['all', ...new Set(orders.map(order => order.status))];

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    // Handle special cases
    if (sortField === 'date_created') {
      aValue = a.date_created ? new Date(a.date_created).getTime() : 0;
      bValue = b.date_created ? new Date(b.date_created).getTime() : 0;
    } else if (sortField === 'total' || sortField === 'shipping_total') {
      aValue = parseFloat(String(a[sortField] || '0'));
      bValue = parseFloat(String(b[sortField] || '0'));
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Get current page of orders
  const indexOfLastOrder = currentPage * pageSize;
  const indexOfFirstOrder = indexOfLastOrder - pageSize;
  const currentOrders = sortedOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Go to next page
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Go to previous page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Add a function to process stock movements for an order
  const handleProcessStockMovements = async (order: Order) => {
    try {
      setProcessingStockMovements(true);
      await processOrderStockMovements(order);
      setStockMovementSuccess(`Stock movements created for order #${order.number}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setStockMovementSuccess(null);
      }, 3000);
    } catch (error: any) {
      setError(`Failed to create stock movements: ${error.message}`);
    } finally {
      setProcessingStockMovements(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
          
          <button
            onClick={refreshData}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 mr-4">Filter by Status:</span>
            
            <select
              className="p-2 border rounded"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700 mr-2">Orders per page:</span>
            <select
              className="p-2 border rounded mr-4"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            
            <span className="text-sm text-gray-600">
              Showing {indexOfFirstOrder + 1}-{Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('number')}
                >
                  <div className="flex items-center">
                    Order #
                    {sortField === 'number' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('date_created')}
                >
                  <div className="flex items-center">
                    Date
                    {sortField === 'date_created' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center">
                    Total
                    {sortField === 'total' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('profit')}
                >
                  <div className="flex items-center">
                    Profit
                    {sortField === 'profit' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('margin')}
                >
                  <div className="flex items-center">
                    Margin
                    {sortField === 'margin' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentOrders.map(order => (
                <React.Fragment key={order.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.date_created)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.profit !== undefined && (
                        <span className={order.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(order.profit)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.margin !== undefined && (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.margin >= 20 ? 'bg-green-100 text-green-800' : 
                          order.margin >= 10 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.margin.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleOrderExpand(order.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {expandedOrderId === order.id ? 'Hide Details' : 'View Details'}
                        </button>
                        
                        {deleteConfirm === order.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(order.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleProcessStockMovements(order)}
                          disabled={processingStockMovements}
                          className="ml-2 p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          title="Create stock movements for this order"
                        >
                          <BarChart2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {expandedOrderId === order.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Order Details</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-blue-50/50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500 flex items-center">
                                <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                                Payment Method
                              </p>
                              <p className="text-sm font-medium">{order.payment_method_title || 'N/A'}</p>
                            </div>
                            <div className="bg-blue-50/50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500 flex items-center">
                                <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                                Revenue
                              </p>
                              <p className="text-sm font-medium text-blue-600">
                                {formatCurrency(order.total)}
                              </p>
                            </div>
                            <div className="bg-red-50/50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500 flex items-center">
                                <span className="w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                                Cost Total
                              </p>
                              <p className="text-sm font-medium text-red-600">
                                {formatCurrency((order as any).cost_total || 0)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-green-50/50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500 flex items-center">
                                <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                                Profit
                              </p>
                              <p className={`text-sm font-medium ${(order.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(order.profit || 0)}
                                <span className="ml-2 text-xs">
                                  ({order.margin ? order.margin.toFixed(1) : '0'}% margin)
                                </span>
                              </p>
                            </div>
                            <div className="bg-blue-50/50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500 flex items-center">
                                <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                                Shipping
                              </p>
                              <p className="text-sm font-medium">
                                {formatCurrency(order.shipping_total)}
                              </p>
                            </div>
                            <div className="bg-blue-50/50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500 flex items-center">
                                <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                                Tax
                              </p>
                              <p className="text-sm font-medium">
                                {formatCurrency(order.total_tax)}
                              </p>
                            </div>
                          </div>
                          
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Line Items</h4>
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Product
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  SKU
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Quantity
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Price
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Cost
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Total
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Profit
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Margin
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {order.line_items.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {item.name}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {item.sku || 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {item.quantity}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-600">
                                    {formatCurrency(item.price)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600">
                                    {formatCurrency(item.cost_price || 0)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-600">
                                    {formatCurrency(item.total)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                                    {item.profit !== undefined && (
                                      <span className={item.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {formatCurrency(item.profit)}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                                    {item.margin !== undefined && (
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        item.margin >= 20 ? 'bg-green-100 text-green-800' : 
                                        item.margin >= 10 ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {item.margin.toFixed(1)}%
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination Controls */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{indexOfFirstOrder + 1}</span> to{' '}
              <span className="font-medium">{Math.min(indexOfLastOrder, filteredOrders.length)}</span> of{' '}
              <span className="font-medium">{filteredOrders.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  // If 5 or fewer pages, show all
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  // If near the start, show first 5 pages
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  // If near the end, show last 5 pages
                  pageNum = totalPages - 4 + i;
                } else {
                  // Otherwise show current page and 2 pages on each side
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => paginate(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === pageNum
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={nextPage}
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
        </div>
      </div>
      
      {stockMovementSuccess && (
        <div className="mb-4 p-2 bg-green-100 text-green-700 rounded flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {stockMovementSuccess}
        </div>
      )}
    </div>
  );
};

export default Orders;