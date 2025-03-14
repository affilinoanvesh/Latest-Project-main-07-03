import React, { useState, useRef, useEffect } from 'react';
import { StockReconciliationSummary } from '../../types';
import { formatNZDate } from '../../utils/dateUtils';
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  History, 
  BarChart2, 
  Edit,
  MoreHorizontal,
  FileText
} from 'lucide-react';

interface StockReconciliationTableProps {
  data: StockReconciliationSummary[];
  onViewMovements: (sku: string) => void;
  onReconcile: (sku: string) => void;
  onAddAdjustment: (sku?: string) => void;
  onViewReconciliationHistory: (sku: string) => void;
  loading?: boolean;
  isFiltered?: boolean;
}

const StockReconciliationTable: React.FC<StockReconciliationTableProps> = ({
  data,
  onViewMovements,
  onReconcile,
  onAddAdjustment,
  onViewReconciliationHistory,
  loading = false,
  isFiltered = false
}) => {
  const [sortField, setSortField] = useState<keyof StockReconciliationSummary>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close action menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle sort
  const handleSort = (field: keyof StockReconciliationSummary) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === undefined) return sortDirection === 'asc' ? -1 : 1;
    if (bValue === undefined) return sortDirection === 'asc' ? 1 : -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  // Render sort indicator
  const renderSortIndicator = (field: keyof StockReconciliationSummary) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Toggle action menu
  const toggleActionMenu = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenActionMenu(openActionMenu === sku ? null : sku);
  };

  return (
    <div className="overflow-x-auto rounded-lg">
      {loading ? (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">Loading data...</h3>
          <p className="text-xs text-gray-500">Please wait while we fetch the data.</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No data available</h3>
          <p className="text-xs text-gray-500">
            {isFiltered 
              ? 'No items match your search criteria. Try adjusting your filters.' 
              : 'Click the "Refresh from Server" button above to load stock reconciliation data.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-w-full scrollbar-thin">
          <table className="w-full divide-y divide-gray-200 border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-20 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('sku')}
                  >
                    <span className="hidden sm:inline">SKU</span>
                    <span className="sm:hidden">ID</span> {renderSortIndicator('sku')}
                  </button>
                </th>
                <th className="w-32 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('product_name')}
                  >
                    <span className="hidden sm:inline">Product</span>
                    <span className="sm:hidden">Prod</span> {renderSortIndicator('product_name')}
                  </button>
                </th>
                <th className="w-16 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('initial_stock')}
                  >
                    <span className="hidden sm:inline">Init</span>
                    <span className="sm:hidden">In</span> {renderSortIndicator('initial_stock')}
                  </button>
                </th>
                <th className="w-16 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('total_sales')}
                  >
                    <span className="hidden sm:inline">Sales</span>
                    <span className="sm:hidden">Sl</span> {renderSortIndicator('total_sales')}
                  </button>
                </th>
                <th className="w-16 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('total_adjustments')}
                  >
                    Adj {renderSortIndicator('total_adjustments')}
                  </button>
                </th>
                <th className="w-16 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('total_purchases')}
                  >
                    Purch {renderSortIndicator('total_purchases')}
                  </button>
                </th>
                <th className="w-16 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('expected_stock')}
                  >
                    Exp {renderSortIndicator('expected_stock')}
                  </button>
                </th>
                <th className="w-16 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('actual_stock')}
                  >
                    Act {renderSortIndicator('actual_stock')}
                  </button>
                </th>
                <th className="w-20 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('discrepancy')}
                  >
                    Disc {renderSortIndicator('discrepancy')}
                  </button>
                </th>
                <th className="w-24 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('last_reconciled')}
                  >
                    Last Rec {renderSortIndicator('last_reconciled')}
                  </button>
                </th>
                <th className="w-12 px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item) => (
                <tr 
                  key={item.sku}
                  className={`hover:bg-gray-50 ${Math.abs(item.discrepancy) > 0 ? 'bg-red-50' : ''}`}
                >
                  <td className="px-1 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                    {item.sku}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-500 truncate max-w-[120px]" title={item.product_name}>
                    {item.product_name}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-500">
                    {item.initial_stock}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-500">
                    {item.total_sales}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-500">
                    {item.total_adjustments}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-500">
                    {item.total_purchases}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-500">
                    {item.expected_stock}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-500">
                    {item.actual_stock}
                  </td>
                  <td className={`px-1 py-2 whitespace-nowrap text-xs font-medium ${item.discrepancy === 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                    {item.discrepancy !== 0 && (
                      <AlertTriangle className="inline-block ml-1 h-3 w-3" />
                    )}
                    {item.discrepancy === 0 && (
                      <CheckCircle className="inline-block ml-1 h-3 w-3" />
                    )}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-500">
                    {item.last_reconciled ? formatNZDate(item.last_reconciled) : 'Never'}
                  </td>
                  <td className="px-1 py-2 whitespace-nowrap text-xs text-gray-500 relative">
                    <button
                      onClick={(e) => toggleActionMenu(item.sku, e)}
                      className="p-1 rounded-full hover:bg-gray-100"
                      title="Actions"
                    >
                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                    </button>
                    
                    {openActionMenu === item.sku && (
                      <div 
                        ref={actionMenuRef}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border"
                      >
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setOpenActionMenu(null);
                              onViewMovements(item.sku);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            title="View stock movement history"
                          >
                            <History className="mr-2 h-4 w-4" />
                            View Movements
                          </button>
                          <button
                            onClick={() => {
                              setOpenActionMenu(null);
                              onReconcile(item.sku);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            title="Reconcile current stock"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Reconcile
                          </button>
                          <button
                            onClick={() => {
                              setOpenActionMenu(null);
                              onAddAdjustment(item.sku);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            title="Add manual stock adjustment"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Adjustment
                          </button>
                          <button
                            onClick={() => {
                              setOpenActionMenu(null);
                              onViewReconciliationHistory(item.sku);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            title="View reconciliation history and notes"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Reconciliation History
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockReconciliationTable; 