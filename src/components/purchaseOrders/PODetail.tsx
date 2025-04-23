import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Trash2, CheckCircle, Clock, AlertCircle, Printer, Download, Calendar, Tag, BarChart2 } from 'lucide-react';
import { PurchaseOrder, PurchaseOrderItem } from '../../types';
import { getPurchaseOrderWithItems, deletePurchaseOrder } from '../../db/operations/purchaseOrders';
import { processPurchaseOrderStockMovements } from '../../db/operations/purchaseOrders/processPurchaseOrderStockMovements';

interface PODetailProps {
  purchaseOrderId: number;
  onBack: () => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const PODetail: React.FC<PODetailProps> = ({ 
  purchaseOrderId, 
  onBack, 
  onEdit,
  onDelete 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'items'>('details');
  const [processingStockMovements, setProcessingStockMovements] = useState(false);
  const [stockMovementSuccess, setStockMovementSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadPurchaseOrder = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await getPurchaseOrderWithItems(purchaseOrderId);
        if (!result) {
          setError('Purchase order not found');
          return;
        }
        
        setPurchaseOrder(result.purchaseOrder);
        setItems(result.items);
      } catch (err) {
        setError(`Failed to load purchase order: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadPurchaseOrder();
  }, [purchaseOrderId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) {
      return;
    }
    
    setLoading(true);
    try {
      await deletePurchaseOrder(purchaseOrderId);
      if (onDelete) {
        onDelete(purchaseOrderId);
      } else {
        onBack();
      }
    } catch (err) {
      setError(`Failed to delete purchase order: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ordered':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'received':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partially_received':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ordered':
        return <Clock className="h-5 w-5 mr-2" />;
      case 'partially_received':
        return <AlertCircle className="h-5 w-5 mr-2" />;
      case 'received':
        return <CheckCircle className="h-5 w-5 mr-2" />;
      default:
        return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleProcessStockMovements = async () => {
    try {
      if (!purchaseOrder) {
        setError('Purchase order not found');
        return;
      }
      
      setProcessingStockMovements(true);
      await processPurchaseOrderStockMovements(purchaseOrder, items);
      setStockMovementSuccess(`Stock movements created for purchase order #${purchaseOrder.reference_number}`);
      
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
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading purchase order details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium mb-2">Error</h3>
        <p>{error}</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors inline-flex items-center"
        >
          <ArrowLeft size={16} className="mr-2" /> Go Back
        </button>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase order not found</h3>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors inline-flex items-center"
        >
          <ArrowLeft size={16} className="mr-2" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-3 text-gray-500 hover:text-gray-700 transition-colors"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold">Purchase Order #{purchaseOrder.reference_number}</h2>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors flex items-center"
            title="Print Purchase Order"
          >
            <Printer size={16} className="mr-1" /> Print
          </button>
          
          {onEdit && (
            <button
              onClick={() => onEdit(purchaseOrderId)}
              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors flex items-center"
            >
              <Edit size={16} className="mr-1" /> Edit
            </button>
          )}
          
          <button
            onClick={handleDelete}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center"
          >
            <Trash2 size={16} className="mr-1" /> Delete
          </button>
          
          <button
            onClick={handleProcessStockMovements}
            disabled={processingStockMovements || purchaseOrder.status === 'ordered'}
            className={`px-3 py-1 rounded text-white ${
              purchaseOrder.status === 'ordered' 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            title={purchaseOrder.status === 'ordered' ? 'Cannot create stock movements for ordered POs' : 'Create stock movements'}
          >
            <div className="flex items-center">
              <BarChart2 size={16} className="mr-1" />
              <span>Create Stock Movements</span>
            </div>
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center mb-6">
          <div className={`flex items-center px-4 py-2 rounded-full border ${getStatusBadgeClass(purchaseOrder.status)}`}>
            {getStatusIcon(purchaseOrder.status)}
            <span className="font-medium">{formatStatus(purchaseOrder.status)}</span>
          </div>
          <div className="ml-auto text-xl font-bold">
            Total: ${purchaseOrder.total_amount.toFixed(2)}
          </div>
        </div>
        
        {(purchaseOrder.status === 'received' || purchaseOrder.status === 'partially_received') && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-center">
            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Important: Don't forget to click "Create Stock Movements"</p>
              <p className="text-sm">This step is required to update inventory and add products to the expiry tracking system.</p>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <div className="flex border-b">
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('details')}
            >
              Order Details
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'items' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('items')}
            >
              Items ({items.length})
            </button>
          </div>
        </div>
        
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Order Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500">Reference Number</div>
                  <div className="font-medium">{purchaseOrder.reference_number}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Date</div>
                  <div className="font-medium">{format(new Date(purchaseOrder.date), 'MMMM d, yyyy')}</div>
                </div>
                {purchaseOrder.expiry_date && (
                  <div>
                    <div className="text-xs text-gray-500">Expiry Date</div>
                    <div className="font-medium">{format(new Date(purchaseOrder.expiry_date), 'MMMM d, yyyy')}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">Payment Method</div>
                  <div className="font-medium">{purchaseOrder.payment_method}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Created</div>
                  <div className="font-medium">{format(new Date(purchaseOrder.created_at), 'MMMM d, yyyy h:mm a')}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Supplier Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500">Supplier Name</div>
                  <div className="font-medium">{purchaseOrder.supplier_name}</div>
                </div>
                {purchaseOrder.notes && (
                  <div>
                    <div className="text-xs text-gray-500">Notes</div>
                    <div className="text-sm">{purchaseOrder.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'items' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch #
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                      No items in this purchase order.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.sku || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.product_name}</div>
                        {item.notes && <div className="text-xs text-gray-500">{item.notes}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.batch_number ? (
                            <>
                              <Tag className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-900">{item.batch_number}</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.expiry_date ? (
                            <>
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-900">
                                {format(new Date(item.expiry_date), 'MMM d, yyyy')}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{item.quantity}</div>
                        {item.quantity_received !== undefined && (
                          <div className="text-xs text-gray-500">
                            Received: {item.quantity_received}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          ${item.unit_price ? item.unit_price.toFixed(2) : '0.00'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          ${item.total_price ? item.total_price.toFixed(2) : '0.00'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={6} className="px-4 py-3 text-right font-medium text-gray-700">
                    Total:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    ${purchaseOrder.total_amount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        
        {stockMovementSuccess && (
          <div className="mt-4 p-2 bg-green-100 text-green-700 rounded flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {stockMovementSuccess}
          </div>
        )}
      </div>
    </div>
  );
};

export default PODetail; 