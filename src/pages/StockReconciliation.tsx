import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Search, 
  AlertTriangle,
  FileText,
  Clock
} from 'lucide-react';
import { 
  StockReconciliationSummary, 
  StockMovement,
  Product
} from '../types';
import {
  generateAllReconciliationSummaries,
  getStockMovementsBySku,
  addStockMovement,
  performReconciliation,
  getLastCacheTime,
  getAllStockMovements
} from '../db/operations/stockReconciliation';
import { processStockImportCsv } from '../utils/csv/stockImport';
import { formatDateTime } from '../utils/formatters';
import { loadReportData } from '../services/reports';
import { productsService } from '../services';
import { productVariationsService } from '../services';
import { getProducts } from '../db/operations/products';
import { saveAdditionalRevenue } from '../db/operations/additionalRevenue';
import { saveExpense } from '../db/operations/expenses';
import { getAdditionalRevenueCategories } from '../db/operations/additionalRevenue';
import { getExpenseCategories } from '../db/operations/expenses';

// Import components
import StockReconciliationTable from '../components/stockReconciliation/StockReconciliationTable';
import StockMovementModal from '../components/stockReconciliation/StockMovementModal';
import StockAdjustmentModal from '../components/stockReconciliation/StockAdjustmentModal';
import ReconciliationModal from '../components/stockReconciliation/ReconciliationModal';
import InitialStockModal from '../components/stockReconciliation/InitialStockModal';
import ReconciliationReport from '../components/stockReconciliation/ReconciliationReport';

