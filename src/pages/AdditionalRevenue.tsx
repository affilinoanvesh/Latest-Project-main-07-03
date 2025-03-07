import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Upload, Download, Tag } from 'lucide-react';
import DateRangePicker from '../components/DateRangePicker';
import { DateRange, AdditionalRevenue, AdditionalRevenueCategory } from '../types';
import { 
  getAdditionalRevenue, 
  getAdditionalRevenueCategories,
  saveAdditionalRevenueCategory
} from '../db/operations/additionalRevenue';
import CategoryManager from '../components/additionalRevenue/CategoryManager';
import RevenueForm from '../components/additionalRevenue/RevenueForm';
import RevenueTable from '../components/additionalRevenue/RevenueTable';
import RevenueSummary from '../components/additionalRevenue/RevenueSummary';
import RevenueFilters from '../components/additionalRevenue/RevenueFilters';
import { formatNZDate } from '../services/api/utils';

const AdditionalRevenuePage: React.FC = () => {
  const [revenues, setRevenues] = useState<AdditionalRevenue[]>([]);
  const [categories, setCategories] = useState<AdditionalRevenueCategory[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date()
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New revenue form
  const [showForm, setShowForm] = useState(false);
  const [editingRevenueId, setEditingRevenueId] = useState<number | null>(null);
  const [editingRevenue, setEditingRevenue] = useState<AdditionalRevenue | null>(null);
  
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Category manager state
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  // Load revenues and categories
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load revenues for the selected date range
        const revenuesData = await getAdditionalRevenue(dateRange.startDate, dateRange.endDate);
        setRevenues(revenuesData);
        
        // Load revenue categories
        const categoriesData = await getAdditionalRevenueCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading additional revenue data:', error);
        setError('Failed to load additional revenue data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [dateRange]);
  
  // Filter revenues
  const filteredRevenues = revenues.filter(revenue => {
    // Filter by category
    if (selectedCategory && revenue.category !== selectedCategory) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        revenue.description.toLowerCase().includes(term) ||
        revenue.category.toLowerCase().includes(term) ||
        (revenue.reference && revenue.reference.toLowerCase().includes(term)) ||
        (revenue.payment_method && revenue.payment_method.toLowerCase().includes(term))
      );
    }
    
    return true;
  });
  
  // Calculate totals
  const totalRevenue = filteredRevenues.reduce((sum, revenue) => sum + revenue.amount, 0);
  
  // Handle revenue updates (add, edit, delete)
  const handleRevenuesUpdated = (updatedRevenues: AdditionalRevenue[]) => {
    setRevenues(updatedRevenues);
  };
  
  // Handle edit revenue
  const handleEditRevenue = (revenue: AdditionalRevenue) => {
    setEditingRevenueId(revenue.id || null);
    setEditingRevenue(revenue);
    
    // Scroll to the form
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    setShowForm(true);
  };
  
  // Handle export
  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Date', 'Category', 'Amount', 'Description', 'Reference', 'Payment Method', 'Period', 'Tax Included'];
    
    const rows = filteredRevenues.map(revenue => [
      formatNZDate(new Date(revenue.date)),
      revenue.category,
      revenue.amount.toFixed(2),
      revenue.description,
      revenue.reference || '',
      revenue.payment_method || '',
      revenue.period || 'one-time',
      revenue.tax_included ? 'Yes' : 'No'
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
    link.download = `additional_revenue_${format(dateRange.startDate, 'yyyy-MM-dd')}_to_${format(dateRange.endDate, 'yyyy-MM-dd')}.csv`;
    link.click();
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
        <h1 className="text-2xl font-bold">Additional Revenue</h1>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
          
          <button
            onClick={() => {
              setEditingRevenueId(null);
              setEditingRevenue(null);
              setShowForm(true);
            }}
            className="flex items-center text-sm bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Revenue
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
      
      {/* Revenue Form */}
      {showForm && (
        <RevenueForm
          categories={categories}
          revenues={revenues}
          editingRevenueId={editingRevenueId}
          editingRevenue={editingRevenue}
          onRevenuesUpdated={handleRevenuesUpdated}
          onClose={() => {
            setShowForm(false);
            setEditingRevenueId(null);
            setEditingRevenue(null);
          }}
          onCategoryAdded={(category) => {
            setCategories([...categories, category]);
          }}
        />
      )}
      
      {/* Revenue Filters */}
      <RevenueFilters
        categories={categories}
        selectedCategory={selectedCategory}
        searchTerm={searchTerm}
        onCategoryChange={setSelectedCategory}
        onSearchChange={setSearchTerm}
      />
      
      {/* Revenue Summary */}
      <RevenueSummary
        totalRevenue={totalRevenue}
        revenueCount={filteredRevenues.length}
        categories={categories}
        revenues={filteredRevenues}
      />
      
      {/* Revenue Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Revenue Entries</h2>
        <RevenueTable
          revenues={filteredRevenues}
          categories={categories}
          onEdit={handleEditRevenue}
          onRevenuesUpdated={handleRevenuesUpdated}
        />
      </div>
    </div>
  );
};

export default AdditionalRevenuePage; 