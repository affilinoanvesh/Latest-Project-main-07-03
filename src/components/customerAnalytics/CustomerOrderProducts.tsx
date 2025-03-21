import React, { useState, useEffect } from 'react';
import { Customer, Order } from '../../types';
import { customersService } from '../../services';
import { format } from 'date-fns';

interface CustomerOrderProductsProps {
  customer: Customer;
}

const CustomerOrderProducts: React.FC<CustomerOrderProductsProps> = ({ customer }) => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    avgOrderValue: 0,
    firstOrderDate: null as Date | null,
    lastOrderDate: null as Date | null
  });

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const customerOrders = await customersService.getCustomerOrders(customer.id);
        
        // Sort orders by date (newest first)
        const sortedOrders = [...customerOrders].sort((a, b) => {
          const dateA = a.date_created ? new Date(a.date_created).getTime() : 0;
          const dateB = b.date_created ? new Date(b.date_created).getTime() : 0;
          return dateB - dateA;
        });
        
        setOrders(sortedOrders);
        
        // Calculate order statistics
        if (sortedOrders.length > 0) {
          const totalSpent = sortedOrders.reduce((sum, order) => 
            sum + (typeof order.total === 'string' ? parseFloat(order.total) : (order.total || 0)), 0);
          
          const dates = sortedOrders
            .map(o => o.date_created ? new Date(o.date_created) : null)
            .filter(d => d !== null) as Date[];
          
          setOrderStats({
            totalOrders: sortedOrders.length,
            totalSpent,
            avgOrderValue: totalSpent / sortedOrders.length,
            firstOrderDate: dates.length ? dates[dates.length - 1] : null,
            lastOrderDate: dates.length ? dates[0] : null
          });
          
          // Auto-expand the most recent order
          if (sortedOrders.length > 0) {
            setExpandedOrderId(sortedOrders[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading customer orders:', err);
        setError('Failed to load customer orders');
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
  }, [customer]);

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

  const toggleOrderExpand = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Customer Order Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Total Orders</div>
              <div className="text-2xl font-semibold">{orderStats.totalOrders}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Total Spent</div>
              <div className="text-2xl font-semibold">{formatCurrency(orderStats.totalSpent)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Average Order</div>
              <div className="text-2xl font-semibold">{formatCurrency(orderStats.avgOrderValue)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-sm text-gray-500 mb-1">First Order</div>
              <div className="text-lg font-semibold">
                {orderStats.firstOrderDate 
                  ? format(orderStats.firstOrderDate, 'MMM d, yyyy')
                  : 'N/A'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Last Order</div>
              <div className="text-lg font-semibold">
                {orderStats.lastOrderDate 
                  ? format(orderStats.lastOrderDate, 'MMM d, yyyy')
                  : 'N/A'}
              </div>
            </div>
          </div>
          
          {/* Order List */}
          {orders.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
              No order history available
            </div>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="px-4 py-3 border-b">
                <h4 className="font-medium">Order History</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.map((order) => (
                      <React.Fragment key={order.id}>
                        <tr className={`hover:bg-gray-50 ${expandedOrderId === order.id ? 'bg-indigo-50' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{order.number}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {order.date_created ? format(new Date(order.date_created), 'MMM d, yyyy') : 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                                order.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' : 
                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {order.line_items?.length || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              onClick={() => toggleOrderExpand(order.id)}
                              className={`px-3 py-1 rounded text-sm ${
                                expandedOrderId === order.id
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'text-indigo-600 hover:text-indigo-900'
                              }`}
                            >
                              {expandedOrderId === order.id ? 'Hide Items' : 'View Items'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded order details */}
                        {expandedOrderId === order.id && (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 bg-gray-50">
                              <div className="border rounded-md overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                                  <h5 className="font-medium">Order Items</h5>
                                  <div className="text-sm text-gray-600">
                                    {order.payment_method_title ? `Payment: ${order.payment_method_title}` : ''}
                                  </div>
                                </div>
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Product
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        SKU
                                      </th>
                                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Quantity
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Price
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 bg-white">
                                    {order.line_items?.map((item) => (
                                      <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          {item.name}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-500">
                                          {item.sku || 'N/A'}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-center text-gray-500">
                                          {item.quantity}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-500">
                                          {formatCurrency(item.price)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right font-medium">
                                          {formatCurrency(item.total)}
                                        </td>
                                      </tr>
                                    ))}
                                    
                                    {/* Order Totals */}
                                    <tr className="bg-gray-50">
                                      <td colSpan={3} className="px-4 py-2 text-right text-sm font-medium">
                                        {order.discount_total && parseFloat(order.discount_total) > 0 && (
                                          <div className="text-green-600">Discount: {formatCurrency(order.discount_total)}</div>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm font-medium">
                                        Subtotal:
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm font-medium">
                                        {formatCurrency(order.subtotal)}
                                      </td>
                                    </tr>
                                    {order.shipping_total && parseFloat(order.shipping_total) > 0 && (
                                      <tr className="bg-gray-50">
                                        <td colSpan={3}></td>
                                        <td className="px-4 py-2 text-right text-sm font-medium">
                                          Shipping:
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm font-medium">
                                          {formatCurrency(order.shipping_total)}
                                        </td>
                                      </tr>
                                    )}
                                    {order.total_tax && parseFloat(order.total_tax) > 0 && (
                                      <tr className="bg-gray-50">
                                        <td colSpan={3}></td>
                                        <td className="px-4 py-2 text-right text-sm font-medium">
                                          Tax:
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm font-medium">
                                          {formatCurrency(order.total_tax)}
                                        </td>
                                      </tr>
                                    )}
                                    <tr className="bg-gray-50">
                                      <td colSpan={3}></td>
                                      <td className="px-4 py-2 text-right text-sm font-bold">
                                        Total:
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm font-bold">
                                        {formatCurrency(order.total)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerOrderProducts; 