import React, { useState, useEffect } from 'react';
import { StockMovement } from '../../types';
import { formatNZDate } from '../../utils/dateUtils';
import { X, Filter, Calendar, ShoppingBag, ChevronLeft, ChevronRight, List, BarChart, Edit } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { settingsService } from '../../services';
import EditMovementModal from './EditMovementModal';

interface StockMovementModalProps {
  sku: string;
  movements: StockMovement[];
  onClose: () => void;
  onMovementDeleted?: (movementId: number) => void;
}

interface OrderItem {
  number: string;
  date_created: string;
  status: string;
  sku: string;
  quantity: number;
  total: string;
}

const StockMovementModal: React.FC<StockMovementModalProps> = ({
  sku,
  movements,
  onClose,
  onMovementDeleted
}) => {
  // View mode: 'orders' or 'movements'
  const [viewMode, setViewMode] = useState<'orders' | 'movements'>('movements');
  
  // State for orders
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [filteredOrderCount, setFilteredOrderCount] = useState(0);
  
  // Filter state for movements
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>(movements);
  
  // State for editing movements
  const [editingMovementId, setEditingMovementId] = useState<number | null>(null);
  
  // Load data on component mount
  useEffect(() => {
    if (viewMode === 'orders') {
      loadOrders();
    } else {
      applyMovementFilters();
    }
  }, [viewMode, sku, page, pageSize, typeFilter, sortOrder]);
  
  // Load orders that contain this SKU
  const loadOrders = async () => {
    setLoading(true);
    try {
      // Check if we should exclude on-hold orders
      const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
      
      // Build the query
      let query = supabase
        .from('orders')
        .select('id, number, date_created, status, line_items, total', { count: 'exact' });
      
      // Add filter for on-hold orders if needed
      if (excludeOnHold) {
        query = query.neq('status', 'on-hold');
      }
      
      // Execute the query
      const { data, count, error } = await query;
      
      if (error) {
        console.error('Error loading orders:', error);
        return;
      }
      
      // Filter orders to only include those with the specified SKU
      const ordersWithSku: OrderItem[] = [];
      
      if (data) {
        for (const order of data) {
          const lineItems = order.line_items || [];
          for (const item of lineItems) {
            if (item.sku === sku) {
              ordersWithSku.push({
                number: order.number,
                date_created: order.date_created,
                status: order.status,
                sku: item.sku,
                quantity: item.quantity,
                total: item.total
              });
              break; // Only add the order once
            }
          }
        }
      }
      
      setOrders(ordersWithSku);
      setTotalOrders(count || 0);
      setFilteredOrderCount(ordersWithSku.length);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters to movements
  const applyMovementFilters = () => {
    let filtered = [...movements];
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(m => m.movement_type === typeFilter);
    }
    
    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.movement_date).getTime();
      const dateB = new Date(b.movement_date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredMovements(filtered);
  };

  // Get order status label
  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Completed</span>;
      case 'processing':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Processing</span>;
      case 'on-hold':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">On Hold</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Cancelled</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">{status}</span>;
    }
  };
  
  // Get movement type label
  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'initial':
        return 'Initial Stock';
      case 'sale':
        return 'Sale';
      case 'adjustment':
        return 'Adjustment';
      case 'purchase':
        return 'Purchase';
      default:
        return type;
    }
  };
  
  // Get reason label
  const getReasonLabel = (reason: string | undefined) => {
    if (!reason) return '-';
    
    switch (reason) {
      case 'expiry':
        return 'Expiry';
      case 'damage':
        return 'Damage';
      case 'theft':
        return 'Theft';
      case 'correction':
        return 'Correction';
      case 'other':
        return 'Other';
      default:
        return reason;
    }
  };
  
  // Format date for display
  const formatOrderDate = (dateString: string) => {
    try {
      return formatNZDate(new Date(dateString));
    } catch (error) {
      return dateString;
    }
  };

  // Parse and format metadata from notes
  const parseMetadata = (notes: string | undefined) => {
    if (!notes) return { displayNotes: '-', metadata: null };
    
    // Check if notes contain metadata
    const metadataMatch = notes.match(/\[METADATA\](.*)/s);
    if (!metadataMatch) return { displayNotes: notes, metadata: null };
    
    try {
      // Extract the regular notes (everything before [METADATA])
      const regularNotes = notes.split('[METADATA]')[0].trim();
      
      // Parse the metadata JSON
      const metadata = JSON.parse(metadataMatch[1]);
      
      return {
        displayNotes: regularNotes || '-',
        metadata
      };
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return { displayNotes: notes, metadata: null };
    }
  };
  
  // Format metadata for display - simplified version
  const formatMetadata = (metadata: any) => {
    if (!metadata) return null;
    
    return (
      <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200 text-xs">
        <div className="text-gray-500">
          This adjustment has additional metadata that is no longer used.
        </div>
      </div>
    );
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Calculate total pages based on filtered order count instead of total orders
  const totalPages = Math.ceil(filteredOrderCount / pageSize);

  // Handle edit success
  const handleEditSuccess = (wasDeleted = false) => {
    // If the movement was deleted, update the filtered movements array and close the modal if no movements left
    if (wasDeleted) {
      // Notify parent component about the deletion if callback exists
      if (onMovementDeleted && editingMovementId) {
        onMovementDeleted(editingMovementId);
      }
      
      // Remove the deleted movement from the array
      const updatedMovements = filteredMovements.filter(m => m.id !== editingMovementId);
      
      // Update the filtered movements array
      if (updatedMovements.length === 0) {
        // If no movements left, close the modal
        onClose();
      } else {
        // Otherwise, update the filtered movements array and clear the editing state
        setFilteredMovements(updatedMovements);
        setEditingMovementId(null);
      }
      return;
    }
    
    // Otherwise, refresh the movements data
    if (viewMode === 'orders') {
      loadOrders();
    } else {
      // Re-apply filters to refresh the view
      applyMovementFilters();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">
            {viewMode === 'orders' ? 'Order History' : 'Stock Movement History'} - {sku}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">View:</span>
                <div className="flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    onClick={() => setViewMode('orders')}
                    className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                      viewMode === 'orders'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <List size={16} className="inline mr-1" /> Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('movements')}
                    className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                      viewMode === 'movements'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <BarChart size={16} className="inline mr-1" /> All Movements
                  </button>
                </div>
              </div>
            </div>
            
            {viewMode === 'orders' ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter size={16} />
                  <span className="text-sm font-medium">Type:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="sale">Sales</option>
                    <option value="purchase">Purchases</option>
                    <option value="adjustment">Adjustments</option>
                    <option value="initial">Initial Stock</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar size={16} />
                  <span className="text-sm font-medium">Sort:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-y-auto flex-grow p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
              <p className="text-gray-500">Loading data...</p>
            </div>
          ) : viewMode === 'orders' && orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No individual orders found</h3>
              <p className="text-sm text-gray-500">
                No individual orders containing this SKU were found. Try viewing "All Movements" to see aggregated sales data.
              </p>
              <button
                onClick={() => setViewMode('movements')}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View All Movements
              </button>
            </div>
          ) : viewMode === 'movements' && filteredMovements.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No movements found</h3>
              <p className="text-sm text-gray-500">
                No stock movements found for the selected filter.
              </p>
            </div>
          ) : viewMode === 'orders' ? (
            <>
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th key="order-date-header" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th key="order-number-header" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order #
                    </th>
                    <th key="order-status-header" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th key="order-quantity-header" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th key="order-total-header" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order, index) => (
                    <tr key={`${order.number}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatOrderDate(order.date_created)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {order.number}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {getOrderStatusLabel(order.status)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-red-600">
                        -{order.quantity}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        ${parseFloat(order.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Always show pagination info */}
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{filteredOrderCount > 0 ? 1 : 0}</span> to{' '}
                  <span className="font-medium">{Math.min(filteredOrderCount, pageSize)}</span> of{' '}
                  <span className="font-medium">{filteredOrderCount}</span> results
                </div>
              </div>
              
              {/* Pagination controls - only shown when multiple pages */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div></div> {/* Empty div to push pagination to the right */}
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={`page-${pageNum}`}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative z-10 inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                                pageNum === page
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page === totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                          <span className="sr-only">Next</span>
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMovements.map((movement, index) => (
                    <tr key={`${movement.id || index}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {formatNZDate(movement.movement_date)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {getMovementTypeLabel(movement.movement_type)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {movement.quantity}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {movement.reference_id || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {getReasonLabel(movement.reason)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {(() => {
                          const { displayNotes, metadata } = parseMetadata(movement.notes);
                          return (
                            <>
                              {displayNotes}
                              {metadata && formatMetadata(metadata)}
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 text-center">
                        {movement.id && (
                          <button
                            onClick={() => setEditingMovementId(movement.id || null)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center mx-auto"
                            title="Edit movement"
                          >
                            <Edit size={12} className="mr-1" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        
        {/* Edit Movement Modal */}
        {editingMovementId && (
          <EditMovementModal
            movementId={editingMovementId}
            onClose={() => setEditingMovementId(null)}
            onSuccess={handleEditSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default StockMovementModal;