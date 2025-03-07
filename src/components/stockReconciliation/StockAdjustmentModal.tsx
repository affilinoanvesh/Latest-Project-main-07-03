import React, { useState, useEffect } from 'react';
import { MovementReason } from '../../types';
import { X, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { saveAdditionalRevenue } from '../../db/operations/additionalRevenue';
import { additionalRevenueCategoriesService } from '../../services/additionalRevenueService';

interface StockAdjustmentModalProps {
  sku?: string;
  productName?: string;
  currentStock?: number;
  onSubmit: (data: {
    sku: string;
    quantity: number;
    reason: MovementReason;
    notes: string;
    batchNumber?: string;
    date: Date;
    lossPercentage?: number;
    isManualSale?: boolean;
    saleAmount?: number;
  }) => void;
  onClose: () => void;
  products?: Array<{
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  }>;
}

// LossAmountInput component to ensure clean rendering
const LossAmountInput = ({
  lossAmount,
  setLossAmount,
  quantity,
  selectedProduct
}: {
  lossAmount: number;
  setLossAmount: (value: number) => void;
  quantity: number;
  selectedProduct: {
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  };
}) => (
  <div className="mb-3">
    <label htmlFor="lossAmount" className="block text-sm font-medium text-gray-700 mb-1">
      Loss Amount ($)
    </label>
    <input
      id="lossAmount"
      type="number"
      step="0.01"
      min="0"
      value={lossAmount || ''}
      onChange={(e) => setLossAmount(parseFloat(e.target.value) || 0)}
      className="border rounded p-2 w-full"
      placeholder="Enter loss amount"
    />
    {selectedProduct.supplier_price && selectedProduct.supplier_price > 0 && (
      <p className="text-xs text-gray-600 mt-1">
        Maximum possible loss: ${(Math.abs(quantity) * selectedProduct.supplier_price).toFixed(2)} 
        ({Math.abs(quantity)} units × ${selectedProduct.supplier_price})
      </p>
    )}
  </div>
);

// LossSection component to ensure clean rendering
const LossSection = ({
  lossAmount,
  setLossAmount,
  quantity,
  selectedProduct
}: {
  lossAmount: number;
  setLossAmount: (value: number) => void;
  quantity: number;
  selectedProduct: {
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  };
}) => {
  return (
    <div className="border-l-4 border-red-400 pl-3 py-2 bg-red-50 rounded">
      <div className="mb-3">
        <label htmlFor="lossAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Loss Amount ($)
        </label>
        <input
          id="lossAmount"
          type="number"
          step="0.01"
          min="0"
          value={lossAmount === 0 ? '' : lossAmount}
          onChange={(e) => setLossAmount(parseFloat(e.target.value) || 0)}
          className="border rounded p-2 w-full"
          placeholder="Enter loss amount"
        />
        {selectedProduct.supplier_price && selectedProduct.supplier_price > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            Maximum possible loss: ${(Math.abs(quantity) * selectedProduct.supplier_price).toFixed(2)} 
            ({Math.abs(quantity)} units × ${selectedProduct.supplier_price})
          </p>
        )}
      </div>
      
      <div className="text-sm text-gray-600">
        <p className="font-medium">What happens:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Expected stock will be reduced by {Math.abs(quantity)} units (actual website inventory is not affected)</li>
          <li>Loss of ${lossAmount.toFixed(2)} will be recorded</li>
          <li>This loss will appear in financial reports</li>
        </ul>
      </div>
    </div>
  );
};

