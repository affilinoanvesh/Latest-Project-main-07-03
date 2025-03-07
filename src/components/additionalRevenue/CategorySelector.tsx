import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { AdditionalRevenueCategory } from '../../types';

interface CategorySelectorProps {
  categories: AdditionalRevenueCategory[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onAddCategory: () => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  onAddCategory
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Find the selected category object
  const selectedCategoryObj = categories.find(cat => cat.name === selectedCategory);
  
  // Handle category selection
  const handleCategorySelect = (category: string) => {
    onCategoryChange(category);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <div 
        className="flex items-center justify-between border rounded p-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {selectedCategoryObj && (
            <span 
              className="inline-block w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: selectedCategoryObj.color || '#64748b' }}
            />
          )}
          <span>{selectedCategory || 'Select Category'}</span>
        </div>
        <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
          {categories.map((category, index) => (
            <div 
              key={index}
              className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleCategorySelect(category.name)}
            >
              <span 
                className="inline-block w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: category.color || '#64748b' }}
              />
              <span>{category.name}</span>
            </div>
          ))}
          
          <div 
            className="flex items-center p-2 hover:bg-gray-100 cursor-pointer border-t"
            onClick={(e) => {
              e.stopPropagation();
              onAddCategory();
              setIsOpen(false);
            }}
          >
            <Plus className="w-3 h-3 mr-2 text-indigo-600" />
            <span className="text-indigo-600">Add New Category</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector; 