import React from 'react';
import { AdditionalRevenueCategory } from '../../types';

interface RevenueFiltersProps {
  categories: AdditionalRevenueCategory[];
  selectedCategory: string | null;
  searchTerm: string;
  onCategoryChange: (category: string | null) => void;
  onSearchChange: (search: string) => void;
}

const RevenueFilters: React.FC<RevenueFiltersProps> = ({
  categories,
  selectedCategory,
  searchTerm,
  onCategoryChange,
  onSearchChange
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Category
          </label>
          <select
            value={selectedCategory || ''}
            onChange={(e) => onCategoryChange(e.target.value || null)}
            className="w-full p-2 border rounded"
          >
            <option value="">All Categories</option>
            {categories.map((category, index) => (
              <option key={index} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Search by description, reference, etc."
          />
        </div>
      </div>
    </div>
  );
};

export default RevenueFilters; 