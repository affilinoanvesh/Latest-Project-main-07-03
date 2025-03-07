import React, { useRef, useState } from 'react';
import { PurchaseOrderItem, Product } from '../../../types';
import { X, Plus, Upload, Calendar, Tag, FileText, Search, ChevronDown, AlertCircle, Info } from 'lucide-react';
import * as Papa from 'papaparse';

interface POFormItemsTableProps {
  items: PurchaseOrderItem[];
  searchTerm: string;
  searchResults: Product[];
  showProductSearch: number | null;
  totalAmount: number;
  purchaseOrderId?: number;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof PurchaseOrderItem, value: unknown) => void;
  onSearchTermChange: (term: string) => void;
  onShowProductSearch: (index: number | null) => void;
  onSelectProduct: (product: Product, index: number) => void;
  onExpiryDateChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onItemsUploaded: (items: PurchaseOrderItem[]) => void;
  onError: (error: string | null) => void;
}

interface CsvRow {
  sku: string;
  product_name: string;
  quantity: string;
  unit_price: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

const POFormItemsTable: React.FC<POFormItemsTableProps> = ({
  items,
  searchTerm,
  searchResults,
  showProductSearch,
  totalAmount,
  purchaseOrderId,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onSearchTermChange,
  onShowProductSearch,
  onSelectProduct,
  onExpiryDateChange,
  onItemsUploaded,
  onError
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadTooltip, setShowUploadTooltip] = useState(false);
  const [showTemplateTooltip, setShowTemplateTooltip] = useState(false);
  const [activeRow, setActiveRow] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvData = event.target?.result as string;
        
        Papa.parse<CsvRow>(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: function(results) {
            const parsedItems = results.data.map((row) => {
              // Expected CSV columns: sku, product_name, quantity, unit_price, batch_number, expiry_date
              const quantity = parseInt(row.quantity, 10) || 1;
              const unitPrice = parseFloat(row.unit_price) || 0;
              
              return {
                purchase_order_id: purchaseOrderId || 0,
                sku: row.sku || '',
                product_name: row.product_name || '',
                quantity: quantity,
                unit_price: unitPrice,
                total_price: quantity * unitPrice,
                batch_number: row.batch_number || '',
                expiry_date: row.expiry_date ? new Date(row.expiry_date) : undefined,
                notes: row.notes || ''
              } as PurchaseOrderItem;
            });
            
            // Add the parsed items to the existing items
            onItemsUploaded(parsedItems);
            
            // Reset the file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          },
          error: function(error: Error) {
            onError(`Failed to parse CSV file: ${error.message}`);
          }
        });
      } catch (err) {
        onError(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    reader.readAsText(file);
  };

  const downloadSampleCSV = () => {
    const headers = ['sku', 'product_name', 'quantity', 'unit_price', 'batch_number', 'expiry_date', 'notes'];
    const sampleData = [
      ['SKU123', 'Sample Product 1', '10', '15.99', 'BATCH001', '2023-12-31', 'Sample notes'],
      ['SKU456', 'Sample Product 2', '5', '25.50', 'BATCH002', '2024-06-30', '']
    ];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'purchase_order_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">Order Items</h3>
        <div className="flex space-x-3">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
            id="csv-upload"
          />
          <div className="relative" onMouseEnter={() => setShowUploadTooltip(true)} onMouseLeave={() => setShowUploadTooltip(false)}>
            <label
              htmlFor="csv-upload"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center cursor-pointer transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Items
            </label>
            {showUploadTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                Upload a CSV file with your order items
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
              </div>
            )}
          </div>
          
          <div className="relative" onMouseEnter={() => setShowTemplateTooltip(true)} onMouseLeave={() => setShowTemplateTooltip(false)}>
            <button
              type="button"
              onClick={downloadSampleCSV}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download Template
            </button>
            {showTemplateTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                Download a CSV template for bulk item upload
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
              </div>
            )}
          </div>
          
          <button
            type="button"
            onClick={onAddItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        </div>
      </div>
      
      {items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="flex justify-center mb-3">
            <Info className="h-12 w-12 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-700 mb-2">No items added yet</h4>
          <p className="text-gray-500 mb-4">Add items manually or upload a CSV file</p>
          <div className="flex justify-center space-x-3">
            <label
              htmlFor="csv-upload"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center cursor-pointer transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Items
            </label>
            <button
              type="button"
              onClick={onAddItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr 
                  key={index} 
                  className={`hover:bg-blue-50 transition-colors ${activeRow === index ? 'bg-blue-50' : ''}`}
                  onMouseEnter={() => setActiveRow(index)}
                  onMouseLeave={() => setActiveRow(null)}
                >
                  <td className="px-4 py-3">
                    <div className="relative">
                      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                        <Search className="h-4 w-4 text-gray-400 ml-2" />
                        <input
                          type="text"
                          value={item.product_name}
                          onChange={(e) => onUpdateItem(index, 'product_name', e.target.value)}
                          onFocus={() => onShowProductSearch(index)}
                          className="w-full p-2 border-none focus:ring-0 focus:outline-none"
                          placeholder="Search product..."
                        />
                      </div>
                      {showProductSearch === index && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          <div className="p-2 border-b">
                            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                              <Search className="h-4 w-4 text-gray-400 ml-2" />
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => onSearchTermChange(e.target.value)}
                                className="w-full p-2 border-none focus:ring-0 focus:outline-none"
                                placeholder="Type to search..."
                                autoFocus
                              />
                            </div>
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
                                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                                  onClick={() => onSelectProduct(product, index)}
                                >
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs mr-2">
                                      {product.sku || 'N/A'}
                                    </span>
                                    <span>${product.cost_price?.toFixed(2) || 'N/A'}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => onUpdateItem(index, 'sku', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="SKU"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                      <Tag className="h-4 w-4 text-gray-400 ml-2" />
                      <input
                        type="text"
                        value={item.batch_number || ''}
                        onChange={(e) => onUpdateItem(index, 'batch_number', e.target.value)}
                        className="w-full p-2 border-none focus:ring-0 focus:outline-none"
                        placeholder="Batch #"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                      <Calendar className="h-4 w-4 text-gray-400 ml-2" />
                      <input
                        type="date"
                        value={item.expiry_date ? item.expiry_date.toISOString().split('T')[0] : ''}
                        onChange={(e) => onExpiryDateChange(index, e)}
                        className="w-full p-2 border-none focus:ring-0 focus:outline-none"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(index, 'quantity', parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-right"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => onUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 pl-7 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-right"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <div className="bg-gray-50 p-2 rounded-md">
                      ${(item.total_price || 0).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="p-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-100 hover:text-red-700 transition-colors"
                      aria-label="Remove item"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right font-medium">Total:</td>
                <td className="px-4 py-3 text-right">
                  <div className="bg-blue-50 p-2 rounded-md font-bold text-blue-700">
                    ${totalAmount.toFixed(2)}
                  </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default POFormItemsTable; 