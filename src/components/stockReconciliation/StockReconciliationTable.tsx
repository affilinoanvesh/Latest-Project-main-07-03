import React, { useState } from 'react';
import { StockReconciliationSummary } from '../../types';
import { formatNZDate } from '../../utils/dateUtils';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Plus } from 'lucide-react';

interface StockReconciliationTableProps {
  data: StockReconciliationSummary[];
  onViewMovements: (sku: string) => void;
  onReconcile: (sku: string) => void;
  onAddAdjustment: (sku: string) => void;
}

const StockReconciliationTable: React.FC<StockReconciliationTableProps> = ({
  data,
  onViewMovements,
  onReconcile,
  onAddAdjustment
}) => {
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof StockReconciliationSummary>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                className="flex items-center focus:outline-none"
                onClick={() => handleSort('sku')}
              >
                SKU {renderSortIndicator('sku')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                className="flex items-center focus:outline-none"
                onClick={() => handleSort('product_name')}
              >
                Product {renderSortIndicator('product_name')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                className="flex items-center focus:outline-none"
                onClick={() => handleSort('initial_stock')}
              >
                Initial Stock {renderSortIndicator('initial_stock')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                className="flex items-center focus:outline-none"
                onClick={() => handleSort('total_sales')}
              >
                Sales {renderSortIndicator('total_sales')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                className="flex items-center focus:outline-none"
                onClick={() => handleSort('total_adjustments')}
              >
                Adjustments {renderSortIndicator('total_adjustments')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                className="flex items-center focus:outline-none"
                onClick={() => handleSort('total_purchases')}
              >
                Purchases {renderSortIndicator('total_purchases')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                className="flex items-center focus:outline-none"
                onClick={() => handleSort('expected_stock')}
              >
                Expected Stock {renderSortIndicator('expected_stock')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                className="flex items-center focus:outline-none"
                onClick={() => handleSort('actual_stock')}
              >
                Actual Stock {renderSortIndicator('actual_stock')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                className="flex items-center focus:outline-none"
                onClick={() => handleSort('discrepancy')}
              >
                Discrepancy {renderSortIndicator('discrepancy')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                className="flex items-center focus:outline-none"
                onClick={() => handleSort('last_reconciled')}
              >
                Last Reconciled {renderSortIndicator('last_reconciled')}
              </button>
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedData.map((item) => (
            <React.Fragment key={item.sku}>
              <tr 
                className={`hover:bg-gray-50 ${Math.abs(item.discrepancy) > 0 ? 'bg-red-50' : ''}`}
              >
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.sku}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {item.product_name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {item.initial_stock}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {item.total_sales}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {item.total_adjustments}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {item.total_purchases}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {item.expected_stock}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {item.actual_stock}
                </td>
                <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${item.discrepancy === 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                  {item.discrepancy !== 0 && (
                    <AlertTriangle className="inline-block ml-1 h-4 w-4" />
                  )}
                  {item.discrepancy === 0 && (
                    <CheckCircle className="inline-block ml-1 h-4 w-4" />
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {item.last_reconciled ? formatNZDate(item.last_reconciled) : 'Never'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onViewMovements(item.sku)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View History
                    </button>
                    <button
                      onClick={() => onReconcile(item.sku)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Reconcile
                    </button>
                    <button
                      onClick={() => onAddAdjustment(item.sku)}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adjust
                    </button>
                  </div>
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StockReconciliationTable; 