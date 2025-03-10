import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Product } from './types';

interface ProductSelectorProps {
  products: Product[];
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  initialSku?: string;
  initialProductName?: string;
  initialStock?: number;
  autoFocus?: boolean;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  products,
  selectedProduct,
  setSelectedProduct,
  initialSku,
  initialProductName,
  initialStock,
  autoFocus = false
}) => {
  // Log props for debugging
  console.log('ProductSelector props:', { initialSku, initialProductName, initialStock, autoFocus });
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);

  // Initialize selected product if initialSku is provided
  useEffect(() => {
    if (initialSku && initialProductName && initialStock !== undefined) {
      console.log('Initializing selected product:', { initialSku, initialProductName, initialStock });
      setSelectedProduct({
        sku: initialSku,
        name: initialProductName,
        stock_quantity: initialStock,
        supplier_price: 0
      });
    }
  }, [initialSku, initialProductName, initialStock, setSelectedProduct]);

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
        
        // Then try direct includes
        if (skuLower.includes(searchTermLower) || 
            nameLower.includes(searchTermLower) || 
            parentNameLower.includes(searchTermLower)) {
          return true;
        }
        
        // Try with compact SKU
        if (compactSku.includes(compactSearchTerm)) {
          return true;
        }
        
        // Try with normalized values
        if (normalizedName.includes(normalizedSearchTerm) || 
            normalizedSku.includes(normalizedSearchTerm) || 
            normalizedParentName.includes(normalizedSearchTerm)) {
          return true;
        }
        
        return false;
      });
      
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm('');
    setShowProductDropdown(false);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Product
      </label>
      {selectedProduct ? (
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-white p-3 rounded-lg border border-blue-100 shadow-sm">
          <div className="flex-grow">
            <div className="font-medium flex items-center">
              {selectedProduct.is_variation && (
                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full mr-2">
                  Variation
                </span>
              )}
              {selectedProduct.name}
            </div>
            <div className="text-xs text-gray-700 font-mono mt-1">
              SKU: {selectedProduct.sku || <span className="text-red-500">No SKU</span>}
            </div>
            {selectedProduct.is_variation && selectedProduct.parent_name && (
              <div className="text-xs text-gray-600 mt-0.5">Parent product: {selectedProduct.parent_name}</div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className="text-sm bg-blue-100 px-2 py-0.5 rounded-full font-medium">
              Stock: {selectedProduct.stock_quantity} units
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedProduct(null)}
              className="text-xs text-blue-600 hover:text-blue-800 mt-2 flex items-center"
            >
              <X size={12} className="mr-1" /> Change
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center border rounded-lg overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-300 transition-all">
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
              className="p-3 w-full outline-none"
              placeholder="Enter product name or SKU (e.g., BH205)"
              autoFocus={autoFocus}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-1">
            Search by product name or SKU. Partial matches are supported.
          </p>
          
          {showProductDropdown && searchTerm.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div className="sticky top-0 bg-gray-100 p-2 border-b text-xs font-medium text-gray-700 flex justify-between items-center">
                <span>{filteredProducts.length} products found</span>
                <button 
                  onClick={() => setShowProductDropdown(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={14} />
                </button>
              </div>
              
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div
                    key={product.sku}
                    className={`p-3 hover:bg-blue-50 cursor-pointer border-b transition-colors ${
                      product.is_variation ? 'pl-5 border-l-2 border-l-blue-200' : ''
                    }`}
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="font-medium flex items-center">
                      {product.is_variation && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full mr-2">
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
                      <div className="text-xs bg-blue-100 px-2 py-0.5 rounded-full">
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
  );
};

export default ProductSelector; 