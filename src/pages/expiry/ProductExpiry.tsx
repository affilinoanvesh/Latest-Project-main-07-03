import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Upload, 
  Download, 
  Search, 
  Trash2, 
  Edit, 
  RefreshCw,
  AlertTriangle,
  Clock,
  Layers,
  ChevronDown,
  ChevronRight,
  X,
  FileText,
  Archive,
  RotateCcw,
  Bug
} from 'lucide-react';
import { formatNZDate } from '../../utils/dateUtils';
import { 
  getProductExpiryWithDetails, 
  getProductExpiryByExpiryDate,
  deleteProductExpiry,
  getProductExpiryBySku,
  getTotalQuantityBySku,
  archiveProductExpiry,
  unarchiveProductExpiry
} from '../../db/operations/expiry';
import { ProductExpiry } from '../../types';
import ExpiryUploadModal from '../../components/expiry/ExpiryUploadModal';
import ExpiryFormModal from '../../components/expiry/ExpiryFormModal';
import { supabase } from '../../services/supabase';

// Interface for grouped expiry data
interface GroupedExpiry {
  sku: string;
  product_name: string;
  product_id: number;
  variation_id?: number;
  stock_quantity: number;
  total_quantity: number;
  batches: ProductExpiry[];
  earliest_expiry: Date;
}

