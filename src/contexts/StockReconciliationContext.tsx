import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  StockReconciliationSummary, 
  StockMovement,
} from '../types';
import {
  generateAllReconciliationSummaries,
  getLastCacheTime,
  generateReconciliationSummary
} from '../db/operations/stockReconciliation';
import { productsService } from '../services';
import { productVariationsService } from '../services';
import { settingsService } from '../services';

interface StockReconciliationContextType {
  // Data state
  summaries: StockReconciliationSummary[];
  setSummaries: React.Dispatch<React.SetStateAction<StockReconciliationSummary[]>>;
  filteredSummaries: StockReconciliationSummary[];
  setFilteredSummaries: React.Dispatch<React.SetStateAction<StockReconciliationSummary[]>>;
  products: Array<{
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  }>;
  setProducts: React.Dispatch<React.SetStateAction<Array<{
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  }>>>;
  
  // UI state
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  discrepancyFilter: 'all' | 'with_discrepancy' | 'no_discrepancy';
  setDiscrepancyFilter: React.Dispatch<React.SetStateAction<'all' | 'with_discrepancy' | 'no_discrepancy'>>;
  
  // Selected item state
  selectedItem: StockReconciliationSummary | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<StockReconciliationSummary | null>>;
  selectedSku: string | null;
  setSelectedSku: React.Dispatch<React.SetStateAction<string | null>>;
  movements: StockMovement[];
  setMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  
  // Other state
  dataLoaded: boolean;
  setDataLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  lastUpdated: Date | null;
  setLastUpdated: React.Dispatch<React.SetStateAction<Date | null>>;
  excludeOnHoldOrders: boolean;
  setExcludeOnHoldOrders: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Utility functions
  loadData: (forceRefresh?: boolean, loadReconciliationData?: boolean) => Promise<void>;
  loadDataSilently: (forceRefresh?: boolean, loadReconciliationData?: boolean) => Promise<void>;
  filterData: () => void;
  matchesFilters: (summary: StockReconciliationSummary) => boolean;
}

const StockReconciliationContext = createContext<StockReconciliationContextType | undefined>(undefined);

export const useStockReconciliation = () => {
  const context = useContext(StockReconciliationContext);
  if (!context) {
    throw new Error('useStockReconciliation must be used within a StockReconciliationProvider');
  }
  return context;
};

interface StockReconciliationProviderProps {
  children: ReactNode;
}

export const StockReconciliationProvider: React.FC<StockReconciliationProviderProps> = ({ children }) => {
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [discrepancyFilter, setDiscrepancyFilter] = useState<'all' | 'with_discrepancy' | 'no_discrepancy'>('all');
  
  // Selected item state
  const [selectedItem, setSelectedItem] = useState<StockReconciliationSummary | null>(null);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  
  // Data state
  const [summaries, setSummaries] = useState<StockReconciliationSummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<StockReconciliationSummary[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Products state
  const [products, setProducts] = useState<Array<{
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  }>>([]);

  // Settings state
  const [excludeOnHoldOrders, setExcludeOnHoldOrders] = useState<boolean>(true);

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
        
        // Only load product data in the background, not reconciliation data
        // This prevents unnecessary API calls when the page loads
        loadDataSilently(false, false);
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

  // Load excludeOnHoldOrders setting
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
        setExcludeOnHoldOrders(excludeOnHold);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // Load data without showing loading indicator
  const loadDataSilently = async (forceRefresh = false, loadReconciliationData = true) => {
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
      
      // Only load reconciliation data if loadReconciliationData is true and (forceRefresh is true or summaries array is empty)
      if (loadReconciliationData && (forceRefresh || summaries.length === 0)) {
        console.log('Loading reconciliation data silently', { forceRefresh });
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
  const loadData = async (forceRefresh = false, loadReconciliationData = true) => {
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
      
      // Only load reconciliation data if loadReconciliationData is true and (forceRefresh is true or summaries array is empty)
      if (loadReconciliationData && (forceRefresh || summaries.length === 0)) {
        console.log('Loading reconciliation data with indicator', { forceRefresh });
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

  // Helper function to check if a summary matches current filters
  const matchesFilters = (summary: StockReconciliationSummary): boolean => {
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!summary.sku.toLowerCase().includes(term) && 
          !summary.product_name.toLowerCase().includes(term)) {
        return false;
      }
    }
    
    // Apply discrepancy filter
    if (discrepancyFilter === 'with_discrepancy' && summary.discrepancy === 0) {
      return false;
    } else if (discrepancyFilter === 'no_discrepancy' && summary.discrepancy !== 0) {
      return false;
    }
    
    return true;
  };

  const value = {
    // Data state
    summaries,
    setSummaries,
    filteredSummaries,
    setFilteredSummaries,
    products,
    setProducts,
    
    // UI state
    loading,
    setLoading,
    error,
    setError,
    searchTerm,
    setSearchTerm,
    discrepancyFilter,
    setDiscrepancyFilter,
    
    // Selected item state
    selectedItem,
    setSelectedItem,
    selectedSku,
    setSelectedSku,
    movements,
    setMovements,
    
    // Other state
    dataLoaded,
    setDataLoaded,
    lastUpdated,
    setLastUpdated,
    excludeOnHoldOrders,
    setExcludeOnHoldOrders,
    
    // Utility functions
    loadData,
    loadDataSilently,
    filterData,
    matchesFilters,
  };

  return (
    <StockReconciliationContext.Provider value={value}>
      {children}
    </StockReconciliationContext.Provider>
  );
}; 