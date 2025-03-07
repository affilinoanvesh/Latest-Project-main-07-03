import React, { useState, useEffect } from 'react';
import { InventoryItem, Product, ProductVariation } from '../types';
import { fetchProducts, fetchInventory, hasApiCredentials } from '../services/api';
import { productVariationsService, inventoryService } from '../services';
import { RefreshCw, Trash2 } from 'lucide-react';

// Import components
import InventoryFilters from '../components/inventory/InventoryFilters';
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryStats from '../components/inventory/InventoryStats';
import InventorySummary from '../components/inventory/InventorySummary';
import { calculateTotals } from '../components/inventory/InventoryUtils';

const Inventory: React.FC = () => {
  // State for inventory data
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'simple' | 'variation'>('all');
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof InventoryItem>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Summary values - calculated from filtered inventory
  const [summaryValues, setSummaryValues] = useState({
    totalRetailValue: 0,
    totalCostValue: 0,
    potentialProfit: 0
  });
  
  // Projections
  const [showProjections, setShowProjections] = useState(false);
  const [projectionMonths, setProjectionMonths] = useState(3);
  const [projectionData, setProjectionData] = useState<{
    month: string;
    retailValue: number;
    costValue: number;
    profit: number;
  }[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadInventoryData();
  }, []);
  
  // Update summary values when filtered inventory changes
  useEffect(() => {
    const totals = calculateTotals(filteredInventory);
    setSummaryValues(totals);
  }, [filteredInventory]);

  // Load inventory data directly from the database
  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if API credentials are set
      const hasCredentials = await hasApiCredentials();
      if (!hasCredentials) {
        setError('API credentials not set. Please go to Settings to configure your WooCommerce API credentials.');
        setLoading(false);
        return;
      }
      
      // Fetch products and inventory data from API/database
      const [productsData, inventoryData] = await Promise.all([
        fetchProducts(),
        fetchInventory()
      ]);
      
      // Fetch product variations directly from the database
      const allVariations = await productVariationsService.getAll();
      
      // Create a map of parent_id to variations for faster lookup
      const variationsByParentId = new Map<number, ProductVariation[]>();
      
      allVariations.forEach((variation: ProductVariation) => {
        if (!variationsByParentId.has(variation.parent_id)) {
          variationsByParentId.set(variation.parent_id, []);
        }
        variationsByParentId.get(variation.parent_id)?.push(variation);
      });
      
      // Attach variations to products
      const productsWithVariations = productsData.map((product: Product) => {
        if (product.type === 'variable') {
          // Get variations for this product from our map
          const productVariations = variationsByParentId.get(product.id) || [];
          
          if (productVariations.length > 0) {
            product.productVariations = productVariations;
          } else {
            product.productVariations = [];
          }
        }
        return product;
      });
      
      setProducts(productsWithVariations);
      
      // Process inventory data
      const processedInventory = processInventoryData(inventoryData, productsWithVariations);
      setInventory(processedInventory);
      setFilteredInventory(processedInventory);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading inventory data:', err);
      setError('Failed to load inventory data. Please try again or sync data from Settings.');
      setLoading(false);
    }
  };

  // Process inventory data to calculate values
  const processInventoryData = (inventoryData: InventoryItem[], productsData: Product[]): InventoryItem[] => {
    // Remove duplicate items by SKU (keep the most recent one)
    const uniqueItems = new Map<string, InventoryItem>();
    
    // Sort by id in descending order to keep the most recent item
    const sortedInventory = [...inventoryData].sort((a, b) => {
      if (a.id && b.id) {
        return b.id - a.id; // Descending order
      }
      return 0;
    });
    
    // Keep only the first occurrence of each SKU
    sortedInventory.forEach(item => {
      if (item.sku && !uniqueItems.has(item.sku)) {
        uniqueItems.set(item.sku, item);
      }
    });
    
    console.log(`Processing ${uniqueItems.size} unique inventory items`);
    
    // Process each unique inventory item
    return Array.from(uniqueItems.values()).map(item => {
      // Find the corresponding product or variation
      const product = productsData.find(p => p.id === item.product_id);
      
      if (!product) return item;
      
      let stockQuantity = 0;
      let price = 0;
      let regularPrice = 0;
      let salePrice = 0;
      
      // Preserve supplier price information
      const supplierPrice = item.supplier_price;
      const supplierName = item.supplier_name;
      const supplierUpdated = item.supplier_updated;
      
      if (item.variation_id) {
        // This is a variation
        const variation = product.productVariations?.find(v => v.id === item.variation_id);
        
        if (variation) {
          // Use the stock quantity from the variation if available
          stockQuantity = variation.stock_quantity ?? 0;
          
          // For variations, use the variation's prices directly from the variation object
          price = parseFloat(String(variation.price ?? 0));
          regularPrice = parseFloat(String(variation.regular_price ?? variation.price ?? 0));
          salePrice = parseFloat(String(variation.sale_price ?? 0));
        }
      } else {
        // This is a simple product (not a variable product)
        if (product.type !== 'variable') {
          // Use the stock quantity from the product if available
          stockQuantity = product.stock_quantity ?? 0;
          
          // For simple products, use the product's prices directly from the product object
          price = parseFloat(String(product.price ?? 0));
          regularPrice = parseFloat(String(product.regular_price ?? product.price ?? 0));
          salePrice = parseFloat(String(product.sale_price ?? 0));
        } else {
          // This is a variable product parent - it shouldn't have its own price
          stockQuantity = 0;
          price = 0;
          regularPrice = 0;
          salePrice = 0;
        }
      }
      
      // If we have a stock quantity in the inventory item, use that instead
      if (item.stock_quantity !== undefined && item.stock_quantity !== null) {
        stockQuantity = parseFloat(String(item.stock_quantity));
      }
      
      // Calculate values - use supplier_price if available, otherwise use cost_price
      const costPrice = parseFloat(String(supplierPrice ?? item.cost_price ?? 0));
      
      // For current price, use sale price if available, otherwise use regular price
      const currentPrice = salePrice > 0 ? salePrice : regularPrice;
      
      // Calculate retail value (current price × stock quantity)
      const retailValue = stockQuantity * currentPrice;
      
      // Calculate cost value (cost price × stock quantity)
      const costValue = stockQuantity * costPrice;
      
      // Calculate profit margin if we have both prices
      let profitMargin = 0;
      if (currentPrice > 0 && costPrice > 0) {
        profitMargin = ((currentPrice - costPrice) / currentPrice) * 100;
      }
      
      return {
        ...item,
        stock_quantity: stockQuantity,
        price,
        regular_price: regularPrice,
        sale_price: salePrice,
        retail_value: retailValue,
        cost_value: costValue,
        profit_margin: profitMargin
      };
    });
  };

  // Calculate projections based on current inventory
  const calculateProjections = () => {
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calculate total retail and cost values
    const totalRetailValue = summaryValues.totalRetailValue;
    const totalCostValue = summaryValues.totalCostValue;
    
    // Assume 10% growth per month for retail value
    const monthlyGrowthRate = 0.1;
    
    // Generate projection data for the specified number of months
    const projections = [];
    
    for (let i = 0; i < projectionMonths; i++) {
      const projectionMonth = new Date(currentYear, currentMonth + i, 1);
      const monthName = projectionMonth.toLocaleString('default', { month: 'long' });
      const yearNumber = projectionMonth.getFullYear();
      
      // Calculate projected values with compound growth
      const projectedRetailValue = totalRetailValue * Math.pow(1 + monthlyGrowthRate, i);
      const projectedCostValue = totalCostValue * Math.pow(1 + monthlyGrowthRate, i);
      const projectedProfit = projectedRetailValue - projectedCostValue;
      
      projections.push({
        month: `${monthName} ${yearNumber}`,
        retailValue: projectedRetailValue,
        costValue: projectedCostValue,
        profit: projectedProfit
      });
    }
    
    setProjectionData(projections);
  };

  // Handle projection months change
  const handleProjectionMonthsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProjectionMonths(parseInt(e.target.value));
  };

  // Handle product type filter change
  const handleProductTypeFilterChange = (filter: 'all' | 'simple' | 'variation') => {
    setProductTypeFilter(filter);
    applyFilters(searchTerm, stockFilter, filter);
  };

  // Handle search input change
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(value, stockFilter, productTypeFilter);
  };

  // Handle stock filter change
  const handleStockFilterChange = (filter: 'all' | 'in_stock' | 'out_of_stock') => {
    setStockFilter(filter);
    applyFilters(searchTerm, filter, productTypeFilter);
  };

  // Apply all filters to inventory
  const applyFilters = (
    search: string, 
    stockStatus: 'all' | 'in_stock' | 'out_of_stock',
    productType: 'all' | 'simple' | 'variation'
  ) => {
    let filtered = [...inventory];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(item => {
        const product = products.find(p => p.id === item.product_id);
        const productName = product ? product.name.toLowerCase() : '';
        const sku = item.sku ? item.sku.toLowerCase() : '';
        
        return productName.includes(searchLower) || sku.includes(searchLower);
      });
    }
    
    // Apply stock status filter
    if (stockStatus === 'in_stock') {
      filtered = filtered.filter(item => (item.stock_quantity || 0) > 0);
    } else if (stockStatus === 'out_of_stock') {
      filtered = filtered.filter(item => (item.stock_quantity || 0) === 0);
    }
    
    // Apply product type filter
    if (productType === 'simple') {
      filtered = filtered.filter(item => !item.variation_id);
    } else if (productType === 'variation') {
      filtered = filtered.filter(item => !!item.variation_id);
    }
    
    setFilteredInventory(filtered);
  };

  // Handle sorting
  const handleSort = (field: keyof InventoryItem) => {
    // If clicking the same field, toggle direction
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it as the sort field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sorted inventory
  const getSortedInventory = () => {
    return [...filteredInventory].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;
      
      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Function to remove duplicate items from the database
  const removeDuplicatesFromDatabase = async () => {
    try {
      setLoading(true);
      
      // Get all inventory items
      const allItems = await inventoryService.getAll();
      
      // Create a map to track unique SKUs and their IDs
      const uniqueSkus = new Map<string, number[]>();
      
      // Group items by SKU
      allItems.forEach(item => {
        if (item.sku && item.id) {
          if (!uniqueSkus.has(item.sku)) {
            uniqueSkus.set(item.sku, []);
          }
          uniqueSkus.get(item.sku)!.push(item.id);
        }
      });
      
      // Find SKUs with multiple entries
      const duplicateSkus = Array.from(uniqueSkus.entries())
        .filter(([_, ids]) => ids.length > 1);
      
      if (duplicateSkus.length === 0) {
        alert('No duplicate items found in the database.');
        setLoading(false);
        return;
      }
      
      // For each duplicate, keep the most recent one (highest ID) and delete the rest
      let deletedCount = 0;
      
      for (const [sku, ids] of duplicateSkus) {
        // Sort IDs in descending order
        const sortedIds = [...ids].sort((a, b) => b - a);
        
        // Keep the highest ID (most recent) and delete the rest
        const idsToDelete = sortedIds.slice(1);
        
        // Delete the duplicate items
        for (const id of idsToDelete) {
          await inventoryService.delete(id);
          deletedCount++;
        }
      }
      
      alert(`Successfully removed ${deletedCount} duplicate items from the database.`);
      
      // Reload inventory data
      await loadInventoryData();
    } catch (error) {
      console.error('Error removing duplicates:', error);
      alert(`Error removing duplicates: ${error instanceof Error ? error.message : String(error)}`);
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Inventory</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Inventory</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex space-x-2">
          <button
            onClick={loadInventoryData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </button>
          
          <button
            onClick={removeDuplicatesFromDatabase}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Duplicates
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <InventoryFilters 
        searchTerm={searchTerm}
        stockFilter={stockFilter}
        productTypeFilter={productTypeFilter}
        onSearch={handleSearch}
        onStockFilterChange={handleStockFilterChange}
        onProductTypeFilterChange={handleProductTypeFilterChange}
      />
      
      {/* Summary Cards */}
      <InventorySummary 
        totalRetailValue={summaryValues.totalRetailValue}
        totalCostValue={summaryValues.totalCostValue}
        potentialProfit={summaryValues.potentialProfit}
      />
      
      {/* Projections Toggle */}
      <div className="mb-6">
        <button
          onClick={() => {
            setShowProjections(!showProjections);
            if (!showProjections) {
              calculateProjections();
            }
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
        >
          {showProjections ? 'Hide Projections' : 'Show Inventory Projections'}
        </button>
      </div>
      
      {/* Projections Section */}
      {showProjections && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Inventory Value Projections</h2>
            <div className="flex items-center">
              <label htmlFor="projectionMonths" className="mr-2 text-sm">Months:</label>
              <select
                id="projectionMonths"
                value={projectionMonths}
                onChange={handleProjectionMonthsChange}
                className="border rounded p-1"
                onBlur={calculateProjections}
              >
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retail Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projectionData.map((data, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.retailValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.costValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Inventory Table */}
      <InventoryTable 
        inventory={getSortedInventory()}
        products={products}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        formatCurrency={(amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}
      />
      
      {/* Inventory Stats */}
      <InventoryStats 
        inventory={inventory}
        filteredInventory={filteredInventory}
      />
    </div>
  );
};

export default Inventory; 