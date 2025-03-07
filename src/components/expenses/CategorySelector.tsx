import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { ExpenseCategory } from '../../types';

interface CategorySelectorProps {
  categories: ExpenseCategory[];
  selectedCategory: string;
  onChange: (category: string) => void;
  onAddCategory?: () => void;
  className?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onChange,
  onAddCategory,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter categories based on search term
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get the selected category object
  const selectedCategoryObj = categories.find(c => c.name === selectedCategory);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    setSearchTerm('');
  };

  const handleSelectCategory = (category: string) => {
    onChange(category);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleAddNewCategory = () => {
    if (onAddCategory) {
      onAddCategory();
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected category display */}
      <div
        className="flex items-center justify-between w-full p-2 border rounded-md cursor-pointer bg-white hover:bg-gray-50"
        onClick={handleToggleDropdown}
      >
        <div className="flex items-center">
          {selectedCategoryObj && (
            <div 
              className="w-4 h-4 rounded-full mr-2" 
              style={{ backgroundColor: selectedCategoryObj.color || '#64748b' }}
            />
          )}
          <span className="text-gray-700 truncate">
            {selectedCategory || 'Select a category'}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Search input */}
          <div className="sticky top-0 bg-white p-2 border-b">
            <input
              ref={searchInputRef}
              type="text"
              className="w-full p-2 border rounded-md text-sm"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category list */}
          <div className="py-1">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                    selectedCategory === category.name ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => handleSelectCategory(category.name)}
                >
                  <div 
                    className="w-4 h-4 rounded-full mr-2" 
                    style={{ backgroundColor: category.color || '#64748b' }}
                  />
                  <span className="flex-grow">{category.name}</span>
                  {selectedCategory === category.name && (
                    <Check className="h-4 w-4 text-indigo-600" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No categories found</div>
            )}
          </div>

          {/* Add new category button */}
          {onAddCategory && (
            <div 
              className="flex items-center px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 cursor-pointer border-t"
              onClick={handleAddNewCategory}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Add new category</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySelector;