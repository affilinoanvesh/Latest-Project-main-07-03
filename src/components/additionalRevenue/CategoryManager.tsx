import React, { useState } from 'react';
import { Trash2, Edit, Check, X } from 'lucide-react';
import { AdditionalRevenueCategory } from '../../types';
import { saveAdditionalRevenueCategory, updateAdditionalRevenueCategory, deleteAdditionalRevenueCategory } from '../../db/operations/additionalRevenue';

interface CategoryManagerProps {
  categories: AdditionalRevenueCategory[];
  onCategoriesUpdated: (categories: AdditionalRevenueCategory[]) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onCategoriesUpdated }) => {
  const [newCategory, setNewCategory] = useState<Partial<AdditionalRevenueCategory>>({
    name: '',
    description: '',
    color: '#64748b',
    is_taxable: true
  });
  
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<AdditionalRevenueCategory>>({});
  
  // Handle input change for new category
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setNewCategory(prev => ({ ...prev, [name]: checked }));
    } else {
      setNewCategory(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle input change for editing category
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditingCategory(prev => ({ ...prev, [name]: checked }));
    } else {
      setEditingCategory(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Add new category
  const handleAddCategory = async () => {
    if (!newCategory.name) return;
    
    try {
      const id = await saveAdditionalRevenueCategory(newCategory as AdditionalRevenueCategory);
      const updatedCategories = [...categories, { ...newCategory, id } as AdditionalRevenueCategory];
      onCategoriesUpdated(updatedCategories);
      
      // Reset form
      setNewCategory({
        name: '',
        description: '',
        color: '#64748b',
        is_taxable: true
      });
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };
  
  // Start editing a category
  const handleStartEdit = (category: AdditionalRevenueCategory) => {
    setEditingCategoryId(category.id || null);
    setEditingCategory({ ...category });
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditingCategory({});
  };
  
  // Save edited category
  const handleSaveEdit = async () => {
    if (!editingCategoryId || !editingCategory.name) return;
    
    try {
      await updateAdditionalRevenueCategory(editingCategoryId, editingCategory);
      
      const updatedCategories = categories.map(cat => 
        cat.id === editingCategoryId ? { ...cat, ...editingCategory } : cat
      );
      
      onCategoriesUpdated(updatedCategories);
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };
  
  // Delete category
  const handleDeleteCategory = async (id: number | undefined) => {
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this category? This will not delete the revenue entries, but they will no longer be associated with this category.')) {
      return;
    }
    
    try {
      await deleteAdditionalRevenueCategory(id);
      const updatedCategories = categories.filter(cat => cat.id !== id);
      onCategoriesUpdated(updatedCategories);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Manage Revenue Categories</h2>
      
      {/* Add new category form */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="text-md font-medium mb-3">Add New Category</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={newCategory.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Category name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center">
              <input
                type="color"
                name="color"
                value={newCategory.color}
                onChange={handleInputChange}
                className="p-1 border rounded mr-2 w-10 h-10"
              />
              <input
                type="text"
                name="color"
                value={newCategory.color}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="#RRGGBB"
              />
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              name="description"
              value={newCategory.description}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Category description"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_taxable"
              checked={newCategory.is_taxable}
              onChange={handleInputChange}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">Taxable</label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Budget (optional)</label>
            <input
              type="number"
              name="budget_monthly"
              value={newCategory.budget_monthly || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={handleAddCategory}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            disabled={!newCategory.name}
          >
            Add Category
          </button>
        </div>
      </div>
      
      {/* Categories list */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxable</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map(category => (
              <tr key={category.id}>
                {editingCategoryId === category.id ? (
                  // Edit mode
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="color"
                        name="color"
                        value={editingCategory.color}
                        onChange={handleEditInputChange}
                        className="p-1 border rounded w-10 h-10"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        name="name"
                        value={editingCategory.name}
                        onChange={handleEditInputChange}
                        className="w-full p-2 border rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        name="description"
                        value={editingCategory.description}
                        onChange={handleEditInputChange}
                        className="w-full p-2 border rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        name="is_taxable"
                        checked={editingCategory.is_taxable}
                        onChange={handleEditInputChange}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        name="budget_monthly"
                        value={editingCategory.budget_monthly || ''}
                        onChange={handleEditInputChange}
                        className="w-full p-2 border rounded"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={handleSaveEdit}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-red-600 hover:text-red-900"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </td>
                  </>
                ) : (
                  // View mode
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className="inline-block w-6 h-6 rounded-full" 
                        style={{ backgroundColor: category.color || '#64748b' }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.is_taxable ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.budget_monthly ? `$${category.budget_monthly.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleStartEdit(category)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoryManager; 