const StockReconciliation: React.FC = () => {
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [discrepancyFilter, setDiscrepancyFilter] = useState<'all' | 'with_discrepancy' | 'no_discrepancy'>('all');
  
  // Modal state
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [showInitialStockModal, setShowInitialStockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Selected item for modals
  const [selectedItem, setSelectedItem] = useState<StockReconciliationSummary | null>(null);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  
  // Data state
  const [summaries, setSummaries] = useState<StockReconciliationSummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<StockReconciliationSummary[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastOrderSync, setLastOrderSync] = useState<Date | null>(null);
  
  // Products state
  const [products, setProducts] = useState<Array<{
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  }>>([]);

  // Load data on initial page load
  useEffect(() => {
    // Try to load cached data from localStorage first
    const cachedSummaries = localStorage.getItem('stockReconciliationSummaries');
    const cachedProducts = localStorage.getItem('stockReconciliationProducts');
    const cachedLastUpdated = localStorage.getItem('stockReconciliationLastUpdated');
    
    if (cachedSummaries && cachedProducts) {
      try {
        const parsedSummaries = JSON.parse(cachedSummaries);
        const parsedProducts = JSON.parse(cachedProducts);
        
        setSummaries(parsedSummaries);
        setFilteredSummaries(parsedSummaries);
        setProducts(parsedProducts);
        setDataLoaded(true);
        setLoading(false); // Ensure loading is set to false when using cached data
        
        if (cachedLastUpdated) {
          setLastUpdated(new Date(cachedLastUpdated));
        }
        
        // Still load fresh data in the background, but don't show loading indicator
        loadDataSilently(false);
      } catch (error) {
        console.error('Error parsing cached data:', error);
        // If there's an error parsing the cached data, load fresh data
        loadData(false);
      }
    } else {
      // If no cached data is available, load fresh data
      loadData(false);
    }
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => {
    if (summaries.length > 0 && products.length > 0) {
      localStorage.setItem('stockReconciliationSummaries', JSON.stringify(summaries));
      localStorage.setItem('stockReconciliationProducts', JSON.stringify(products));
      if (lastUpdated) {
        localStorage.setItem('stockReconciliationLastUpdated', lastUpdated.toISOString());
      }
    }
  }, [summaries, products, lastUpdated]);

  // Filter data when search term or filter changes
  useEffect(() => {
    filterData();
  }, [summaries, searchTerm, discrepancyFilter]);

  // Load data without showing loading indicator
  const loadDataSilently = async (forceRefresh = false) => {
    try {
      // Don't set loading state
      setError(null);
      
      let dataWasRefreshed = false;
      
      // Only load products if forceRefresh is true or products array is empty
      if (forceRefresh || products.length === 0) {
        try {
          const [allProducts, allVariations] = await Promise.all([
            productsService.getAll(),
            productVariationsService.getAll()
          ]);
          
          // Create a map of product IDs to names for variations
          const productNameMap = new Map();
          allProducts.forEach(product => {
            productNameMap.set(product.id, product.name);
          });
          
          // Format products - include all products with SKUs, not just non-variable ones
          const formattedProducts = allProducts
            .filter(product => !!product.sku)
            .map(product => ({
              sku: product.sku || '',
              name: product.name || '',
              stock_quantity: product.stock_quantity || 0,
              supplier_price: product.supplier_price || 0,
              is_variation: false
            }));
          
          // Format variations - make sure we're getting all variations with SKUs
          const formattedVariations = allVariations
            .filter(variation => !!variation.sku)
            .map(variation => ({
              sku: variation.sku || '',
              name: variation.name || '',
              stock_quantity: variation.stock_quantity || 0,
              supplier_price: variation.supplier_price || 0,
              is_variation: true,
              parent_name: productNameMap.get(variation.parent_id) || ''
            }));
          
          // Combine products and variations
          const combinedProducts = [...formattedProducts, ...formattedVariations];
          
          setProducts(combinedProducts);
          dataWasRefreshed = true;
        } catch (err) {
          console.error('Failed to load products silently:', err);
        }
      }
      
      // Only load reconciliation data if forceRefresh is true or summaries array is empty
      if (forceRefresh || summaries.length === 0) {
        const data = await generateAllReconciliationSummaries(forceRefresh);
        setSummaries(data);
        setFilteredSummaries(data);
        dataWasRefreshed = true;
      }
      
      setDataLoaded(true);
      
      // Only update the lastUpdated timestamp if data was actually refreshed or if forceRefresh is true
      if (forceRefresh || dataWasRefreshed) {
        const cacheTime = getLastCacheTime();
        setLastUpdated(cacheTime ? new Date(cacheTime) : new Date());
      } else if (!lastUpdated) {
        // If lastUpdated is null, set it to the cache time
        const cacheTime = getLastCacheTime();
        if (cacheTime) {
          setLastUpdated(new Date(cacheTime));
        }
      }
    } catch (err: any) {
      console.error('Failed to load reconciliation data silently:', err);
      // Don't show error for silent loading
    }
  };

  // Load data with loading indicator
  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      let dataWasRefreshed = false;
      
      // Only load products if forceRefresh is true or products array is empty
      if (forceRefresh || products.length === 0) {
        try {
          const [allProducts, allVariations] = await Promise.all([
            productsService.getAll(),
            productVariationsService.getAll()
          ]);
          
          // Create a map of product IDs to names for variations
          const productNameMap = new Map();
          allProducts.forEach(product => {
            productNameMap.set(product.id, product.name);
          });
          
          // Format products - include all products with SKUs, not just non-variable ones
          const formattedProducts = allProducts
            .filter(product => !!product.sku)
            .map(product => ({
              sku: product.sku || '',
              name: product.name || '',
              stock_quantity: product.stock_quantity || 0,
              supplier_price: product.supplier_price || 0,
              is_variation: false
            }));
          
          // Format variations - make sure we're getting all variations with SKUs
          const formattedVariations = allVariations
            .filter(variation => !!variation.sku)
            .map(variation => ({
              sku: variation.sku || '',
              name: variation.name || '',
              stock_quantity: variation.stock_quantity || 0,
              supplier_price: variation.supplier_price || 0,
              is_variation: true,
              parent_name: productNameMap.get(variation.parent_id) || ''
            }));
          
          // Combine products and variations
          const combinedProducts = [...formattedProducts, ...formattedVariations];
          
          setProducts(combinedProducts);
          dataWasRefreshed = true;
        } catch (err) {
          console.error('Failed to load products:', err);
        }
      }
      
      // Only load reconciliation data if forceRefresh is true or summaries array is empty
      if (forceRefresh || summaries.length === 0) {
        const data = await generateAllReconciliationSummaries(forceRefresh);
        setSummaries(data);
        setFilteredSummaries(data);
        dataWasRefreshed = true;
      }
      
      setDataLoaded(true);
      
      // Only update the lastUpdated timestamp if data was actually refreshed or if forceRefresh is true
      if (forceRefresh || dataWasRefreshed) {
        const cacheTime = getLastCacheTime();
        setLastUpdated(cacheTime ? new Date(cacheTime) : new Date());
      } else if (!lastUpdated) {
        // If lastUpdated is null, set it to the cache time
        const cacheTime = getLastCacheTime();
        if (cacheTime) {
          setLastUpdated(new Date(cacheTime));
        }
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load reconciliation data:', err);
      
      // Handle specific API errors
      if (err.status === 406) {
        setError('API Error: Not Acceptable (406). There might be an issue with the API request format.');
      } else {
        setError(err.message || 'Failed to load reconciliation data');
      }
      
      setLoading(false);
    }
  };

  // Filter data based on search term and filters
  const filterData = () => {
    let filtered = [...summaries];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        item => 
          item.sku.toLowerCase().includes(term) || 
          item.product_name.toLowerCase().includes(term)
      );
    }
    
    // Apply discrepancy filter
    if (discrepancyFilter === 'with_discrepancy') {
      filtered = filtered.filter(item => item.discrepancy !== 0);
    } else if (discrepancyFilter === 'no_discrepancy') {
      filtered = filtered.filter(item => item.discrepancy === 0);
    }
    
    setFilteredSummaries(filtered);
  };

  // Handle view movements
  const handleViewMovements = async (sku: string) => {
    try {
      setSelectedSku(sku);
      const movementData = await getStockMovementsBySku(sku);
      setMovements(movementData);
      
      // Find the selected item
      const item = summaries.find(s => s.sku === sku);
      if (item) {
        setSelectedItem(item);
      }
      
      setShowMovementModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load movement data');
    }
  };

  // Handle add adjustment
  const handleAddAdjustment = (sku: string = '') => {
    console.log('handleAddAdjustment called with SKU:', sku);
    console.log('Current summaries:', summaries);
    
    // If a specific SKU is provided (from row button), find that item
    if (sku) {
      const item = summaries.find(s => s.sku === sku);
      console.log('Found item for SKU:', item);
      
      if (item) {
        console.log('Setting selectedItem for adjustment:', item);
        setSelectedItem(item);
        
        // Open the modal with the selected item
        setShowAdjustmentModal(true);
      } else {
        console.log('No item found for SKU:', sku);
        setSelectedItem(null);
        
        // Open the modal without a selected item
        setShowAdjustmentModal(true);
      }
    } else {
      // If no SKU provided (from general "Add Adjustment" button), don't preselect
      console.log('No SKU provided, not preselecting any item');
      setSelectedItem(null);
      
      // Open the modal without a selected item
      setShowAdjustmentModal(true);
    }
  };

  // Handle reconcile
  const handleReconcile = (sku: string) => {
    const item = summaries.find(s => s.sku === sku);
    if (item) {
      setSelectedItem(item);
      setShowReconciliationModal(true);
    }
  };

  // Submit adjustment
  const handleSubmitAdjustment = async (data: {
    sku: string;
    quantity: number;
    reason: 'expiry' | 'damage' | 'theft' | 'correction' | 'other';
    notes: string;
    batchNumber?: string;
    date: Date;
    lossPercentage?: number;
    isManualSale?: boolean;
    saleAmount?: number;
    lossAmount?: number;
  }) => {
    try {
      // Create the base movement data
      const movementData = {
        sku: data.sku,
        movement_date: data.date,
        quantity: data.quantity,
        movement_type: 'adjustment' as const,
        reason: data.reason,
        notes: data.notes,
        batch_number: data.batchNumber
      };
      
      // Add additional metadata for reporting if it's an expiry
      if (data.reason === 'expiry') {
        // For expiry, add metadata about whether it was a manual sale and the loss amount
        const metadata = {
          is_manual_sale: data.isManualSale || false,
          loss_percentage: data.lossPercentage || 0,
          sale_amount: data.isManualSale ? data.saleAmount : 0,
          loss_amount: data.lossAmount || 0
        };
        
        // Add metadata to notes for reporting purposes
        const metadataString = JSON.stringify(metadata);
        movementData.notes = `${movementData.notes || ''}\n[METADATA]${metadataString}`;
      }
      
      // Add the stock movement
      const movementId = await addStockMovement(movementData);
      
      // Get the product details to use in descriptions
      const product = summaries.find(s => s.sku === data.sku);
      const productName = product ? product.product_name : data.sku;
      
      // Handle financial records for loss reasons (expiry, damage, theft)
      if (['expiry', 'damage', 'theft'].includes(data.reason) && data.quantity < 0) {
        try {
          // Get categories for additional revenue and expenses
          const revenueCategories = await getAdditionalRevenueCategories();
          const expenseCategories = await getExpenseCategories();
          
          // Find or use default categories
          const manualSaleCategory = revenueCategories.find(c => c.name === 'Manual Sales') || revenueCategories[0];
          const inventoryLossCategory = expenseCategories.find(c => c.name === 'Inventory Loss') || expenseCategories[0];
          const expiredProductsCategory = expenseCategories.find(c => c.name === 'Expired Products') || inventoryLossCategory;
          const damagedProductsCategory = expenseCategories.find(c => c.name === 'Damaged Products') || inventoryLossCategory;
          const theftCategory = expenseCategories.find(c => c.name === 'Inventory Theft') || inventoryLossCategory;
          
          // For manual sales of expired/damaged products
          if (data.reason === 'expiry' && data.isManualSale && data.saleAmount && data.saleAmount > 0) {
            // 1. Record the sale amount as additional revenue
            await saveAdditionalRevenue({
              amount: data.saleAmount,
              date: data.date,
              category_id: manualSaleCategory.id || 0,
              category: manualSaleCategory.name,
              description: `Manual sale of ${Math.abs(data.quantity)} units of ${productName} (${data.sku})`,
              reference: `SM-${movementId}`, // Reference to stock movement
              payment_method: 'cash', // Default or make configurable
              tax_included: true // Configure as needed
            });
            
            // 2. If there's still a loss (sale amount less than full value), record it as an expense
            if (data.lossAmount && data.lossAmount > 0) {
              await saveExpense({
                amount: data.lossAmount,
                date: data.date,
                category: inventoryLossCategory.name,
                description: `Partial loss on manual sale of ${Math.abs(data.quantity)} units of ${productName} (${data.sku})`,
                reference: `SM-${movementId}`, // Reference to stock movement
                tax_deductible: true // Configure as needed
              });
            }
          } else {
            // For complete loss (not sold), record the full cost as an expense
            if (data.lossAmount && data.lossAmount > 0) {
              // Select the appropriate category based on reason
              const categoryName = 
                data.reason === 'expiry' ? expiredProductsCategory.name : 
                data.reason === 'damage' ? damagedProductsCategory.name : 
                theftCategory.name;
              
              await saveExpense({
                amount: data.lossAmount,
                date: data.date,
                category: categoryName,
                description: `${data.reason} of ${Math.abs(data.quantity)} units of ${productName} (${data.sku})`,
                reference: `SM-${movementId}`, // Reference to stock movement
                tax_deductible: true // Configure as needed
              });
            }
          }
        } catch (categoryError) {
          console.error('Error handling financial records:', categoryError);
          // Continue with the process even if financial records fail
        }
      }
      
      setShowAdjustmentModal(false);
      loadData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to add adjustment');
    }
  };

  // Submit reconciliation
  const handleSubmitReconciliation = async (data: {
    sku: string;
    actualQuantity: number;
    notes: string;
  }) => {
    try {
      await performReconciliation(
        data.sku,
        data.actualQuantity,
        data.notes
      );
      
      setShowReconciliationModal(false);
      loadData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to perform reconciliation');
    }
  };

  // Submit initial stock
  const handleSubmitInitialStock = async (data: {
    sku: string;
    quantity: number;
    notes: string;
  }) => {
    try {
      await addStockMovement({
        sku: data.sku,
        movement_date: new Date(),
        quantity: data.quantity,
        movement_type: 'initial',
        notes: data.notes
      });
      
      setShowInitialStockModal(false);
      loadData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to add initial stock');
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async (file: File) => {
    try {
      const result = await processStockImportCsv(file);
      
      if (result.success > 0) {
        // Show success message
        setShowInitialStockModal(false);
        loadData(true);
      } else {
        setError('No items were imported successfully');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process CSV file');
    }
  };

  // Add a function to generate a report
  const handleGenerateReport = () => {
    setShowReportModal(true);
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    // Force refresh data from the server
    await loadData(true);
  };

  return (
    <div className="max-w-full mx-auto px-1 sm:px-2 py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
        <h1 className="text-xl font-bold">Stock Reconciliation</h1>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setShowInitialStockModal(true)}
            className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Initial
          </button>
          <button
            onClick={() => handleAddAdjustment()}
            className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
            title="Add adjustment for any product (damage, theft, expiry, etc.)"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Adjustment
          </button>
          <button
            onClick={handleRefresh}
            className={`flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs`}
            disabled={loading}
            title="Refresh data from the server"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh from Server'}
          </button>
          <button
            onClick={handleGenerateReport}
            className="flex items-center px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
          >
            <FileText className="h-3 w-3 mr-1" />
            Report
          </button>
        </div>
      </div>
      
      {/* Show error message if there's an error */}
      {error && (
        <div className="mb-2 p-2 rounded-lg bg-red-100 text-red-700 flex items-center text-xs">
          <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading data</p>
            <p>{error}</p>
            {summaries.length > 0 && lastUpdated && (
              <p className="mt-0.5">Showing cached data from {formatDateTime(lastUpdated)}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Only show the loading message if we're loading and don't have any data yet */}
      {loading && summaries.length === 0 && (
        <div className="mb-2 p-2 rounded-lg bg-yellow-100 text-yellow-800 flex items-center text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          <p>Loading stock reconciliation data... Please wait.</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-2 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Search className="h-3 w-3 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by SKU or name"
                className="pl-7 pr-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-48 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600">Filter:</span>
              <select
                value={discrepancyFilter}
                onChange={(e) => setDiscrepancyFilter(e.target.value as any)}
                className="border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              >
                <option value="all">All Items</option>
                <option value="with_discrepancy">With Discrepancy</option>
                <option value="no_discrepancy">No Discrepancy</option>
              </select>
            </div>
          </div>
          
          {lastUpdated && (
            <div className="mt-1 flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              Last updated: {formatDateTime(lastUpdated)}
              {!loading && (
                <span className="ml-2 text-xs text-blue-500 cursor-pointer hover:underline" onClick={handleRefresh}>
                  (Click to refresh from server)
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Always show the table */}
        <StockReconciliationTable 
          data={filteredSummaries}
          onViewMovements={handleViewMovements}
          onReconcile={handleReconcile}
          onAddAdjustment={handleAddAdjustment}
          loading={loading}
          isFiltered={searchTerm !== '' || discrepancyFilter !== 'all'}
        />
      </div>
      
      {/* Stock Movement Modal */}
      {showMovementModal && selectedSku && (
        <StockMovementModal
          sku={selectedSku}
          movements={movements}
          onClose={() => setShowMovementModal(false)}
        />
      )}
      
      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (() => {
        console.log('Rendering StockAdjustmentModal with selectedItem:', selectedItem);
        return (
          <StockAdjustmentModal
            products={products}
            onSubmit={handleSubmitAdjustment}
            onClose={() => setShowAdjustmentModal(false)}
            sku={selectedItem?.sku}
            productName={selectedItem?.product_name}
            currentStock={selectedItem?.actual_stock}
          />
        );
      })()}
      
      {/* Reconciliation Modal */}
      {showReconciliationModal && selectedItem && (
        <ReconciliationModal
          sku={selectedItem.sku}
          productName={selectedItem.product_name}
          expectedStock={selectedItem.expected_stock}
          actualStock={selectedItem.actual_stock}
          onSubmit={handleSubmitReconciliation}
          onClose={() => setShowReconciliationModal(false)}
        />
      )}
      
      {/* Initial Stock Modal */}
      {showInitialStockModal && (
        <InitialStockModal
          onSubmit={handleSubmitInitialStock}
          onBulkUpload={handleBulkUpload}
          onClose={() => setShowInitialStockModal(false)}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReconciliationReport
          data={summaries}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default StockReconciliation; 