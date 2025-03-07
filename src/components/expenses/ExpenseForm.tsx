import React, { useState, useEffect } from 'react';
import { DollarSign, Tag } from 'lucide-react';
import { Expense, ExpenseCategory } from '../../types';
import { saveExpense, updateExpense, saveExpenseCategory } from '../../db/operations/expenses';
import { format } from 'date-fns';
import CategorySelector from './CategorySelector';

interface ExpenseFormProps {
  categories: ExpenseCategory[];
  expenses: Expense[];
  editingExpenseId: number | null;
  editingExpense: Expense | null;
  onExpensesUpdated: (expenses: Expense[]) => void;
  onClose: () => void;
  onCategoryAdded: (category: ExpenseCategory) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  categories,
  expenses,
  editingExpenseId,
  editingExpense,
  onExpensesUpdated,
  onClose,
  onCategoryAdded
}) => {
  const [newExpense, setNewExpense] = useState<Expense>({
    date: new Date(),
    category: categories.length > 0 ? categories[0].name : '',
    amount: 0,
    description: '',
    period: 'monthly',
    reference: '',
    payment_method: ''
  });
  
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#64748b');

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

  // Load expense data if editing
  useEffect(() => {
    if (editingExpenseId && editingExpense) {
      setNewExpense({
        date: new Date(editingExpense.date),
        category: editingExpense.category,
        amount: editingExpense.amount,
        description: editingExpense.description,
        period: editingExpense.period || 'monthly',
        reference: editingExpense.reference || '',
        payment_method: editingExpense.payment_method || ''
      });
    }
  }, [editingExpenseId, editingExpense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingExpenseId) {
        // Update existing expense
        await updateExpense(editingExpenseId, newExpense);
        
        // Update the expenses list
        onExpensesUpdated(expenses.map(expense => 
          expense.id === editingExpenseId ? { ...newExpense, id: editingExpenseId } : expense
        ));
      } else {
        // Add new expense
        const id = await saveExpense(newExpense);
        
        // Add to the expenses list
        onExpensesUpdated([...expenses, { ...newExpense, id }]);
        
        // Add new category if it doesn't exist
        if (newExpense.category && !categories.some(c => c.name === newExpense.category)) {
          const categoryId = await saveExpenseCategory({
            name: newExpense.category,
            description: '',
            color: '#64748b'
          });
          
          onCategoryAdded({
            id: categoryId,
            name: newExpense.category,
            color: '#64748b'
          });
        }
      }
      
      // Close the form
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const categoryId = await saveExpenseCategory({
        name: newCategoryName,
        description: '',
        color: newCategoryColor
      });
      
      onCategoryAdded({
        id: categoryId,
        name: newCategoryName,
        color: newCategoryColor
      });

      // Update the expense with the new category
      setNewExpense({
        ...newExpense,
        category: newCategoryName
      });

      // Reset the new category form
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (error) {
      console.error('Error adding new category:', error);
      alert('Failed to add new category');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">
        {editingExpenseId ? 'Edit Expense' : 'Add New Expense'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={format(new Date(newExpense.date), 'yyyy-MM-dd')}
              onChange={(e) => setNewExpense({
                ...newExpense,
                date: new Date(e.target.value)
              })}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full pl-10 p-2 border rounded"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({
                  ...newExpense,
                  amount: parseFloat(e.target.value) ||  0
                })}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            {showNewCategoryInput ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    className="flex-grow p-2 border rounded"
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex items-center space-x-1">
                    {availableColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full border ${newCategoryColor === color ? 'border-black' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewCategoryColor(color)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowNewCategoryInput(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    onClick={handleAddNewCategory}
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <CategorySelector
                categories={categories}
                selectedCategory={newExpense.category}
                onChange={(category) => setNewExpense({
                  ...newExpense,
                  category
                })}
                onAddCategory={() => setShowNewCategoryInput(true)}
              />
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={newExpense.description}
              onChange={(e) => setNewExpense({
                ...newExpense,
                description: e.target.value
              })}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={newExpense.reference || ''}
              onChange={(e) => setNewExpense({
                ...newExpense,
                reference: e.target.value
              })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={newExpense.payment_method || ''}
              onChange={(e) => setNewExpense({
                ...newExpense,
                payment_method: e.target.value
              })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period Type
            </label>
            <select
              className="w-full p-2 border rounded"
              value={newExpense.period || 'monthly'}
              onChange={(e) => setNewExpense({
                ...newExpense,
                period: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly'
              })}
              required
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How often this expense occurs. Used for reporting and forecasting.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {editingExpenseId ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;