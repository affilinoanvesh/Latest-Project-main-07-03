import React, { useState, useEffect } from 'react';
import { DollarSign, Tag } from 'lucide-react';
import { AdditionalRevenue, AdditionalRevenueCategory } from '../../types';
import { saveAdditionalRevenue, updateAdditionalRevenue, saveAdditionalRevenueCategory } from '../../db/operations/additionalRevenue';
import { format } from 'date-fns';
import CategorySelector from './CategorySelector';

interface RevenueFormProps {
  categories: AdditionalRevenueCategory[];
  revenues: AdditionalRevenue[];
  editingRevenueId: number | null;
  editingRevenue: AdditionalRevenue | null;
  onRevenuesUpdated: (revenues: AdditionalRevenue[]) => void;
  onClose: () => void;
  onCategoryAdded?: (category: AdditionalRevenueCategory) => void;
}

const RevenueForm: React.FC<RevenueFormProps> = ({
  categories,
  revenues,
  editingRevenueId,
  editingRevenue,
  onRevenuesUpdated,
  onClose,
  onCategoryAdded
}) => {
  const [formData, setFormData] = useState<Partial<AdditionalRevenue>>({
    date: new Date(),
    category: categories.length > 0 ? categories[0].name : '',
    amount: 0,
    description: '',
    period: undefined,
    reference: '',
    payment_method: '',
    tax_included: false,
    tags: []
  });
  
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Initialize form with editing data if available
  useEffect(() => {
    if (editingRevenue) {
      setFormData({
        ...editingRevenue,
        date: new Date(editingRevenue.date)
      });
    }
  }, [editingRevenue]);
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'amount') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (name === 'date') {
      setFormData(prev => ({ ...prev, [name]: new Date(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle category change
  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({ ...prev, category }));
    
    // Clear category error
    if (errors.category) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.category;
        return newErrors;
      });
    }
  };
  
  // Handle new category form toggle
  const handleAddCategoryClick = () => {
    setShowNewCategoryForm(true);
  };
  
  // Handle new category input change
  const handleNewCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCategory(e.target.value);
  };
  
  // Handle new category save
  const handleSaveNewCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      // Generate a random color
      const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
      
      const category: AdditionalRevenueCategory = {
        name: newCategory.trim(),
        color: randomColor,
        is_taxable: true
      };
      
      const id = await saveAdditionalRevenueCategory(category);
      const newCategoryWithId = { ...category, id };
      
      // Update form data with new category
      setFormData(prev => ({ ...prev, category: newCategory.trim() }));
      
      // Notify parent component
      if (onCategoryAdded) {
        onCategoryAdded(newCategoryWithId);
      }
      
      // Reset new category form
      setNewCategory('');
      setShowNewCategoryForm(false);
    } catch (error) {
      console.error('Error saving new category:', error);
    }
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    if (!formData.description) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (editingRevenueId) {
        // Update existing revenue
        await updateAdditionalRevenue(editingRevenueId, formData);
        
        // Update the revenues list
        const updatedRevenues = revenues.map(revenue => 
          revenue.id === editingRevenueId ? { ...revenue, ...formData } as AdditionalRevenue : revenue
        );
        
        onRevenuesUpdated(updatedRevenues);
      } else {
        // Add new revenue
        const id = await saveAdditionalRevenue(formData as AdditionalRevenue);
        
        // Add to revenues list
        const newRevenue = { ...formData, id } as AdditionalRevenue;
        onRevenuesUpdated([...revenues, newRevenue]);
      }
      
      // Close the form
      onClose();
    } catch (error) {
      console.error('Error saving revenue:', error);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-lg font-semibold mb-4">
        {editingRevenueId ? 'Edit Revenue' : 'Add New Revenue'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date ? format(formData.date, 'yyyy-MM-dd') : ''}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${errors.date ? 'border-red-500' : ''}`}
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>
          
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            {showNewCategoryForm ? (
              <div className="flex">
                <input
                  type="text"
                  value={newCategory}
                  onChange={handleNewCategoryChange}
                  className="w-full p-2 border rounded"
                  placeholder="New category name"
                />
                <button
                  type="button"
                  onClick={handleSaveNewCategory}
                  className="ml-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryForm(false)}
                  className="ml-2 px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <CategorySelector
                categories={categories}
                selectedCategory={formData.category || ''}
                onCategoryChange={handleCategoryChange}
                onAddCategory={handleAddCategoryClick}
              />
            )}
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>
          
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                name="amount"
                value={formData.amount || ''}
                onChange={handleInputChange}
                className={`w-full pl-10 p-2 border rounded ${errors.amount ? 'border-red-500' : ''}`}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>
          
          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period (Optional)</label>
            <select
              name="period"
              value={formData.period || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          
          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${errors.description ? 'border-red-500' : ''}`}
              placeholder="Description"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
          
          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
            <input
              type="text"
              name="reference"
              value={formData.reference || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Invoice #, Receipt #, etc."
            />
          </div>
          
          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method (Optional)</label>
            <input
              type="text"
              name="payment_method"
              value={formData.payment_method || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Cash, Bank Transfer, etc."
            />
          </div>
          
          {/* Tax Included */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="tax_included"
              checked={formData.tax_included || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Tax Included
            </label>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 mr-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {editingRevenueId ? 'Update Revenue' : 'Add Revenue'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RevenueForm; 