// ExpiryDetails component to ensure clean rendering
const ExpiryDetails = ({
  isManualSale,
  setIsManualSale,
  saleAmount,
  setSaleAmount,
  lossAmount,
  setLossAmount,
  quantity,
  selectedProduct
}: {
  isManualSale: boolean;
  setIsManualSale: (value: boolean) => void;
  saleAmount: number;
  setSaleAmount: (value: number) => void;
  lossAmount: number;
  setLossAmount: (value: number) => void;
  quantity: number;
  selectedProduct: {
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  };
}) => {
  // Render the manual sale section
  const renderManualSaleSection = () => (
    <div className="border-l-4 border-green-400 pl-3 py-2 bg-green-50 rounded">
      <div className="mb-3">
        <label htmlFor="saleAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Sale Amount ($)
        </label>
        <input
          id="saleAmount"
          type="number"
          step="0.01"
          value={saleAmount || ''}
          onChange={(e) => setSaleAmount(parseFloat(e.target.value) || 0)}
          className="border rounded p-2 w-full"
          placeholder="Enter sale amount"
        />
        <p className="text-xs text-gray-600 mt-1">
          This amount will be added as additional revenue
        </p>
      </div>
      
      <div className="text-sm text-gray-600">
        <p className="font-medium">What happens:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Expected stock will be reduced by {Math.abs(quantity)} units (actual website inventory is not affected)</li>
          <li>Revenue of ${saleAmount.toFixed(2)} will be recorded</li>
          <li>No loss will be recorded (since you recovered value)</li>
        </ul>
      </div>
    </div>
  );

  // Render the loss section
  const renderLossSection = () => (
    <LossSection
      lossAmount={lossAmount}
      setLossAmount={setLossAmount}
      quantity={quantity}
      selectedProduct={selectedProduct}
    />
  );

  return (
    <div className="mb-4 border rounded p-3 bg-gray-50">
      <h3 className="font-medium text-gray-700 mb-2">Expiry Details</h3>
      
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <input
            id="isManualSale"
            type="checkbox"
            checked={isManualSale}
            onChange={(e) => setIsManualSale(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="isManualSale" className="ml-2 block text-sm text-gray-700 font-medium">
            This product was sold manually
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Check this if you sold the expired product (e.g., at a discount) instead of disposing it
        </p>
        
        {isManualSale ? renderManualSaleSection() : renderLossSection()}
      </div>
    </div>
  );
};

// Create a completely new component for the expiry section
function ExpiryDetailsNew({
  isManualSale,
  setIsManualSale,
  saleAmount,
  setSaleAmount,
  lossAmount,
  setLossAmount,
  quantity,
  selectedProduct
}: {
  isManualSale: boolean;
  setIsManualSale: (value: boolean) => void;
  saleAmount: number;
  setSaleAmount: (value: number) => void;
  lossAmount: number;
  setLossAmount: (value: number) => void;
  quantity: number;
  selectedProduct: {
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  };
}) {
  // Manual sale section
  function ManualSaleSection() {
    return (
      <div className="border-l-4 border-green-400 pl-3 py-2 bg-green-50 rounded">
        <div className="mb-3">
          <label htmlFor="saleAmount" className="block text-sm font-medium text-gray-700 mb-1">
            Sale Amount ($)
          </label>
          <input
            id="saleAmount"
            type="number"
            step="0.01"
            value={saleAmount === 0 ? '' : saleAmount}
            onChange={(e) => setSaleAmount(parseFloat(e.target.value) || 0)}
            className="border rounded p-2 w-full"
            placeholder="Enter sale amount"
          />
          <p className="text-xs text-gray-600 mt-1">
            This amount will be added as additional revenue
          </p>
        </div>
        
        <div className="text-sm text-gray-600">
          <p className="font-medium">What happens:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Expected stock will be reduced by {Math.abs(quantity)} units (actual website inventory is not affected)</li>
            <li>Revenue of ${saleAmount.toFixed(2)} will be recorded</li>
            <li>No loss will be recorded (since you recovered value)</li>
          </ul>
        </div>
      </div>
    );
  }

  // Loss section
  function LossSectionNew() {
    return (
      <div className="border-l-4 border-red-400 pl-3 py-2 bg-red-50 rounded">
        <div className="mb-3">
          <label htmlFor="lossAmount" className="block text-sm font-medium text-gray-700 mb-1">
            Loss Amount ($)
          </label>
          <input
            id="lossAmount"
            type="number"
            step="0.01"
            min="0"
            value={lossAmount === 0 ? '' : lossAmount}
            onChange={(e) => setLossAmount(parseFloat(e.target.value) || 0)}
            className="border rounded p-2 w-full"
            placeholder="Enter loss amount"
          />
          {selectedProduct.supplier_price && selectedProduct.supplier_price > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Maximum possible loss: ${(Math.abs(quantity) * selectedProduct.supplier_price).toFixed(2)} 
              ({Math.abs(quantity)} units × ${selectedProduct.supplier_price})
            </p>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          <p className="font-medium">What happens:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Expected stock will be reduced by {Math.abs(quantity)} units (actual website inventory is not affected)</li>
            <li>Loss of ${lossAmount.toFixed(2)} will be recorded</li>
            <li>This loss will appear in financial reports</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 border rounded p-3 bg-gray-50">
      <h3 className="font-medium text-gray-700 mb-2">Expiry Details</h3>
      
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <input
            id="isManualSale"
            type="checkbox"
            checked={isManualSale}
            onChange={(e) => setIsManualSale(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="isManualSale" className="ml-2 block text-sm text-gray-700 font-medium">
            This product was sold manually
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Check this if you sold the expired product (e.g., at a discount) instead of disposing it
        </p>
        
        {isManualSale ? <ManualSaleSection /> : <LossSectionNew />}
      </div>
    </div>
  );
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  sku,
  productName,
  currentStock,
  onSubmit,
  onClose,
  products = []
}) => {
  const [selectedSku, setSelectedSku] = useState<string>(sku || '');
  const [selectedProduct, setSelectedProduct] = useState<{
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  } | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState<MovementReason>('other');
  const [notes, setNotes] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<Array<{
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  }>>(products);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);
  const [isManualSale, setIsManualSale] = useState<boolean>(false);
  const [saleAmount, setSaleAmount] = useState<number>(0);
  const [lossAmount, setLossAmount] = useState<number>(0);

  // Initialize selected product if sku is provided
  useEffect(() => {
    if (sku && productName && currentStock !== undefined) {
      setSelectedProduct({
        sku,
        name: productName,
        stock_quantity: currentStock,
        supplier_price: 0
      });
    }
  }, [sku, productName, currentStock]);

  // Filter products based on search term
  useEffect(() => {
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase().trim();
      
      // Create a normalized search term that removes special characters
      const normalizedSearchTerm = searchTermLower
        .replace(/[^\w\s]/gi, '') // Remove special characters
        .replace(/\s+/g, ' ')     // Replace multiple spaces with a single space
        .trim();
      
      // Also create a version with no separators for SKU matching
      const compactSearchTerm = searchTermLower.replace(/[\s\-_.]/g, '');
      
      console.log(`Searching for: "${searchTermLower}" (normalized: "${normalizedSearchTerm}", compact: "${compactSearchTerm}")`);
      console.log(`Total products available: ${products.length}`);
      
      // Create a case-insensitive RegExp for more flexible matching
      let searchRegex;
      try {
        // Escape special regex characters to avoid errors
        const escapedSearchTerm = searchTermLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchRegex = new RegExp(escapedSearchTerm, 'i');
      } catch (e) {
        console.error('Error creating regex:', e);
        // Fallback to simple includes if regex fails
        searchRegex = null;
      }
      
      const filtered = products.filter(product => {
        // First check if product has a valid SKU
        if (!product.sku) return false;
        
        const skuLower = product.sku.toLowerCase();
        const nameLower = (product.name || '').toLowerCase();
        const parentNameLower = (product.parent_name || '').toLowerCase();
        
        // Create a compact version of the SKU with no separators
        const compactSku = skuLower.replace(/[\s\-_.]/g, '');
        
        // Normalize product data for searching
        const normalizedName = nameLower.replace(/[^\w\s]/gi, '');
        const normalizedSku = skuLower.replace(/[^\w\s]/gi, '');
        const normalizedParentName = parentNameLower.replace(/[^\w\s]/gi, '');
        
        // Try regex match first if available
        if (searchRegex) {
          if (searchRegex.test(skuLower) || searchRegex.test(nameLower) || searchRegex.test(parentNameLower)) {
            return true;
          }
        }
        
        // Direct match on SKU should always be included
        if (skuLower === searchTermLower) return true;
        
        // Check for compact SKU matches (ignoring separators)
        if (compactSku.includes(compactSearchTerm) || compactSearchTerm.includes(compactSku)) {
          return true;
        }
        
        // For SKU searches, we want to be more lenient and allow partial matches
        // This is especially important for SKUs that might have prefixes or suffixes
        if (normalizedSku.includes(normalizedSearchTerm) || normalizedSearchTerm.includes(normalizedSku)) {
          return true;
        }
        
        // Search by name or parent name
        return (
          normalizedName.includes(normalizedSearchTerm) || 
          normalizedParentName.includes(normalizedSearchTerm)
        );
      });
      
      console.log(`Found ${filtered.length} matching products`);
      if (filtered.length > 0) {
        console.log('Sample matches:', filtered.slice(0, 3).map(p => `${p.name} (${p.sku})`));
      } else {
        console.log('No matches found. Search term:', searchTermLower);
        // Log some sample products to help debug
        console.log('Sample available products:', products.slice(0, 5).map(p => `${p.name} (${p.sku})`));
      }
      
      // Sort results: exact SKU matches first, then partial SKU matches, then by name
      const sortedResults = [...filtered].sort((a, b) => {
        const aSkuLower = a.sku.toLowerCase();
        const bSkuLower = b.sku.toLowerCase();
        
        // Exact SKU matches come first
        if (aSkuLower === searchTermLower) return -1;
        if (bSkuLower === searchTermLower) return 1;
        
        // Then partial SKU matches (SKU contains search term)
        const aContainsTerm = aSkuLower.includes(searchTermLower);
        const bContainsTerm = bSkuLower.includes(searchTermLower);
        
        if (aContainsTerm && !bContainsTerm) return -1;
        if (!aContainsTerm && bContainsTerm) return 1;
        
        // Then search term contains SKU
        const termContainsA = searchTermLower.includes(aSkuLower);
        const termContainsB = searchTermLower.includes(bSkuLower);
        
        if (termContainsA && !termContainsB) return -1;
        if (!termContainsA && termContainsB) return 1;
        
        // Then sort by name
        return a.name.localeCompare(b.name);
      });
      
      setFilteredProducts(sortedResults);
    } else {
      // Only show products with valid SKUs, sorted by name
      setFilteredProducts(
        products
          .filter(product => !!product.sku)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
  }, [searchTerm, products]);

  // Calculate default loss amount when relevant fields change
  useEffect(() => {
    if (reason === 'expiry' && quantity < 0 && selectedProduct?.supplier_price && !isManualSale) {
      const totalLoss = Math.abs(quantity) * (selectedProduct.supplier_price || 0);
      setLossAmount(totalLoss);
    }
  }, [reason, quantity, selectedProduct, isManualSale]);

  const handleProductSelect = (product: {
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  }) => {
    setSelectedProduct(product);
    setSelectedSku(product.sku);
    setShowProductDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }
    
    if (quantity === 0) {
      setError('Quantity cannot be zero');
      return;
    }

    // Handle expiry with special logic
    if (reason === 'expiry' && quantity < 0) {
      if (isManualSale) {
        // For manual sales, ensure we have a sale amount
        if (saleAmount <= 0) {
          setError('Please enter a valid sale amount for manual sales');
          return;
        }

        // Add to additional revenue
        try {
          // First, try to get the category ID for "Manual Sale"
          let categoryId: number | undefined;
          try {
            const category = await additionalRevenueCategoriesService.getCategoryByName('Manual Sale');
            if (category && category.id) {
              categoryId = category.id;
            }
          } catch (error) {
            console.error('Error finding category:', error);
          }
          
          await saveAdditionalRevenue({
            amount: saleAmount,
            date: date,
            category: 'Manual Sale',
            category_id: categoryId || 0, // Provide a default if not found
            description: `Manual sale of expired product: ${selectedProduct.name} - ${notes || 'Expired product sold manually'}`,
            reference: selectedProduct.sku,
            tax_included: true
          });
          
          console.log(`Added revenue of $${saleAmount} for manual sale of expired product ${selectedProduct.sku}`);
        } catch (error) {
          console.error('Error saving additional revenue:', error);
          setError('Failed to record additional revenue');
          return;
        }
      } else {
        // For regular expiry (not manually sold), we record the loss
        console.log(`Recorded loss of $${lossAmount.toFixed(2)} for expired product ${selectedProduct.sku}`);
      }
    }
    
    // Calculate loss percentage based on the entered loss amount and supplier price
    let lossPercentage: number | undefined;
    if (reason === 'expiry' && !isManualSale && selectedProduct.supplier_price && selectedProduct.supplier_price > 0) {
      const totalPossibleLoss = Math.abs(quantity) * selectedProduct.supplier_price;
      lossPercentage = totalPossibleLoss > 0 ? (lossAmount / totalPossibleLoss) * 100 : 100;
    }
    
    // Submit the stock adjustment
    onSubmit({
      sku: selectedProduct.sku,
      quantity,
      reason,
      notes,
      batchNumber: batchNumber || undefined,
      date,
      // Only include loss percentage if it's an expiry and not a manual sale
      lossPercentage: (reason === 'expiry' && !isManualSale) ? lossPercentage : undefined,
      // Only include manual sale info if it's an expiry and is a manual sale
      isManualSale: (reason === 'expiry') ? isManualSale : undefined,
      saleAmount: (isManualSale && reason === 'expiry') ? saleAmount : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold">Manual Stock Adjustment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {/* Product Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            {selectedProduct ? (
              <div className="flex items-center justify-between bg-gray-100 p-2 rounded">
                <div className="flex-grow">
                  <div className="font-medium flex items-center">
                    {selectedProduct.is_variation && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mr-2">
                        Variation
                      </span>
                    )}
                    {selectedProduct.name}
                  </div>
                  <div className="text-xs text-gray-700 font-mono">
                    SKU: {selectedProduct.sku || <span className="text-red-500">No SKU</span>}
                  </div>
                  {selectedProduct.is_variation && selectedProduct.parent_name && (
                    <div className="text-xs text-gray-600">Parent product: {selectedProduct.parent_name}</div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-sm bg-gray-200 px-2 py-0.5 rounded">
                    Stock: {selectedProduct.stock_quantity} units
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSelectedProduct(null)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center border rounded overflow-hidden">
                  <div className="px-3 text-gray-500">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="p-2 w-full outline-none"
                    placeholder="Enter product name or SKU (e.g., BH205)"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Search by product name or SKU. Partial matches are supported.
                  {process.env.NODE_ENV !== 'production' && (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('All available products:', products);
                        alert(`Loaded ${products.length} products. Check console for details.`);
                      }}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      Debug
                    </button>
                  )}
                </p>
                
                {showProductDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                    <div className="sticky top-0 bg-gray-100 p-2 border-b text-xs font-medium text-gray-700">
                      {filteredProducts.length} products found
                    </div>
                    
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <div
                          key={product.sku}
                          className={`p-3 hover:bg-gray-100 cursor-pointer border-b ${product.is_variation ? 'pl-5 border-l-2 border-l-blue-200' : ''}`}
                          onClick={() => handleProductSelect(product)}
                        >
                          <div className="font-medium flex items-center">
                            {product.is_variation && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mr-2">
                                Variation
                              </span>
                            )}
                            {product.name}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <div className="text-xs text-gray-600">
                              SKU: {product.sku ? (
                                <span className="font-mono">{product.sku}</span>
                              ) : (
                                <span className="text-red-500 font-mono">No SKU</span>
                              )}
                              {product.is_variation && product.parent_name && (
                                <span className="ml-1">
                                  (of {product.parent_name})
                                </span>
                              )}
                            </div>
                            <div className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                              Stock: {product.stock_quantity}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <div className="text-gray-500 mb-2">
                          No products found. Try a different search term.
                        </div>
                        <div className="text-xs text-gray-400">
                          <p>Suggestions:</p>
                          <ul className="list-disc pl-5 mt-1 text-left">
                            <li>Check for typos in your search</li>
                            <li>Try searching with just part of the SKU</li>
                            <li>Search by product name instead</li>
                            <li>Make sure the product exists in your inventory</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Date Field */}
          <div className="mb-4">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Calendar size={16} className="text-gray-500" />
              </div>
              <input
                type="date"
                id="date"
                value={format(date, 'yyyy-MM-dd')}
                onChange={(e) => setDate(new Date(e.target.value))}
                className="border rounded p-2 pl-10 w-full"
              />
            </div>
          </div>
          
          {/* Current Stock - only shown if product is selected */}
          {selectedProduct && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Stock
              </label>
              <div className="text-sm bg-gray-100 p-2 rounded">
                {selectedProduct.stock_quantity} units
              </div>
            </div>
          )}
          
          {/* Adjustment Quantity */}
          <div className="mb-4">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment Quantity
            </label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setQuantity(prev => prev - 1)}
                className="bg-gray-200 px-3 py-2 rounded-l"
              >
                -
              </button>
              <input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="border-y p-2 text-center w-full"
                placeholder="Enter quantity"
              />
              <button
                type="button"
                onClick={() => setQuantity(prev => prev + 1)}
                className="bg-gray-200 px-3 py-2 rounded-r"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use negative values for removing stock, positive for adding stock
            </p>
          </div>
          
          {/* Reason */}
          <div className="mb-4">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as MovementReason)}
              className="border rounded p-2 w-full"
            >
              <option value="expiry">Expiry</option>
              <option value="damage">Damage</option>
              <option value="theft">Theft</option>
              <option value="correction">Correction</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          {/* Expiry-specific fields */}
          {reason === 'expiry' && quantity < 0 && selectedProduct && (
            <ExpiryDetailsNew
              isManualSale={isManualSale}
              setIsManualSale={setIsManualSale}
              saleAmount={saleAmount}
              setSaleAmount={setSaleAmount}
              lossAmount={lossAmount}
              setLossAmount={setLossAmount}
              quantity={quantity}
              selectedProduct={selectedProduct}
            />
          )}
          
          {/* Batch Number */}
          <div className="mb-4">
            <label htmlFor="batchNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Batch Number (Optional)
            </label>
            <input
              id="batchNumber"
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="border rounded p-2 w-full"
              placeholder="Enter batch number if applicable"
            />
          </div>
          
          {/* Notes */}
          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border rounded p-2 w-full"
              rows={3}
              placeholder="Enter detailed notes about this adjustment"
            />
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustmentModal; 