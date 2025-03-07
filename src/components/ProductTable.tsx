import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Edit, Save, X, ChevronRight } from 'lucide-react';
import { Product, ProductVariation } from '../types';
import { updateCostPrice } from '../db/operations/inventory';

interface ProductTableProps {
  products: Product[];
  sortField: keyof Product;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof Product) => void;
  onProductsUpdated: (products: Product[]) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({ 
  products, 
  sortField, 
  sortDirection, 
  onSort,
  onProductsUpdated
}) => {
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingVariationId, setEditingVariationId] = useState<number | null>(null);
  const [editedCostPrice, setEditedCostPrice] = useState<string>('');
  const [expandedProductIds, setExpandedProductIds] = useState<Set<number>>(new Set());
  const [expandableProducts, setExpandableProducts] = useState<Set<number>>(new Set());

  // Identify expandable products on component mount or when products change
  useEffect(() => {
    const expandable = new Set<number>();
    products.forEach(product => {
      if (product.type === 'variable' && product.productVariations && product.productVariations.length > 0) {
        expandable.add(product.id);
      }
      
      // Debug: Log supplier prices
      if (product.supplier_price && product.supplier_price > 0) {
        console.log(`Product ${product.name} (SKU: ${product.sku}) has supplier price: ${product.supplier_price}`);
      }
      
      // Check variations for supplier prices
      if (product.productVariations) {
        product.productVariations.forEach(variation => {
          if (variation.supplier_price && variation.supplier_price > 0) {
            console.log(`Variation (SKU: ${variation.sku}) has supplier price: ${variation.supplier_price}`);
          }
        });
      }
    });
    setExpandableProducts(expandable);
    
    // Debug: Log information about expandable products
    console.log(`Found ${expandable.size} expandable products with variations`);
    products.filter(p => expandable.has(p.id)).forEach(p => {
      console.log(`Expandable product: ${p.name} (ID: ${p.id}) has ${p.productVariations?.length || 0} variations`);
    });
  }, [products]);

  const formatCurrency = (value: number | undefined) => {
    const numValue = typeof value === 'number' ? value : 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue);
  };

  const startEditing = (product: Product, variationId?: number) => {
    setEditingProductId(product.id);
    setEditingVariationId(variationId || null);
    
    if (variationId) {
      const variation = product.productVariations?.find(v => v.id === variationId);
      setEditedCostPrice((variation?.cost_price || 0).toString());
    } else {
      setEditedCostPrice((product.cost_price || 0).toString());
    }
  };

  const cancelEditing = () => {
    setEditingProductId(null);
    setEditingVariationId(null);
    setEditedCostPrice('');
  };

  const saveProductCost = async (productId: number, variationId?: number) => {
    const costPrice = parseFloat(editedCostPrice) || 0;
    
    try {
      // Find the SKU for the product or variation
      let sku = '';
      if (variationId) {
        // Find the variation SKU
        const product = products.find(p => p.id === productId);
        const variation = product?.productVariations?.find(v => v.id === variationId);
        sku = variation?.sku || '';
      } else {
        // Find the product SKU
        const product = products.find(p => p.id === productId);
        sku = product?.sku || '';
      }
      
      if (!sku) {
        console.error('Could not find SKU for product/variation');
        return;
      }
      
      // Update in database
      await updateCostPrice(sku, costPrice);
      
      // Update local state
      const updatedProducts = products.map(product => {
        if (product.id === productId) {
          if (variationId && product.productVariations) {
            // Update variation cost price
            const updatedVariations = product.productVariations.map(variation => {
              if (variation.id === variationId) {
                return {
                  ...variation,
                  cost_price: costPrice
                };
              }
              return variation;
            });
            
            return {
              ...product,
              productVariations: updatedVariations
            };
          } else {
            // Update product cost price
            return {
              ...product,
              cost_price: costPrice
            };
          }
        }
        return product;
      });
      
      onProductsUpdated(updatedProducts);
      setEditingProductId(null);
      setEditingVariationId(null);
      setEditedCostPrice('');
    } catch (error) {
      console.error('Error updating cost price:', error);
    }
  };

  const calculateMargin = (price: number | undefined, costPrice: number | undefined) => {
    const numPrice = typeof price === 'number' ? price : 0;
    const numCostPrice = typeof costPrice === 'number' ? costPrice : 0;
    
    if (numPrice === 0 || numCostPrice === 0) return 0;
    
    return ((numPrice - numCostPrice) / numPrice) * 100;
  };

  const toggleProductExpand = (productId: number) => {
    const newExpandedIds = new Set(expandedProductIds);
    if (newExpandedIds.has(productId)) {
      newExpandedIds.delete(productId);
    } else {
      newExpandedIds.add(productId);
    }
    setExpandedProductIds(newExpandedIds);
  };

  const handleRowClick = (product: Product, event: React.MouseEvent) => {
    // Only handle row clicks for variable products with variations
    if (product.type === 'variable' && product.productVariations && product.productVariations.length > 0) {
      // Don't toggle if clicking on action buttons
      if ((event.target as HTMLElement).closest('button')) {
        return;
      }
      toggleProductExpand(product.id);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expand
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center">
                  Product Name
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('sku')}
              >
                <div className="flex items-center">
                  SKU
                  {sortField === 'sku' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('regular_price')}
              >
                <div className="flex items-center">
                  Regular Price
                  {sortField === 'regular_price' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('sale_price')}
              >
                <div className="flex items-center">
                  Sale Price
                  {sortField === 'sale_price' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('cost_price')}
              >
                <div className="flex items-center">
                  Cost Price
                  {sortField === 'cost_price' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('supplier_price')}
              >
                <div className="flex items-center">
                  Supplier Price
                  {sortField === 'supplier_price' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div className="flex items-center">
                  Margin
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('stock_quantity')}
              >
                <div className="flex items-center">
                  Stock
                  {sortField === 'stock_quantity' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map(product => (
              <React.Fragment key={product.id}>
                <tr 
                  className={`hover:bg-gray-50 ${expandableProducts.has(product.id) ? 'cursor-pointer' : ''}`}
                  onClick={(e) => handleRowClick(product, e)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expandableProducts.has(product.id) ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProductExpand(product.id);
                        }}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-md flex items-center justify-center w-8 h-8"
                        aria-label={expandedProductIds.has(product.id) ? "Collapse variations" : "Expand variations"}
                      >
                        {expandedProductIds.has(product.id) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      {product.name}
                      {product.type === 'variable' && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          Variable
                        </span>
                      )}
                      {expandableProducts.has(product.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProductExpand(product.id);
                          }}
                          className="ml-2 text-xs text-blue-600 hover:text-blue-800 bg-white border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded-full flex items-center"
                        >
                          {expandedProductIds.has(product.id) ? 'Hide' : 'Show'} variations
                          <ChevronDown className={`h-3 w-3 ml-1 transform transition-transform ${expandedProductIds.has(product.id) ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.sku || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.type === 'variable' ? 'Varies' : formatCurrency(product.regular_price || product.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.type === 'variable' ? 'Varies' : 
                      product.sale_price ? formatCurrency(product.sale_price) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingProductId === product.id && editingVariationId === null ? (
                      <div className="flex items-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24 p-1 border rounded"
                          value={editedCostPrice}
                          onChange={(e) => setEditedCostPrice(e.target.value)}
                        />
                      </div>
                    ) : (
                      product.type === 'variable' ? 'Varies' : formatCurrency(product.cost_price || 0)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.supplier_price && product.supplier_price > 0 ? (
                      <div className="flex flex-col">
                        <span>{formatCurrency(product.supplier_price)}</span>
                        {product.supplier_name && (
                          <span className="text-xs text-gray-400">{product.supplier_name}</span>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.type === 'variable' ? 'Varies' : 
                      `${calculateMargin(
                        product.sale_price || product.regular_price || product.price, 
                        product.supplier_price || product.cost_price
                      ).toFixed(2)}%`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.stock_quantity || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingProductId === product.id && editingVariationId === null ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => saveProductCost(product.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Save className="h-5 w-5" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-red-600 hover:text-red-900"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(product)}
                        className="text-indigo-600 hover:text-indigo-900"
                        disabled={product.type === 'variable'}
                      >
                        <Edit className={`h-5 w-5 ${product.type === 'variable' ? 'opacity-50 cursor-not-allowed' : ''}`} />
                      </button>
                    )}
                  </td>
                </tr>
                
                {/* Variations rows */}
                {expandedProductIds.has(product.id) && product.productVariations && 
                  product.productVariations.map(variation => (
                    <tr key={variation.id} className="bg-gray-50 hover:bg-gray-100 border-t border-gray-100">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 pl-10">
                        <span className="text-gray-600">└ </span>
                        {variation.name ? variation.name.replace(`${product.name} - `, '') : 'Unnamed Variation'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {variation.sku || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(variation.regular_price || variation.price || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {variation.sale_price ? formatCurrency(variation.sale_price) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingProductId === product.id && editingVariationId === variation.id ? (
                          <div className="flex items-center">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-24 p-1 border rounded"
                              value={editedCostPrice}
                              onChange={(e) => setEditedCostPrice(e.target.value)}
                            />
                          </div>
                        ) : (
                          formatCurrency(variation.cost_price || 0)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {variation.supplier_price && variation.supplier_price > 0 ? (
                          <div className="flex flex-col">
                            <span>{formatCurrency(variation.supplier_price)}</span>
                            {variation.supplier_name && (
                              <span className="text-xs text-gray-400">{variation.supplier_name}</span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {calculateMargin(
                          variation.sale_price || variation.regular_price || variation.price, 
                          variation.supplier_price || variation.cost_price
                        ).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {variation.stock_quantity || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingProductId === product.id && editingVariationId === variation.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => saveProductCost(product.id, variation.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Save className="h-5 w-5" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-red-600 hover:text-red-900"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(product, variation.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </React.Fragment>
            ))}
            
            {products.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-500">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;