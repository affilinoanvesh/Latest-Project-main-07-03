import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Edit, Save, X, ChevronRight, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { Product, ProductVariation, SupplierPriceItem } from '../types';
import { 
  fetchProducts, 
  fetchInventory, 
  hasApiCredentials
} from '../services/api';
import { processSupplierPriceData, getSupplierImports } from '../db/operations/supplier';
import { productVariationsService, inventoryService, supabase, productsService } from '../services';
import ProductTable from '../components/ProductTable';
import SupplierImportForm from '../components/SupplierImportForm';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [recentImports, setRecentImports] = useState<{
    id?: number;
    date: string;
    supplier: string;
    filename: string;
    updated: number;
    skipped: number;
  }[]>([]);

  // Sorting
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const loadProductData = async () => {
    try {
      // Fetch products and inventory data
      const [productsData, inventoryData] = await Promise.all([
        fetchProducts(),
        fetchInventory()
      ]);
      
      console.log(`Loaded ${productsData.length} products and ${inventoryData.length} inventory items`);
      
      // Create a map of variations by parent ID for quick lookup
      const variationsByParentId = new Map<number, ProductVariation[]>();
      
      // Get all variations from the database
      const variations = await productVariationsService.getAll();
      
      // Group variations by parent ID
      variations.forEach(variation => {
        const parentId = variation.parent_id;
        if (!variationsByParentId.has(parentId)) {
          variationsByParentId.set(parentId, []);
        }
        variationsByParentId.get(parentId)!.push(variation);
      });
      
      // Merge product data with inventory cost data and attach variations
      const mergedProducts = productsData.map(product => {
        // Find inventory items for this product (excluding variations)
        const inventoryItem = inventoryData.find(
          item => item.product_id === product.id && !item.variation_id
        );
        
        // Log inventory item for debugging
        if (inventoryItem && inventoryItem.supplier_price && inventoryItem.supplier_price > 0) {
          console.log(`Found inventory item for product ${product.name} (SKU: ${product.sku}) with supplier price: ${inventoryItem.supplier_price} from ${inventoryItem.supplier_name || 'unknown'}`);
        }
        
        // If this is a variable product, attach variations and update their inventory data
        if (product.type === 'variable') {
          // Get variations for this product from our map
          const productVariations = variationsByParentId.get(product.id) || [];
          
          if (productVariations.length > 0) {
            console.log(`Attaching ${productVariations.length} variations to product ${product.name} (ID: ${product.id})`);
            
            // Update each variation with inventory data
            product.productVariations = productVariations.map(variation => {
              const variationInventory = inventoryData.find(
                item => item.product_id === product.id && item.variation_id === variation.id
              );
              
              // Log variation inventory for debugging
              if (variationInventory && variationInventory.supplier_price && variationInventory.supplier_price > 0) {
                console.log(`Found inventory item for variation (SKU: ${variation.sku}) with supplier price: ${variationInventory.supplier_price} from ${variationInventory.supplier_name || 'unknown'}`);
              }
              
              return {
                ...variation,
                cost_price: variationInventory?.cost_price || variation.cost_price || 0,
                supplier_price: variationInventory?.supplier_price || variation.supplier_price || 0,
                supplier_name: variationInventory?.supplier_name || variation.supplier_name || '',
                supplier_updated: variationInventory?.supplier_updated || variation.supplier_updated
              };
            });
          } else {
            console.warn(`Variable product ${product.name} (ID: ${product.id}) has no variations`);
            product.productVariations = [];
          }
        }
        
        // Create the merged product with inventory data
        const mergedProduct = {
          ...product,
          cost_price: inventoryItem?.cost_price || product.cost_price || 0,
          supplier_price: inventoryItem?.supplier_price || product.supplier_price || 0,
          supplier_name: inventoryItem?.supplier_name || product.supplier_name || '',
          supplier_updated: inventoryItem?.supplier_updated || product.supplier_updated
        };
        
        // Log the merged product for debugging
        if (mergedProduct.supplier_price && mergedProduct.supplier_price > 0) {
          console.log(`Merged product ${mergedProduct.name} (SKU: ${mergedProduct.sku}) has supplier price: ${mergedProduct.supplier_price} from ${mergedProduct.supplier_name || 'unknown'}`);
        }
        
        return mergedProduct;
      });
      
      // Log information about variable products and their variations
      const variableProducts = mergedProducts.filter(p => p.type === 'variable');
      console.log(`Found ${variableProducts.length} variable products`);
      variableProducts.forEach(p => {
        console.log(`Variable product: ${p.name} (ID: ${p.id}) has ${p.productVariations?.length || 0} variations`);
      });
      
      // Log products with supplier prices
      const productsWithSupplierPrice = mergedProducts.filter(p => p.supplier_price && p.supplier_price > 0);
      console.log(`Found ${productsWithSupplierPrice.length} products with supplier price out of ${mergedProducts.length}`);
      
      if (productsWithSupplierPrice.length > 0) {
        console.log('Sample products with supplier prices:');
        productsWithSupplierPrice.slice(0, 3).forEach(p => {
          console.log(`- ${p.name} (SKU: ${p.sku}): ${p.supplier_price} from ${p.supplier_name || 'unknown'}`);
        });
      }
      
      setProducts(mergedProducts);
      setFilteredProducts(mergedProducts);
      
      return mergedProducts;
    } catch (error) {
      console.error('Error loading product data:', error);
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check if API credentials are set
        const hasCredentials = await hasApiCredentials();
        if (!hasCredentials) {
          setError('API credentials not set. Please go to Settings to configure your WooCommerce API credentials.');
          setLoading(false);
          return;
        }
        
        const productData = await loadProductData();
        
        // Debug: Check for variable products and their variations
        const variableProducts = productData.filter(p => p.type === 'variable');
        console.log(`Found ${variableProducts.length} variable products`);
        
        // Check if variations are properly loaded
        let totalVariations = 0;
        let productsWithVariations = 0;
        
        variableProducts.forEach(product => {
          const variationCount = product.productVariations?.length || 0;
          totalVariations += variationCount;
          
          if (variationCount > 0) {
            productsWithVariations++;
            console.log(`Product "${product.name}" (ID: ${product.id}) has ${variationCount} variations`);
          } else {
            console.warn(`Variable product "${product.name}" (ID: ${product.id}) has NO variations`);
          }
        });
        
        console.log(`Total variations: ${totalVariations} across ${productsWithVariations} products`);
        
        // Load recent imports
        const imports = await getSupplierImports();
        setRecentImports(imports.map(imp => ({
          id: imp.id,
          date: new Date(imp.date).toLocaleDateString(),
          supplier: imp.supplier_name,
          filename: imp.filename,
          updated: imp.items_updated,
          skipped: imp.items_skipped
        })).slice(0, 5));
      } catch (error) {
        console.error('Error loading products data:', error);
        setError('Failed to load products data. Please check your API credentials and try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter products when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = products.filter(product => {
        // Check if product name or SKU matches
        const productMatches = 
          product.name.toLowerCase().includes(term) ||
          (product.sku && product.sku.toLowerCase().includes(term));
          
        // Check if any variation matches
        const variationMatches = product.productVariations?.some(
          variation => 
            (variation.name?.toLowerCase().includes(term) || false) ||
            (variation.sku && variation.sku.toLowerCase().includes(term))
        );
        
        return productMatches || variationMatches;
      });
      
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const handleSort = (field: keyof Product) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleImportSuccess = async (updatedImports: any) => {
    setRecentImports(updatedImports);
    
    try {
      // Transfer supplier prices from supplier_import_items to inventory
      await transferSupplierPrices();
    } catch (error) {
      console.error('Error transferring supplier prices:', error);
      
      // Reload product data to show updated supplier prices
      try {
        await loadProductData();
      } catch (loadError) {
        console.error('Error reloading product data after supplier import:', loadError);
      }
    }
  };

  const checkSupplierPrices = async () => {
    try {
      console.log('Checking supplier prices in the database...');
      const inventory = await inventoryService.getAll();
      const itemsWithSupplierPrice = inventory.filter(item => item.supplier_price && item.supplier_price > 0);
      console.log(`Found ${itemsWithSupplierPrice.length} inventory items with supplier price out of ${inventory.length}`);
      
      if (itemsWithSupplierPrice.length > 0) {
        console.log('Sample inventory items with supplier prices:');
        itemsWithSupplierPrice.slice(0, 3).forEach(item => {
          console.log(`- SKU: ${item.sku}, Supplier Price: ${item.supplier_price}, Supplier: ${item.supplier_name || 'unknown'}`);
        });
      }
      
      // Also check if these items are in the products list
      const productsWithSupplierPrice = products.filter(p => p.supplier_price && p.supplier_price > 0);
      console.log(`Found ${productsWithSupplierPrice.length} products with supplier price out of ${products.length}`);
      
      if (productsWithSupplierPrice.length > 0) {
        console.log('Sample products with supplier prices:');
        productsWithSupplierPrice.slice(0, 3).forEach(p => {
          console.log(`- ${p.name} (SKU: ${p.sku}): ${p.supplier_price} from ${p.supplier_name || 'unknown'}`);
        });
      }
      
      alert(`Found ${itemsWithSupplierPrice.length} inventory items and ${productsWithSupplierPrice.length} products with supplier prices. Check the console for details.`);
    } catch (error) {
      console.error('Error checking supplier prices:', error);
      alert('Error checking supplier prices. See console for details.');
    }
  };

  const transferSupplierPrices = async () => {
    try {
      setLoading(true);
      
      // Get all supplier import items with prices
      const { data: importItems, error } = await supabase
        .from('supplier_import_items')
        .select('*')
        .gt('supplier_price', 0);
      
      if (error) {
        throw error;
      }
      
      console.log(`Found ${importItems.length} supplier import items with prices`);
      
      // Get all inventory items
      const inventory = await inventoryService.getAll();
      console.log(`Found ${inventory.length} inventory items`);
      
      // Get all products and variations
      const products = await productsService.getAll();
      const variations = await productVariationsService.getAll();
      console.log(`Found ${products.length} products and ${variations.length} variations`);
      
      // Create a map of SKUs to products and variations
      const skuToProduct = new Map();
      const skuToVariation = new Map();
      
      products.forEach(product => {
        if (product.sku) {
          skuToProduct.set(product.sku, product);
        }
      });
      
      variations.forEach(variation => {
        if (variation.sku) {
          skuToVariation.set(variation.sku, variation);
        }
      });
      
      // Create a map of SKUs to inventory items
      const skuToInventory = new Map();
      inventory.forEach(item => {
        if (item.sku) {
          skuToInventory.set(item.sku, item);
        }
      });
      
      // Process each import item
      let updatedCount = 0;
      let createdCount = 0;
      let skippedCount = 0;
      
      for (const item of importItems) {
        try {
          const { sku, supplier_price } = item;
          
          if (!sku || !supplier_price) {
            skippedCount++;
            continue;
          }
          
          // Get the supplier name from the import
          const { data: importData } = await supabase
            .from('supplier_imports')
            .select('supplier_name')
            .eq('id', item.import_id)
            .single();
          
          const supplierName = importData?.supplier_name || 'Unknown';
          
          // Check if we have an inventory item for this SKU
          const inventoryItem = skuToInventory.get(sku);
          
          if (inventoryItem) {
            // Update the existing inventory item
            await inventoryService.update(inventoryItem.id!, {
              supplier_price,
              supplier_name: supplierName,
              supplier_updated: new Date()
            });
            updatedCount++;
          } else {
            // Create a new inventory item
            const product = skuToProduct.get(sku);
            const variation = skuToVariation.get(sku);
            
            if (product) {
              // Create inventory item for product
              await inventoryService.add({
                product_id: product.id,
                sku,
                supplier_price,
                supplier_name: supplierName,
                supplier_updated: new Date()
              });
              createdCount++;
            } else if (variation) {
              // Create inventory item for variation
              await inventoryService.add({
                product_id: variation.parent_id,
                variation_id: variation.id,
                sku,
                supplier_price,
                supplier_name: supplierName,
                supplier_updated: new Date()
              });
              createdCount++;
            } else {
              console.warn(`No product or variation found for SKU ${sku}`);
              skippedCount++;
            }
          }
        } catch (error) {
          console.error('Error processing import item:', error);
          skippedCount++;
        }
      }
      
      console.log(`Processed supplier prices: ${updatedCount} updated, ${createdCount} created, ${skippedCount} skipped`);
      alert(`Processed supplier prices: ${updatedCount} updated, ${createdCount} created, ${skippedCount} skipped`);
      
      // Reload product data
      await loadProductData();
    } catch (error) {
      console.error('Error transferring supplier prices:', error);
      alert(`Error transferring supplier prices: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    // Handle special cases for numeric fields
    if (sortField === 'price' || sortField === 'cost_price' || sortField === 'stock_quantity' || 
        sortField === 'regular_price' || sortField === 'sale_price' || sortField === 'supplier_price') {
      aValue = aValue || 0;
      bValue = bValue || 0;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowImportForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
          >
            <Upload className="h-4 w-4 mr-1" />
            Import Supplier Prices
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Supplier Price Import Form */}
      {showImportForm && (
        <SupplierImportForm 
          onClose={() => setShowImportForm(false)}
          onSuccess={handleImportSuccess}
          recentImports={recentImports}
        />
      )}
      
      {/* Products Table */}
      <div className="overflow-hidden">
        <ProductTable 
          products={sortedProducts}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onProductsUpdated={(updatedProducts) => {
            setProducts(updatedProducts);
            setFilteredProducts(updatedProducts);
          }}
        />
      </div>
    </div>
  );
};

export default Products;