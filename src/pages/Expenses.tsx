import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Upload, Download, Tag } from 'lucide-react';
import DateRangePicker from '../components/common/DateRangePicker';
import { DateRange, Expense, ExpenseCategory } from '../types';
import { 
  getExpenses, 
  getExpenseCategories,
  saveExpenseCategory
} from '../db/operations/expenses';
import ExpenseImportForm from '../components/expenses/ExpenseImportForm';
import CategoryManager from '../components/expenses/CategoryManager';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ExpenseTable from '../components/expenses/ExpenseTable';
import ExpenseSummary from '../components/expenses/ExpenseSummary';
import ExpenseFilters from '../components/expenses/ExpenseFilters';
import { formatNZDate } from '../services/api/utils';

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date()
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New expense form
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Import/Export state
  const [showImportForm, setShowImportForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  // Load expenses and categories
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load expenses for the selected date range
        const expensesData = await getExpenses(dateRange.startDate, dateRange.endDate);
        setExpenses(expensesData);
        
        // Load expense categories
        const categoriesData = await getExpenseCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading expenses data:', error);
        setError('Failed to load expenses data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [dateRange]);
  
  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    // Filter by category
    if (selectedCategory && expense.category !== selectedCategory) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        expense.description.toLowerCase().includes(term) ||
        expense.category.toLowerCase().includes(term) ||
        (expense.reference && expense.reference.toLowerCase().includes(term)) ||
        (expense.payment_method && expense.payment_method.toLowerCase().includes(term))
      );
    }
    
    return true;
  });
  
  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Handle expense updates (add, edit, delete)
  const handleExpensesUpdated = (updatedExpenses: Expense[]) => {
    setExpenses(updatedExpenses);
  };
  
  // Handle import success
  const handleImportSuccess = (result: { imported: number, skipped: number }) => {
    // Reload expenses
    const loadExpenses = async () => {
      const expensesData = await getExpenses(dateRange.startDate, dateRange.endDate);
      setExpenses(expensesData);
    };
    
    loadExpenses();
    
    // Show success message
    alert(`Import completed: ${result.imported} expenses imported, ${result.skipped} skipped.`);
  };
  
  // Handle export
  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Date', 'Category', 'Amount', 'Description', 'Reference', 'Payment Method', 'Period'];
    
    const rows = filteredExpenses.map(expense => [
      formatNZDate(new Date(expense.date)),
      expense.category,
      expense.amount.toFixed(2),
      expense.description,
      expense.reference || '',
      expense.payment_method || '',
      expense.period || 'monthly'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses_${format(dateRange.startDate, 'yyyy-MM-dd')}_to_${format(dateRange.endDate, 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // Handle edit expense
  const handleEditExpense = (expense: Expense) => {
    if (expense.id !== undefined) {
      setEditingExpenseId(expense.id);
    }
    setEditingExpense(expense);
    
    // Scroll to the form
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    setShowForm(true);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Expenses</h1>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
          
          <button
            onClick={() => {
              setEditingExpenseId(null);
              setEditingExpense(null);
              setShowForm(true);
            }}
            className="flex items-center text-sm bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Expense
          </button>
          
          <button
            onClick={() => setShowImportForm(true)}
            className="flex items-center text-sm bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
          >
            <Upload className="h-4 w-4 mr-1" />
            Import
          </button>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </button>
          
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center text-sm bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700"
          >
            <Tag className="h-4 w-4 mr-1" />
            Categories
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      {/* Import Form */}
      {showImportForm && (
        <ExpenseImportForm 
          categories={categories}
          onClose={() => setShowImportForm(false)}
          onSuccess={handleImportSuccess}
        />
      )}
      
      {/* Category Manager */}
      {showCategoryManager && (
        <div className="mb-6">
          <CategoryManager 
            categories={categories}
            onCategoriesUpdated={setCategories}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowCategoryManager(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Expense Form */}
      {showForm && (
        <ExpenseForm
          categories={categories}
          expenses={expenses}
          editingExpenseId={editingExpenseId}
          editingExpense={editingExpense}
          onExpensesUpdated={handleExpensesUpdated}
          onClose={() => {
            setShowForm(false);
            setEditingExpenseId(null);
            setEditingExpense(null);
          }}
          onCategoryAdded={(category) => {
            setCategories([...categories, category]);
          }}
        />
      )}
      
      {/* Filters */}
      <ExpenseFilters
        categories={categories}
        selectedCategory={selectedCategory}
        searchTerm={searchTerm}
        onCategoryChange={setSelectedCategory}
        onSearchChange={setSearchTerm}
      />
      
      {/* Summary */}
      <ExpenseSummary
        totalExpenses={totalExpenses}
        expenseCount={filteredExpenses.length}
      />
      
      {/* Expenses Table */}
      <ExpenseTable
        expenses={filteredExpenses}
        categories={categories}
        onEdit={handleEditExpense}
        onExpensesUpdated={handleExpensesUpdated}
      />
    </div>
  );
};

export default Expenses;