const ProductExpiryPage: React.FC = () => {
  const [expiryData, setExpiryData] = useState<ProductExpiry[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedExpiry[]>([]);
  const [expandedSku, setExpandedSku] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState<number | null>(null);
  const [showVariations, setShowVariations] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProductExpiry | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isAddingAdditionalExpiry, setIsAddingAdditionalExpiry] = useState(false);
  const [selectedProductForAdditionalExpiry, setSelectedProductForAdditionalExpiry] = useState<{
    product_id: number;
    variation_id?: number;
    sku: string;
    product_name?: string;
  } | undefined>(undefined);
  const [showDebug, setShowDebug] = useState(false);
  
  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      // Add timestamp to force fresh data fetch
      const timestamp = new Date().getTime();
      const data = await getProductExpiryByExpiryDate(sortOrder === 'asc', timestamp);
      setExpiryData(data);
      
      // Group data by SKU
      const grouped = groupExpiryData(data);
      setGroupedData(grouped);
    } catch (error) {
      console.error('Error loading expiry data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Group expiry data by SKU
  const groupExpiryData = (data: ProductExpiry[]): GroupedExpiry[] => {
    const groupedMap = new Map<string, GroupedExpiry>();
    
    console.log(`Grouping ${data.length} expiry records. Archive status:`, 
      data.map(item => ({
        sku: item.sku, 
        archived: item.archived,
        expiry_date: item.expiry_date
      }))
    );
    
    data.forEach(item => {
      if (!groupedMap.has(item.sku)) {
        groupedMap.set(item.sku, {
          sku: item.sku,
          product_name: item.product_name || 'Unknown Product',
          product_id: item.product_id,
          variation_id: item.variation_id,
          stock_quantity: item.stock_quantity || 0,
          total_quantity: 0,
          batches: [],
          earliest_expiry: new Date(item.expiry_date)
        });
      }
      
      const group = groupedMap.get(item.sku)!;
      group.batches.push(item);
      group.total_quantity += item.quantity;
      
      // Update earliest expiry date
      const itemDate = new Date(item.expiry_date);
      if (itemDate < group.earliest_expiry) {
        group.earliest_expiry = itemDate;
      }
    });
    
    // Convert map to array and sort by earliest expiry date
    return Array.from(groupedMap.values()).sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.earliest_expiry.getTime() - b.earliest_expiry.getTime();
      } else {
        return b.earliest_expiry.getTime() - a.earliest_expiry.getTime();
      }
    });
  };
  
  useEffect(() => {
    loadData();
  }, [sortOrder]);
  
  // Add a useEffect hook to load data when the component mounts
  useEffect(() => {
    loadData();
    
    // Set up an interval to refresh data every 30 seconds
    const intervalId = setInterval(() => {
      loadData();
    }, 30000);
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);
  
  // Toggle expanded state for a SKU
  const toggleExpand = (sku: string) => {
    setExpandedSku(prev => 
      prev.includes(sku) 
        ? prev.filter(s => s !== sku) 
        : [...prev, sku]
    );
  };
  
  // Handle delete
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expiry record?')) {
      try {
        await deleteProductExpiry(id);
        loadData();
      } catch (error) {
        console.error('Error deleting expiry record:', error);
      }
    }
  };
  
  // Handle edit
  const handleEdit = (record: ProductExpiry) => {
    setSelectedRecord(record);
    setIsFormModalOpen(true);
  };

  // Handle adding additional expiry date
  const handleAddAdditionalExpiry = (item: ProductExpiry) => {
    setSelectedProductForAdditionalExpiry({
      product_id: item.product_id,
      variation_id: item.variation_id,
      sku: item.sku,
      product_name: item.product_name
    });
    setIsAddingAdditionalExpiry(true);
    setIsFormModalOpen(true);
  };
  
  // Get color based on days until expiry
  const getExpiryColor = (expiryDate: Date): string => {
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'bg-red-200 text-red-900'; // Already expired
    if (diffDays <= 30) return 'bg-red-100 text-red-800';
    if (diffDays <= 60) return 'bg-orange-100 text-orange-800';
    if (diffDays <= 90) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };
  
  // Filter data based on user selections
  const filteredData = groupedData.filter(group => {
    // Filter by days until expiry
    if (filterDays !== null) {
      const today = new Date();
      const diffTime = group.earliest_expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > filterDays) return false;
    }
    
    // Filter by variations
    if (!showVariations && group.variation_id) return false;
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        group.sku.toLowerCase().includes(term) ||
        group.product_name.toLowerCase().includes(term) ||
        group.batches.some(batch => 
          (batch.batch_number?.toLowerCase().includes(term) || false) ||
          (batch.notes?.toLowerCase().includes(term) || false)
        )
      );
    }
    
    return true;
  });
  
  // Handle delete all batches for a SKU
  const handleDeleteAllBatches = async (sku: string) => {
    if (window.confirm(`Are you sure you want to delete ALL expiry records for ${sku}? This will remove all batches.`)) {
      try {
        // Get all records for this SKU
        const records = await getProductExpiryBySku(sku);
        
        // Delete each record
        for (const record of records) {
          if (record.id) {
            await deleteProductExpiry(record.id);
          }
        }
        
        loadData();
      } catch (error) {
        console.error('Error deleting expiry records:', error);
      }
    }
  };
  
  // Export expiry data to CSV
  const exportToCSV = () => {
    if (expiryData.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = ['SKU', 'Product Name', 'Batch Number', 'Expiry Date', 'Quantity', 'Notes'];
    const csvData = expiryData.map(item => [
      item.sku,
      item.product_name || '',
      item.batch_number || '',
      formatNZDate(new Date(item.expiry_date)),
      item.quantity.toString(),
      item.notes || ''
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `product_expiry_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Generate CSV template for import
  const generateCSVTemplate = () => {
    const headers = ['SKU', 'Batch Number', 'Expiry Date', 'Quantity', 'Notes'];
    const csvContent = headers.join(',');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'product_expiry_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Debug function to check database status
  const checkDatabaseStatus = async () => {
    try {
      // Get all records directly from Supabase
      const { data: allRecords, error } = await supabase
        .from('product_expiry')
        .select('*');
      
      if (error) {
        console.error('Error fetching all records:', error);
        alert(`Error fetching records: ${error.message}`);
        return;
      }
      
      // Count records by archive status
      const archivedCount = allRecords.filter((r: any) => r.archived === true).length;
      const unarchivedCount = allRecords.filter((r: any) => r.archived === false).length;
      const nullArchivedCount = allRecords.filter((r: any) => r.archived === null).length;
      
      console.log('Database status:', {
        total: allRecords.length,
        archived: archivedCount,
        unarchived: unarchivedCount,
        nullArchived: nullArchivedCount,
        records: allRecords
      });
      
      alert(`Database Status:
Total records: ${allRecords.length}
Archived (true): ${archivedCount}
Unarchived (false): ${unarchivedCount}
Null archived: ${nullArchivedCount}

Check console for full details.`);
    } catch (error) {
      console.error('Error checking database status:', error);
      alert(`Error: ${error}`);
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Product Expiry Tracking
            {showDebug && (
              <button
                onClick={checkDatabaseStatus}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                title="Check Database Status"
                style={{ display: 'none' }}
              >
                <Bug size={16} />
              </button>
            )}
          </h1>
          <p className="text-gray-600 text-sm">
            Track and manage products with expiration dates
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <button
            onClick={() => {
              setSelectedRecord(undefined);
              setSelectedProductForAdditionalExpiry(undefined);
              setIsAddingAdditionalExpiry(false);
              setIsFormModalOpen(true);
            }}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Plus size={16} className="mr-1.5" />
            Add Record
          </button>
          
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Upload size={16} className="mr-1.5" />
            Upload CSV
          </button>
          
          <button
            onClick={exportToCSV}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Download size={16} className="mr-1.5" />
            Export CSV
          </button>
          
          <button
            onClick={generateCSVTemplate}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <FileText size={16} className="mr-1.5" />
            CSV Template
          </button>
          
          <button
            onClick={loadData}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className="mr-1.5" />
            Refresh
          </button>
          
          {/* Debug toggle (hidden) */}
          {showDebug && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <Bug size={16} className="mr-1.5" />
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </button>
          )}
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Period
            </label>
            <select 
              className="w-full md:w-auto border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
              value={filterDays === null ? 'all' : filterDays.toString()}
              onChange={(e) => setFilterDays(e.target.value === 'all' ? null : parseInt(e.target.value, 10))}
            >
              <option value="all">All Dates</option>
              <option value="30">Next 30 days</option>
              <option value="60">Next 60 days</option>
              <option value="90">Next 90 days</option>
            </select>
          </div>
          
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Show Variations
            </label>
            <select 
              className="w-full md:w-auto border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              value={showVariations ? 'yes' : 'no'}
              onChange={(e) => setShowVariations(e.target.value === 'yes')}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By Expiry
            </label>
            <select 
              className="w-full md:w-auto border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <option value="asc">Earliest First</option>
              <option value="desc">Latest First</option>
            </select>
          </div>
          
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search by SKU, name, batch..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 pl-9 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-sm flex items-center">
          <span className="inline-block w-4 h-4 bg-red-200 mr-2 rounded"></span>
          <span className="font-medium">Expired</span>
        </div>
        <div className="text-sm flex items-center">
          <span className="inline-block w-4 h-4 bg-red-100 mr-2 rounded"></span>
          <span>&lt; 30 days</span>
        </div>
        <div className="text-sm flex items-center">
          <span className="inline-block w-4 h-4 bg-orange-100 mr-2 rounded"></span>
          <span>30-60 days</span>
        </div>
        <div className="text-sm flex items-center">
          <span className="inline-block w-4 h-4 bg-yellow-100 mr-2 rounded"></span>
          <span>60-90 days</span>
        </div>
        <div className="text-sm flex items-center">
          <span className="inline-block w-4 h-4 bg-green-100 mr-2 rounded"></span>
          <span>&gt; 90 days</span>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full border-collapse bg-white text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-b border-gray-200 p-3 text-left font-medium text-gray-700"></th>
              <th className="border-b border-gray-200 p-3 text-left font-medium text-gray-700">Product</th>
              <th className="border-b border-gray-200 p-3 text-left font-medium text-gray-700">SKU</th>
              <th className="border-b border-gray-200 p-3 text-left font-medium text-gray-700">Earliest Expiry</th>
              <th className="border-b border-gray-200 p-3 text-left font-medium text-gray-700">Batches</th>
              <th className="border-b border-gray-200 p-3 text-left font-medium text-gray-700">Total Quantity</th>
              <th className="border-b border-gray-200 p-3 text-left font-medium text-gray-700">Stock</th>
              <th className="border-b border-gray-200 p-3 text-left font-medium text-gray-700">Notes</th>
              <th className="border-b border-gray-200 p-3 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Calendar size={48} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No expiry records found</h3>
                    <p className="text-gray-500 mb-4">
                      Start tracking product expiry dates by adding your first record.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedRecord(undefined);
                        setSelectedProductForAdditionalExpiry(undefined);
                        setIsAddingAdditionalExpiry(false);
                        setIsFormModalOpen(true);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Expiry Record
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {filteredData.map((group) => {
                  const isExpanded = expandedSku.includes(group.sku);
                  const hasMultipleBatches = group.batches.length > 1;
                  const colorClass = getExpiryColor(group.earliest_expiry);
                  const exceededStock = group.total_quantity > group.stock_quantity;
                  
                  // Find the earliest expiring batch for edit action
                  const earliestBatch = group.batches.reduce((earliest, current) => {
                    return new Date(earliest.expiry_date) <= new Date(current.expiry_date) ? earliest : current;
                  }, group.batches[0]);
                  
                  return (
                    <React.Fragment key={group.sku}>
                      <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50' : ''}`}>
                        <td className="p-3 text-center">
                          {hasMultipleBatches && (
                            <button 
                              onClick={() => toggleExpand(group.sku)}
                              className={`rounded-full p-1 transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="p-3 font-medium">
                          {group.product_name}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <span className="font-mono text-sm">{group.sku}</span>
                            {hasMultipleBatches && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center" title={`${group.batches.length} batches`}>
                                <Layers size={12} className="mr-1" />
                                {group.batches.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`p-3 ${colorClass} rounded-md font-medium`}>{formatNZDate(group.earliest_expiry)}</td>
                        <td className="p-3">
                          {hasMultipleBatches 
                            ? <span className="text-sm">{group.batches.length} batches</span>
                            : <span className="text-sm font-medium">{group.batches[0].batch_number || '-'}</span>
                          }
                        </td>
                        <td className="p-3 font-medium">{group.total_quantity}</td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <span>{group.stock_quantity}</span>
                            {exceededStock && (
                              <span className="ml-2 text-red-600" title="Total quantity exceeds current stock">
                                <AlertTriangle size={14} className="inline" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 max-w-xs truncate">
                          {!hasMultipleBatches && group.batches[0].notes && (
                            <span className="text-sm text-gray-600">{group.batches[0].notes}</span>
                          )}
                          {hasMultipleBatches && (
                            <span className="text-xs text-gray-500 italic">View batches for details</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => handleEdit(earliestBatch)}
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition-colors"
                              title="Edit Earliest Batch"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleAddAdditionalExpiry(earliestBatch)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                              title="Add Additional Expiry Date"
                            >
                              <Plus size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteAllBatches(group.sku)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                              title="Delete All Batches"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded batch details */}
                      {isExpanded && hasMultipleBatches && (
                        <>
                          {group.batches.map((batch) => {
                            const batchDate = new Date(batch.expiry_date);
                            const batchColorClass = getExpiryColor(batchDate);
                            
                            return (
                              <tr key={batch.id} className={`bg-blue-50/50`}>
                                <td className="p-3"></td>
                                <td className="p-3 pl-8 text-sm text-gray-500" colSpan={2}>
                                  <div className="flex items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></div>
                                    <span className="italic">Batch Details</span>
                                  </div>
                                </td>
                                <td className={`p-3 text-sm ${batchColorClass} rounded-md`}>{formatNZDate(batchDate)}</td>
                                <td className="p-3 text-sm font-medium">{batch.batch_number || '-'}</td>
                                <td className="p-3 text-sm">{batch.quantity}</td>
                                <td className="p-3 text-sm">
                                  {batch.stock_quantity !== undefined ? batch.stock_quantity : '-'}
                                </td>
                                <td className="p-3 text-sm max-w-xs truncate">
                                  {batch.notes || '-'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end space-x-2">
                                    <button 
                                      onClick={() => handleEdit(batch)}
                                      className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition-colors"
                                      title="Edit Batch"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button 
                                      onClick={() => batch.id && handleDelete(batch.id)}
                                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                                      title="Delete Batch"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Summary */}
      {!loading && filteredData.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 flex items-center">
          <div className="bg-white shadow-sm rounded-md px-4 py-2 border border-gray-200">
            Showing <span className="font-medium">{filteredData.length}</span> products with expiry dates
            {filteredData.filter(g => g.batches.length > 1).length > 0 && (
              <span className="ml-2">
                (<span className="font-medium">{filteredData.filter(g => g.batches.length > 1).length}</span> with multiple batches)
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Floating action button for mobile */}
      <div className="md:hidden fixed bottom-6 right-6 z-10">
        <button
          onClick={() => {
            setSelectedRecord(undefined);
            setSelectedProductForAdditionalExpiry(undefined);
            setIsAddingAdditionalExpiry(false);
            setIsFormModalOpen(true);
          }}
          className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Add Expiry Record"
        >
          <Plus size={24} />
        </button>
      </div>
      
      {/* Modals */}
      <ExpiryUploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={loadData}
      />
      
      <ExpiryFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setIsAddingAdditionalExpiry(false);
          setSelectedProductForAdditionalExpiry(undefined);
        }}
        onSuccess={loadData}
        expiryRecord={selectedRecord}
        isAddingAdditionalExpiry={isAddingAdditionalExpiry}
        productForAdditionalExpiry={selectedProductForAdditionalExpiry}
      />
    </div>
  );
};

// Add click counter to activate debug mode
document.addEventListener('DOMContentLoaded', () => {
  let clickCount = 0;
  let clickTimer: NodeJS.Timeout;
  
  const titleElement = document.querySelector('h1');
  if (titleElement) {
    titleElement.addEventListener('click', () => {
      clickCount++;
      
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 2000);
      
      if (clickCount >= 5) {
        const debugButton = document.querySelector('button[title="Check Database Status"]');
        if (debugButton) {
          (debugButton as HTMLElement).style.display = 'inline-block';
        }
        clickCount = 0;
      }
    });
  }
});

export default ProductExpiryPage; 