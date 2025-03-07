import React from 'react';
import { X, Tag, Calendar } from 'lucide-react';
import { PurchaseOrderItem, Product } from '../../../types';

interface POFormItemRowProps {
  item: PurchaseOrderItem;
  index: number;
  searchTerm: string;
  searchResults: Product[];
  showProductSearch: boolean;
  onUpdateItem: (index: number, field: keyof PurchaseOrderItem, value: any) => void;
  onRemoveItem: (index: number) => void;
  onSearchTermChange: (value: string) => void;
  onShowProductSearch: (index: number | null) => void;
  onSelectProduct: (product: Product, index: number) => void;
  onExpiryDateChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
}

const POFormItemRow: React.FC<POFormItemRowProps> = ({
  item,
  index,
  searchTerm,
  searchResults,
  showProductSearch,
  onUpdateItem,
  onRemoveItem,
  onSearchTermChange,
  onShowProductSearch,
  onSelectProduct,
  onExpiryDateChange
}) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2">
        <div className="relative">
          <input
            type="text"
            value={item.product_name}
            onChange={(e) => onUpdateItem(index, 'product_name', e.target.value)}
            onFocus={() => onShowProductSearch(index)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Search product..."
          />
          {showProductSearch && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              <div className="p-2 border-b">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchTermChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Type to search..."
                  autoFocus
                />
              </div>
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No products found' : 'Type to search products'}
                </div>
              ) : (
                <ul>
                  {searchResults.map(product => (
                    <li
                      key={product.id}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                      onClick={() => onSelectProduct(product, index)}
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        SKU: {product.sku || 'N/A'} | Price: ${product.cost_price?.toFixed(2) || 'N/A'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-2">
        <input
          type="text"
          value={item.sku}
          onChange={(e) => onUpdateItem(index, 'sku', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder="SKU"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center">
          <Tag className="h-4 w-4 text-gray-400 mr-1" />
          <input
            type="text"
            value={item.batch_number || ''}
            onChange={(e) => onUpdateItem(index, 'batch_number', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Batch #"
          />
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center">
          <Calendar className="h-4 w-4 text-gray-400 mr-1" />
          <input
            type="date"
            value={item.expiry_date ? item.expiry_date.toISOString().split('T')[0] : ''}
            onChange={(e) => onExpiryDateChange(index, e)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onUpdateItem(index, 'quantity', parseInt(e.target.value, 10) || 0)}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-right"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.unit_price}
          onChange={(e) => onUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-right"
        />
      </td>
      <td className="px-4 py-2 text-right font-medium">
        ${item.total_price.toFixed(2)}
      </td>
      <td className="px-4 py-2 text-right">
        <button
          type="button"
          onClick={() => onRemoveItem(index)}
          className="text-red-500 hover:text-red-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );
};

export default POFormItemRow; 