import React, { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import { AdditionalRevenue, AdditionalRevenueCategory } from '../../types';
import { deleteAdditionalRevenue } from '../../db/operations/additionalRevenue';
import { formatNZDate } from '../../services/api/utils';

interface RevenueTableProps {
  revenues: AdditionalRevenue[];
  categories: AdditionalRevenueCategory[];
  onEdit: (revenue: AdditionalRevenue) => void;
  onRevenuesUpdated: (revenues: AdditionalRevenue[]) => void;
}

const RevenueTable: React.FC<RevenueTableProps> = ({
  revenues,
  categories,
  onEdit,
  onRevenuesUpdated
}) => {
  const [sortField, setSortField] = useState<keyof AdditionalRevenue>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Handle sort
  const handleSort = (field: keyof AdditionalRevenue) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Handle delete
  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this revenue entry?')) {
      return;
    }
    
    try {
      await deleteAdditionalRevenue(id);
      const updatedRevenues = revenues.filter(revenue => revenue.id !== id);
      onRevenuesUpdated(updatedRevenues);
    } catch (error) {
      console.error('Error deleting revenue:', error);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  };
  
  // Get category color
  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.color || '#64748b';
  };
  
  // Sort revenues
  const sortedRevenues = [...revenues].sort((a, b) => {
    if (sortField === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    if (sortField === 'amount') {
      return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    
    const aValue = a[sortField] as string;
    const bValue = b[sortField] as string;
    
    return sortDirection === 'asc' 
      ? aValue.localeCompare(bValue) 
      : bValue.localeCompare(aValue);
  });
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('date')}
            >
              Date
              {sortField === 'date' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('category')}
            >
              Category
              {sortField === 'category' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('description')}
            >
              Description
              {sortField === 'description' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('amount')}
            >
              Amount
              {sortField === 'amount' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('period')}
            >
              Period
              {sortField === 'period' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('reference')}
            >
              Reference
              {sortField === 'reference' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedRevenues.map(revenue => (
            <tr key={revenue.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatNZDate(new Date(revenue.date))}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: getCategoryColor(revenue.category) }}
                  />
                  <span className="text-sm font-medium text-gray-900">{revenue.category}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {revenue.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatCurrency(revenue.amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {revenue.period ? revenue.period.charAt(0).toUpperCase() + revenue.period.slice(1) : 'One-time'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {revenue.reference || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button
                  onClick={() => onEdit(revenue)}
                  className="text-indigo-600 hover:text-indigo-900 mr-3"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(revenue.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
          
          {revenues.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                No revenue entries found. Add a new entry to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RevenueTable; 