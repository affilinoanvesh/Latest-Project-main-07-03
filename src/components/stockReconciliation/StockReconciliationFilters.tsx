import React from 'react';
import { Search } from 'lucide-react';

interface StockReconciliationFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  discrepancyFilter: 'all' | 'with_discrepancy' | 'no_discrepancy';
  setDiscrepancyFilter: (filter: 'all' | 'with_discrepancy' | 'no_discrepancy') => void;
}

const StockReconciliationFilters: React.FC<StockReconciliationFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  discrepancyFilter,
  setDiscrepancyFilter
}) => {
  return (
    <div className="p-2 border-b">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
        <div className="relative w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search className="h-3 w-3 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by SKU or name"
            className="pl-7 pr-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-48 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-600">Filter:</span>
          <select
            value={discrepancyFilter}
            onChange={(e) => setDiscrepancyFilter(e.target.value as any)}
            className="border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
          >
            <option value="all">All Items</option>
            <option value="with_discrepancy">With Discrepancy</option>
            <option value="no_discrepancy">No Discrepancy</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default StockReconciliationFilters; 