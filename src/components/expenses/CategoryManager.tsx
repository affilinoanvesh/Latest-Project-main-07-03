import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { ExpenseCategory } from '../../types';
import { saveExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '../../db/operations/expenses';

interface CategoryManagerProps {
  categories: ExpenseCategory[];
  onCategoriesUpdated: (categories: ExpenseCategory[]) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onCategoriesUpdated }) => {
  const [newCategory, setNewCategory] = useState<ExpenseCategory>({
    name: '',
    description: '',
    color: '#64748b'
  });
  
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Available colors for categories
  const availableColors = [
    '#4f46e5', // indigo-600
    '#0ea5e9', // sky-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#f43f5e', // rose-500
    '#6366f1', // indigo-500
    '#14b8a6', // teal-500
    '#64748b', // slate-500
  ];
  
  const handleAddCategory = () => {
    setNewCategory({
      name: '',
      description: '',
      color: availableColors[Math.floor(Math.random() * availableColors.length)]
    });
    setEditingCategoryId(null);
    setShowForm(true);
  };
  
  const handleEditCategory = (category: ExpenseCategory) => {
    setNewCategory({
      name: category.name,
      description: category.description || '',
      color: category.color || '#64748b'
    });
    setEditingCategoryId(category.id || null);
    setShowForm(true);
  };
  
  const handleDeleteCategory = async (id: number | undefined) => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this category? This will not delete expenses in this category.')) {
      try {
        await deleteExpenseCategory(id);
        onCategoriesUpdated(categories.filter(c => c.id !== id));
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategoryId) {
        // Update existing category
        await updateExpenseCategory(editingCategoryId, newCategory);
        
        // Update the categories list
        const updatedCategories = categories.map(category => 
          category.id === editingCategoryId ? { ...category, ...newCategory, id: editingCategoryId } : category
        );
        
        onCategoriesUpdated(updatedCategories);
      } else {
        // Add new category
        const id = await saveExpenseCategory(newCategory);
        
        // Add to the categories list
        onCategoriesUpdated([...categories, { ...newCategory, id }]);
      }
      
      // Reset form
      setShowForm(false);
      setEditingCategoryId(null);
      setNewCategory({
        name: '',
        description: '',
        color: '#64748b'
      });
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Expense Categories</h2>
        <button
          onClick={handleAddCategory}
          className="flex items-center text-sm bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </button>
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-md font-medium mb-3">
            {editingCategoryId ? 'Edit Category' : 'Add New Category'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={newCategory.description || ''}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  className="w-10 h-10 border rounded"
                  value={newCategory.color || '#64748b'}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                />
                <div className="flex flex-wrap gap-1">
                  {availableColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className="w-6 h-6 rounded-full border border-gray-300"
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCategory({ ...newCategory, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              {editingCategoryId ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Color
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: category.color || '#64748b' }}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {category.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No categories found. Click "Add Category" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoryManager;