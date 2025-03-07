import React from 'react';
import { format } from 'date-fns';
import { PurchaseOrder } from '../../types';
import { Eye, Edit, Trash2, ExternalLink, AlertCircle, CheckCircle, Clock, ShoppingBag } from 'lucide-react';

interface POListProps {
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  onViewDetail: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const POList: React.FC<POListProps> = ({ 
  purchaseOrders, 
  loading, 
  onViewDetail,
  onEdit,
  onDelete
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading purchase orders...</span>
      </div>
    );
  }

  if (purchaseOrders.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-blue-100 text-blue-500 mb-4">
          <ShoppingBag size={24} />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Create your first purchase order to start tracking your inventory purchases.
        </p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ordered':
        return <Clock className="h-4 w-4 mr-1.5" />;
      case 'partially_received':
        return <AlertCircle className="h-4 w-4 mr-1.5" />;
      case 'received':
        return <CheckCircle className="h-4 w-4 mr-1.5" />;
      default:
        return null;
    }
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

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reference #
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Supplier
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Amount
            </th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {purchaseOrders.map((po) => (
            <tr 
              key={po.id} 
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onViewDetail(po.id!)}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{po.reference_number}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm text-gray-900">{format(new Date(po.date), 'dd/MM/yyyy')}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm text-gray-900">{po.supplier_name}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(po.status)}`}>
                  {getStatusIcon(po.status)}
                  {formatStatus(po.status)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right">
                <div className="text-sm font-medium text-gray-900">${po.total_amount.toFixed(2)}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetail(po.id!);
                    }}
                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                    title="View Details"
                  >
                    <Eye size={18} />
                  </button>
                  
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(po.id!);
                      }}
                      className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                  )}
                  
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this purchase order?')) {
                          onDelete(po.id!);
                        }
                      }}
                      className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default POList; 