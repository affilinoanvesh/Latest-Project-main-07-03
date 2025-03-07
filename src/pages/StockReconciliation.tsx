import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Search, 
  Filter,
  AlertTriangle,
  FileText,
  Clock,
  BarChart2
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
  cleanupAllSaleMovements
} from '../db/operations/stockReconciliation';
import { processStockImportCsv } from '../utils/csv/stockImport';
import { formatDateTime } from '../utils/formatters';
import { loadReportData } from '../services/reports';
import { productsService } from '../services';
import { productVariationsService } from '../services';

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

  // Load data on initial page load only if no data exists
  useEffect(() => {
    if (!dataLoaded && summaries.length === 0) {
      // Only load data on first load if we don't have any data
      loadData(false);
    } else {
      // If we already have data, just set dataLoaded to true
      setDataLoaded(true);
    }
  }, []);

  // Filter data when search term or filter changes
  useEffect(() => {
    filterData();
  }, [summaries, searchTerm, discrepancyFilter]);

  // Load reconciliation data
  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading stock reconciliation data...');
      
      // Only load products if forceRefresh is true or products array is empty
      if (forceRefresh || products.length === 0) {
        // Load both products and variations
        try {
          const [allProducts, allVariations] = await Promise.all([
            productsService.getAll(),
            productVariationsService.getAll()
          ]);
          
          console.log(`Loaded ${allProducts.length} products and ${allVariations.length} variations`);
          
          // Check if we have any variations at all
          if (allVariations.length === 0) {
            console.warn('No variations found! This might indicate an issue with the productVariationsService.');
          }
          
          // Log some raw product data to check SKUs
          if (allProducts.length > 0) {
            console.log('Sample raw products:', allProducts.slice(0, 3).map(p => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              type: p.type
            })));
          }
          
          if (allVariations.length > 0) {
            console.log('Sample raw variations:', allVariations.slice(0, 3).map(v => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              parent_id: v.parent_id
            })));
          }
          
          // Create a map of product IDs to names for variations
          const productNameMap = new Map();
          allProducts.forEach(product => {
            productNameMap.set(product.id, product.name);
          });
          
          // Format products - include all products with SKUs, not just non-variable ones
          const formattedProducts = allProducts
            .filter(product => !!product.sku) // Only filter out products without SKUs
            .map(product => ({
              sku: product.sku || '',
              name: product.name || '',
              stock_quantity: product.stock_quantity || 0,
              supplier_price: product.supplier_price || 0,
              is_variation: false
            }));
          
          // Format variations - make sure we're getting all variations with SKUs
          const formattedVariations = allVariations
            .filter(variation => !!variation.sku) // Only filter out variations without SKUs
            .map(variation => ({
              sku: variation.sku || '',
              name: variation.name || '',
              stock_quantity: variation.stock_quantity || 0,
              supplier_price: variation.supplier_price || 0,
              is_variation: true,
              parent_name: productNameMap.get(variation.parent_id) || ''
            }));
          
          console.log(`Formatted ${formattedProducts.length} products and ${formattedVariations.length} variations`);
          
          // Check if we're losing variations in the filtering
          if (allVariations.length > formattedVariations.length) {
            console.log(`Warning: Filtered out ${allVariations.length - formattedVariations.length} variations without SKUs`);
            console.log('Sample filtered out variations:', 
              allVariations
                .filter(v => !v.sku)
                .slice(0, 3)
                .map(v => ({id: v.id, name: v.name, parent_id: v.parent_id}))
            );
          }
          
          // Combine products and variations
          const combinedProducts = [...formattedProducts, ...formattedVariations];
          
          // Log some sample products to verify SKUs are present
          if (combinedProducts.length > 0) {
            console.log('Sample formatted products:', combinedProducts.slice(0, 5).map(p => ({
              name: p.name,
              sku: p.sku,
              is_variation: p.is_variation
            })));
            
            // Check for specific SKU patterns
            const skuPatterns = ['bh', 'BH', '205', 'bh205', 'BH205', 'BH-205', 'bh-205'];
            for (const pattern of skuPatterns) {
              const matches = combinedProducts.filter(p => {
                if (!p.sku) return false;
                
                // Try different matching approaches
                const skuLower = p.sku.toLowerCase();
                const patternLower = pattern.toLowerCase();
                
                // Direct includes
                if (skuLower.includes(patternLower)) return true;
                
                // No separators version
                const compactSku = skuLower.replace(/[\s\-_.]/g, '');
                const compactPattern = patternLower.replace(/[\s\-_.]/g, '');
                
                return compactSku.includes(compactPattern);
              });
              
              console.log(`Products with SKU containing "${pattern}":`, matches.length);
              if (matches.length > 0) {
                console.log('Sample matches:', matches.slice(0, 3).map(p => `${p.name} (${p.sku})`));
              }
            }
          }
          
          setProducts(combinedProducts);
        } catch (err) {
          console.error('Failed to load products:', err);
        }
      } else {
        console.log('Skipping product loading - using existing products data');
      }
      
      // Only load reconciliation data if forceRefresh is true or summaries array is empty
      if (forceRefresh || summaries.length === 0) {
        const data = await generateAllReconciliationSummaries(forceRefresh);
        console.log(`Loaded ${data.length} reconciliation summaries`);
        
        setSummaries(data);
        setFilteredSummaries(data);
      } else {
        console.log('Skipping reconciliation data loading - using existing data');
      }
      
      setDataLoaded(true);
      
      // Update last updated timestamp
      const cacheTime = getLastCacheTime();
      setLastUpdated(cacheTime ? new Date(cacheTime) : new Date());
      
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
  const handleAddAdjustment = (sku: string) => {
    const item = summaries.find(s => s.sku === sku);
    if (item) {
      setSelectedItem(item);
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
          sale_amount: data.isManualSale ? data.saleAmount : 0
        };
        
        // Add metadata to notes for reporting purposes
        const metadataString = JSON.stringify(metadata);
        movementData.notes = `${movementData.notes || ''}\n[METADATA]${metadataString}`;
        
        console.log(`Adding expiry adjustment with metadata: ${metadataString}`);
      }
      
      // Add the stock movement
      await addStockMovement(movementData);
      
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
    await loadData(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Stock Reconciliation</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowInitialStockModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Initial Stock
          </button>
          <button
            onClick={() => handleAddAdjustment(filteredSummaries[0]?.sku || '')}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            disabled={filteredSummaries.length === 0}
            title="Add adjustment for stock (damage, theft, expiry, etc.)"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Adjustment
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
            title="Update sales data from product reports and refresh stock reconciliation"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button
            onClick={handleGenerateReport}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-100 text-red-700">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {!dataLoaded && (
        <div className="mb-4 p-4 rounded-lg bg-yellow-100 text-yellow-800 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <p>Click the "Refresh Data" button to load the latest stock data.</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
          <div className="flex items-center">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by SKU or product name"
                className="pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="ml-2 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={discrepancyFilter}
              onChange={(e) => setDiscrepancyFilter(e.target.value as any)}
            >
              <option value="all">All Products</option>
              <option value="with_discrepancy">With Discrepancy</option>
              <option value="no_discrepancy">No Discrepancy</option>
            </select>
          </div>
          
          {lastUpdated && (
            <div className="text-sm text-gray-500 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Last updated: {formatDateTime(lastUpdated)}
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex flex-col justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-4" />
            <p className="text-gray-500">Loading stock reconciliation data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Error loading data</p>
              <p className="text-sm">{error}</p>
              {summaries.length > 0 && lastUpdated && (
                <p className="text-sm mt-1">Showing cached data from {formatDateTime(lastUpdated)}</p>
              )}
            </div>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm || discrepancyFilter !== 'all' 
              ? 'No items match your search criteria' 
              : 'No stock movements found. Add initial stock to get started.'}
          </div>
        ) : (
          <StockReconciliationTable
            data={filteredSummaries}
            onViewMovements={handleViewMovements}
            onReconcile={handleReconcile}
            onAddAdjustment={handleAddAdjustment}
          />
        )}
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
      {showAdjustmentModal && selectedItem && (
        <StockAdjustmentModal
          sku={selectedItem.sku}
          productName={selectedItem.product_name}
          currentStock={selectedItem.actual_stock}
          onSubmit={handleSubmitAdjustment}
          onClose={() => setShowAdjustmentModal(false)}
          products={products}
        />
      )}
      
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