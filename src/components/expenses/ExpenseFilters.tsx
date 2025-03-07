import React from 'react';
import { Filter, Search } from 'lucide-react';
import { ExpenseCategory } from '../../types';
import CategorySelector from './CategorySelector';

interface ExpenseFiltersProps {
  categories: ExpenseCategory[];
  selectedCategory: string | null;
  searchTerm: string;
  onCategoryChange: (category: string | null) => void;
  onSearchChange: (search: string) => void;
}

const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  categories,
  selectedCategory,
  searchTerm,
  onCategoryChange,
  onSearchChange
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-full md:w-64">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Filter by Category
          </label>
          <CategorySelector
            categories={categories}
            selectedCategory={selectedCategory || ''}
            onChange={(category) => onCategoryChange(category || null)}
            className="w-full"
          />
        </div>
        
        <div className="flex-grow">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="p-2 pl-10 border rounded w-full"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseFilters;