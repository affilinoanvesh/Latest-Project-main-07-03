import React from 'react';
import { ChevronDown, ChevronUp, Layers, Box } from 'lucide-react';
import { InventoryItem, Product } from '../../types';
import { Tooltip } from './InventoryUtils';

interface InventoryTableProps {
  inventory: InventoryItem[];
  products: Product[];
  sortField: keyof InventoryItem;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof InventoryItem) => void;
  formatCurrency: (amount: number) => string;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  inventory,
  products,
  sortField,
  sortDirection,
  onSort,
  formatCurrency
}) => {
  const renderSortIcon = (field: keyof InventoryItem) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('sku')}
              >
                <div className="flex items-center">
                  <span>SKU</span>
                  {renderSortIcon('sku')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center space-x-1">
                  <span>Product</span>
                  <Tooltip text="Product name and variation details if applicable" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center space-x-1">
                  <span>Type</span>
                  <Tooltip text="Simple product or variation" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('stock_quantity')}
              >
                <div className="flex items-center">
                  <span>Stock</span>
                  {renderSortIcon('stock_quantity')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('regular_price')}
              >
                <div className="flex items-center">
                  <span>Regular Price</span>
                  {renderSortIcon('regular_price')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('sale_price')}
              >
                <div className="flex items-center">
                  <span>Sale Price</span>
                  {renderSortIcon('sale_price')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center space-x-1">
                  <span>Supplier Price</span>
                  <Tooltip text="Price from supplier import - used for cost calculations when available" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('cost_value')}
              >
                <div className="flex items-center space-x-1">
                  <span>Cost Value</span>
                  {renderSortIcon('cost_value')}
                  <Tooltip text="Total cost value of inventory (Stock Quantity × Cost Price)" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('retail_value')}
              >
                <div className="flex items-center space-x-1">
                  <span>Retail Value</span>
                  {renderSortIcon('retail_value')}
                  <Tooltip text="Total retail value of inventory (Stock Quantity × Current Price)" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center space-x-1">
                  <span>Profit Margin</span>
                  <Tooltip text="Percentage profit margin based on current price and cost price" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.map((item, index) => {
              const supplierPrice = item.supplier_price || 0;
              const effectiveCostPrice = supplierPrice > 0 ? supplierPrice : item.cost_price || 0;
              const stockQuantity = item.stock_quantity || 0;
              
              // Get product and variation details for better display
              const product = products.find(p => p.id === item.product_id);
              const isVariation = !!item.variation_id;
              const variation = product?.productVariations?.find(v => v.id === item.variation_id);
              const variationAttributes = variation?.attributes || [];
              
              // Debug log for supplier price
              if (supplierPrice > 0) {
                console.log(`Item ${item.sku} has supplier price: ${supplierPrice} from ${item.supplier_name || 'unknown'}`);
              }
              
              // Get the correct prices directly from the source
              let regularPrice = 0;
              let salePrice = 0;
              
              if (isVariation && variation) {
                // For variations, use the variation's prices directly
                regularPrice = parseFloat(String(variation.regular_price ?? variation.price ?? 0));
                salePrice = parseFloat(String(variation.sale_price ?? 0));
                console.log(`Variation ${item.sku} prices:`, { regularPrice, salePrice, variation });
              } else if (!isVariation && product && product.type !== 'variable') {
                // For simple products, use the product's prices
                regularPrice = parseFloat(String(product.regular_price ?? product.price ?? 0));
                salePrice = parseFloat(String(product.sale_price ?? 0));
              }
              
              const currentPrice = salePrice > 0 ? salePrice : regularPrice;
              const retailValue = stockQuantity * currentPrice;
              const profitMargin = item.profit_margin || 0;
              
              return (
                <tr key={`${item.product_id}-${item.variation_id || 'simple'}-${index}`}
                    className={stockQuantity === 0 ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.sku || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">{product?.name || 'Unknown Product'}</span>
                      {isVariation && variationAttributes.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {variationAttributes.map((attr, i) => (
                            <span key={i} className="inline-block bg-gray-100 rounded-full px-2 py-1 text-xs font-semibold text-gray-700 mr-1 mb-1">
                              {attr.name}: {attr.option}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isVariation ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Layers className="h-3 w-3 mr-1" />
                        Variation
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Box className="h-3 w-3 mr-1" />
                        Simple
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${stockQuantity === 0 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                    {stockQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(regularPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {salePrice > 0 ? (
                      <span className="text-green-600">{formatCurrency(salePrice)}</span>
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {supplierPrice > 0 ? formatCurrency(supplierPrice) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(item.cost_value || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(item.retail_value || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stockQuantity <= 0 ? (
                      <span className="text-gray-400">N/A</span>
                    ) : effectiveCostPrice <= 0 ? (
                      <span className="text-green-600 font-medium">100.00%</span>
                    ) : (
                      (() => {
                        // Color code based on margin
                        let colorClass = "text-red-600"; // Default for low margins
                        
                        if (profitMargin >= 50) {
                          colorClass = "text-green-600";
                        } else if (profitMargin >= 30) {
                          colorClass = "text-green-500";
                        } else if (profitMargin >= 20) {
                          colorClass = "text-yellow-600";
                        } else if (profitMargin >= 10) {
                          colorClass = "text-orange-500";
                        }
                        
                        return <span className={colorClass}>{profitMargin.toFixed(2)}%</span>;
                      })()
                    )}
                  </td>
                </tr>
              );
            })}
            
            {inventory.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-500">
                  No inventory items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable; 