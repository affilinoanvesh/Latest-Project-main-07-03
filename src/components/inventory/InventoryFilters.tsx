import React from 'react';
import { Search, Package, Layers, Box, HelpCircle } from 'lucide-react';
import { Tooltip } from './InventoryUtils';

interface InventoryFiltersProps {
  searchTerm: string;
  stockFilter: 'all' | 'in_stock' | 'out_of_stock';
  productTypeFilter: 'all' | 'simple' | 'variation';
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStockFilterChange: (filter: 'all' | 'in_stock' | 'out_of_stock') => void;
  onProductTypeFilterChange: (filter: 'all' | 'simple' | 'variation') => void;
}

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  searchTerm,
  stockFilter,
  productTypeFilter,
  onSearch,
  onStockFilterChange,
  onProductTypeFilterChange
}) => {
  return (
    <div className="sticky top-0 z-10 bg-gray-100 py-4 mb-4 -mx-6 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={onSearch}
              className="pl-10 pr-4 py-2 border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="ml-2">
              <Tooltip text="Search by product name or SKU" />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Stock Filter */}
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-gray-500" />
              <div className="flex border rounded-md overflow-hidden">
                <button
                  onClick={() => onStockFilterChange('all')}
                  className={`px-3 py-2 text-sm ${stockFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  title="Show all inventory items regardless of stock status"
                >
                  All
                </button>
                <button
                  onClick={() => onStockFilterChange('in_stock')}
                  className={`px-3 py-2 text-sm ${stockFilter === 'in_stock' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  title="Show only items with stock quantity greater than zero"
                >
                  In Stock
                </button>
                <button
                  onClick={() => onStockFilterChange('out_of_stock')}
                  className={`px-3 py-2 text-sm ${stockFilter === 'out_of_stock' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  title="Show only items with zero stock quantity"
                >
                  Out of Stock
                </button>
              </div>
              <div>
                <Tooltip text="Filter inventory by stock availability" />
              </div>
            </div>
            
            {/* Product Type Filter */}
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-gray-500" />
              <div className="flex border rounded-md overflow-hidden">
                <button
                  onClick={() => onProductTypeFilterChange('all')}
                  className={`px-3 py-2 text-sm ${productTypeFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  title="Show all product types"
                >
                  All
                </button>
                <button
                  onClick={() => onProductTypeFilterChange('simple')}
                  className={`px-3 py-2 text-sm ${productTypeFilter === 'simple' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  title="Show only simple products (products without variations)"
                >
                  <Box className="h-3 w-3 inline mr-1" />
                  Simple
                </button>
                <button
                  onClick={() => onProductTypeFilterChange('variation')}
                  className={`px-3 py-2 text-sm ${productTypeFilter === 'variation' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  title="Show only product variations (e.g., different sizes, colors)"
                >
                  <Layers className="h-3 w-3 inline mr-1" />
                  Variations
                </button>
              </div>
              <div>
                <Tooltip text="Filter by product type: simple products or variations (e.g., different sizes, colors)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryFilters; 