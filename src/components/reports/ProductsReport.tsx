import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../services/reports/utils';

interface ProductsReportProps {
  data: any[];
}

const ProductsReport: React.FC<ProductsReportProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['product-overview', 'product-table']));
  const [sortField, setSortField] = useState<string>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpandedSections = new Set(expandedSections);
    if (newExpandedSections.has(section)) {
      newExpandedSections.delete(section);
    } else {
      newExpandedSections.add(section);
    }
    setExpandedSections(newExpandedSections);
  };
  
  // Handle sort
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Sort product data
  const sortedProductData = [...data].sort((a, b) => {
    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  // Calculate totals
  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  return (
    <>
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('product-overview')}
        >
          <h2 className="text-lg font-semibold text-gray-800">Product Sales Overview</h2>
          {expandedSections.has('product-overview') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('product-overview') && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <p className="text-sm text-indigo-700 font-medium">Total Products Sold</p>
                <p className="text-2xl font-bold text-indigo-800">
                  {data.reduce((sum, item) => sum + item.quantity, 0)}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-700 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className={`${totalProfit >= 0 ? 'bg-teal-50 border-teal-100' : 'bg-red-50 border-red-100'} p-4 rounded-lg border`}>
                <p className={`text-sm font-medium ${totalProfit >= 0 ? 'text-teal-700' : 'text-red-700'}`}>Total Profit</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-teal-800' : 'text-red-800'}`}>
                  {formatCurrency(totalProfit)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mt-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('product-table')}
        >
          <h2 className="text-lg font-semibold text-gray-800">Product Performance</h2>
          {expandedSections.has('product-table') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('product-table') && (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Product
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1 text-gray-700" /> : <ChevronDown className="h-4 w-4 ml-1 text-gray-700" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('sku')}
                  >
                    <div className="flex items-center">
                      SKU
                      {sortField === 'sku' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1 text-gray-700" /> : <ChevronDown className="h-4 w-4 ml-1 text-gray-700" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center">
                      Quantity Sold
                      {sortField === 'quantity' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1 text-gray-700" /> : <ChevronDown className="h-4 w-4 ml-1 text-gray-700" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('revenue')}
                  >
                    <div className="flex items-center">
                      Revenue
                      {sortField === 'revenue' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1 text-gray-700" /> : <ChevronDown className="h-4 w-4 ml-1 text-gray-700" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('cost')}
                  >
                    <div className="flex items-center">
                      Cost
                      {sortField === 'cost' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1 text-gray-700" /> : <ChevronDown className="h-4 w-4 ml-1 text-gray-700" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('profit')}
                  >
                    <div className="flex items-center">
                      Profit
                      {sortField === 'profit' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1 text-gray-700" /> : <ChevronDown className="h-4 w-4 ml-1 text-gray-700" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('margin')}
                  >
                    <div className="flex items-center">
                      Margin
                      {sortField === 'margin' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1 text-gray-700" /> : <ChevronDown className="h-4 w-4 ml-1 text-gray-700" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedProductData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.sku || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {formatCurrency(item.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={item.profit >= 0 ? 'text-teal-600' : 'text-red-600'}>
                        {formatCurrency(item.profit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={item.margin < 0 ? 'text-red-600' : 'text-teal-600'}>
                        {formatPercentage(item.margin)}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {/* Totals row */}
                <tr className="bg-gray-100 font-medium">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-700">
                    {data.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                    {formatCurrency(data.reduce((sum, item) => sum + item.cost, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <span className={totalProfit >= 0 ? 'text-teal-700' : 'text-red-700'}>
                      {formatCurrency(totalProfit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <span className={profitMargin >= 0 ? 'text-teal-700' : 'text-red-700'}>
                      {formatPercentage(profitMargin)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductsReport;