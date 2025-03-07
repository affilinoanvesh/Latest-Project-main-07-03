import React, { useState } from 'react';
import { AlertCircle, Upload, FileText, RefreshCw } from 'lucide-react';
import { SupplierPriceItem, SupplierPriceImport } from '../types';
import { processSupplierPriceData, getSupplierImports, getSupplierImportItems } from '../db/operations/supplier';

interface SupplierImportFormProps {
  onClose: () => void;
  onSuccess: (updatedImports: any) => void;
  recentImports: {
    id?: number;
    date: string;
    supplier: string;
    filename: string;
    updated: number;
    skipped: number;
  }[];
}

const SupplierImportForm: React.FC<SupplierImportFormProps> = ({ 
  onClose, 
  onSuccess,
  recentImports 
}) => {
  const [supplierName, setSupplierName] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<number | null>(null);
  const [importMode, setImportMode] = useState<'file' | 'existing'>('file');
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (importMode === 'file') {
      if (!importFile) {
        setImportError('Please select a file to import');
        return;
      }
      
      if (!supplierName) {
        setImportError('Please enter a supplier name');
        return;
      }
    } else {
      if (!selectedImportId) {
        setImportError('Please select a previous import to reuse');
        return;
      }
    }
    
    setImportLoading(true);
    setImportError(null);
    setImportSuccess(null);
    setDebugInfo([]);
    
    try {
      let items: SupplierPriceItem[] = [];
      let filename = '';
      let supplier = '';
      
      if (importMode === 'file') {
        // Parse the CSV file
        try {
          setDebugInfo(prev => [...prev, `Starting to parse file: ${importFile!.name}`]);
          items = await parseImportFile(importFile!);
          filename = importFile!.name;
          supplier = supplierName;
          
          if (items.length === 0) {
            setImportError('No valid data found in the file');
            setImportLoading(false);
            return;
          }
          
          setDebugInfo(prev => [...prev, `Found ${items.length} items in CSV file`]);
          // Log a sample of the items for debugging
          if (items.length > 0) {
            setDebugInfo(prev => [...prev, `Sample item: ${JSON.stringify(items[0])}`]);
          }
        } catch (error) {
          console.error('Error parsing CSV file:', error);
          setImportError(`Error parsing CSV file: ${error instanceof Error ? error.message : String(error)}`);
          setImportLoading(false);
          return;
        }
      } else {
        // Get items from previous import
        const selectedImport = recentImports.find(imp => imp.id === selectedImportId);
        if (!selectedImport) {
          setImportError('Selected import not found');
          setImportLoading(false);
          return;
        }
        
        items = await getSupplierImportItems(selectedImportId!);
        filename = selectedImport.filename;
        supplier = selectedImport.supplier;
        
        if (items.length === 0) {
          setImportError('No items found in the selected import');
          setImportLoading(false);
          return;
        }
        
        setDebugInfo(prev => [...prev, `Retrieved ${items.length} items from previous import`]);
      }
      
      // Process the data
      try {
        // Process the supplier price data
        setDebugInfo(prev => [...prev, `Processing ${items.length} items for supplier ${supplier}`]);
        
        // Log a sample of the items for debugging
        if (items.length > 0) {
          setDebugInfo(prev => [...prev, `Sample item before processing: ${JSON.stringify(items[0])}`]);
        }
        
        const result = await processSupplierPriceData(items, supplier, filename);
        
        setDebugInfo(prev => [...prev, `Import completed: ${result.items_updated} updated, ${result.items_skipped} skipped`]);
        
        // Show success message
        setImportSuccess(`Successfully imported ${result.items_updated} items from ${supplier} (${result.items_skipped} skipped)`);
        
        // Refresh the recent imports list
        const imports = await getSupplierImports();
        const formattedImports = imports.map(imp => ({
          id: imp.id,
          date: new Date(imp.date).toLocaleDateString(),
          supplier: imp.supplier_name,
          filename: imp.filename,
          updated: imp.items_updated,
          skipped: imp.items_skipped
        })).slice(0, 5);
        
        // Call the onSuccess callback with the updated imports
        onSuccess(formattedImports);
        
        // Reset form
        setSupplierName('');
        setImportFile(null);
        setSelectedImportId(null);
        
        // Close the form after a delay
        setTimeout(() => {
          onClose();
        }, 3000);
      } catch (error) {
        console.error('Error during processing:', error);
        setDebugInfo(prev => [...prev, `Error during processing: ${error instanceof Error ? error.message : JSON.stringify(error)}`]);
        setImportError(`Error processing supplier data: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportError(`Import error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      setImportLoading(false);
    }
  };

  const parseImportFile = async (file: File): Promise<SupplierPriceItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          setDebugInfo(prev => [...prev, `File content loaded, size: ${content.length} bytes`]);
          
          // Check if it's a CSV file
          if (file.name.toLowerCase().endsWith('.csv')) {
            const items = parseCSV(content);
            resolve(items);
          } else {
            // For now, only support CSV
            reject(new Error('Only CSV files are supported'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };

  const parseCSV = (content: string): SupplierPriceItem[] => {
    const lines = content.split('\n');
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Find header row
    const headerLine = lines[0].trim();
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
    
    setDebugInfo(prev => [...prev, `CSV Headers: ${headers.join(', ')}`]);
    
    // Find column indices based on expected column names
    const skuIndex = headers.findIndex(h => 
      h === 'sku' || 
      h.includes('sku') ||
      h === 'code' ||
      h.includes('product code') ||
      h.includes('item code') ||
      h.includes('item number')
    );
    
    const nameIndex = headers.findIndex(h => 
      h === 'name' || 
      h === 'product' || 
      h === 'product name' || 
      h === 'description' ||
      h === 'item' ||
      h === 'item name' ||
      h.includes('product') || 
      h.includes('name') || 
      h.includes('description')
    );
    
    const priceIndex = headers.findIndex(h => 
      h === 'price' || 
      h === 'cost' || 
      h === 'supplier' || 
      h === 'supplier price' || 
      h === 'wholesale' ||
      h === 'wholesale price' ||
      h === 'buy price' ||
      h === 'purchase price' ||
      h.includes('price') || 
      h.includes('cost') || 
      h.includes('supplier') ||
      h.includes('wholesale')
    );
    
    setDebugInfo(prev => [...prev, `Column indices - SKU: ${skuIndex}, Name: ${nameIndex}, Price: ${priceIndex}`]);
    
    if (skuIndex === -1) {
      throw new Error('CSV file must contain a SKU/Code column. Headers found: ' + headers.join(', '));
    }
    
    if (priceIndex === -1) {
      throw new Error('CSV file must contain a Price/Cost/Supplier column. Headers found: ' + headers.join(', '));
    }
    
    // Parse data rows
    const items: SupplierPriceItem[] = [];
    const skippedRows: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle quoted CSV values properly
      let values: string[] = [];
      if (line.includes('"')) {
        // Handle quoted values (which might contain commas)
        let inQuote = false;
        let currentValue = '';
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        
        // Add the last value
        values.push(currentValue.trim());
      } else {
        // Simple split for non-quoted values
        values = line.split(',').map(v => v.trim());
      }
      
      // Make sure we have enough values
      if (values.length <= Math.max(skuIndex, priceIndex)) {
        skippedRows.push(`Row ${i+1}: Not enough columns`);
        continue;
      }
      
      const sku = values[skuIndex].replace(/"/g, '').trim(); // Remove any quotes
      const name = nameIndex !== -1 && nameIndex < values.length ? values[nameIndex].replace(/"/g, '').trim() : undefined;
      
      // Handle price with potential $ and comma formatting
      let priceStr = values[priceIndex].replace(/"/g, '').trim();
      if (priceStr) {
        priceStr = priceStr.replace(/[$,]/g, '');
      }
      
      // Try to parse the price as a number
      let price: number;
      try {
        price = parseFloat(priceStr);
      } catch (e) {
        skippedRows.push(`Row ${i+1}: Invalid price format - ${priceStr}`);
        continue;
      }
      
      if (sku && !isNaN(price)) {
        // Create a valid item with all required fields
        const item: SupplierPriceItem = {
          sku,
          supplier_price: price > 0 ? price : 0.01, // Ensure price is positive to display in UI
          supplier_name: supplierName
        };
        
        // Add the name if available
        if (name) {
          item.name = name;
        }
        
        items.push(item);
      } else {
        const reason = !sku ? 'Missing SKU' : !priceStr ? 'Missing price' : 'Invalid price format';
        skippedRows.push(`Row ${i+1}: ${reason} - ${line}`);
      }
    }
    
    // Log skipped rows for debugging
    if (skippedRows.length > 0) {
      setDebugInfo(prev => [...prev, `Skipped ${skippedRows.length} rows:`]);
      skippedRows.slice(0, 10).forEach(row => {
        setDebugInfo(prev => [...prev, row]);
      });
      if (skippedRows.length > 10) {
        setDebugInfo(prev => [...prev, `... and ${skippedRows.length - 10} more`]);
      }
    }
    
    setDebugInfo(prev => [...prev, `Parsed ${items.length} valid items from CSV`]);
    
    if (items.length === 0) {
      throw new Error('No valid items found in the CSV file. Please check the format.');
    }
    
    return items;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Import Supplier Prices</h2>
      
      <div className="mt-4">
        {importLoading && (
          <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded mb-4">
            <RefreshCw className="animate-spin mr-2 text-blue-600" />
            <span className="text-blue-700">Processing import...</span>
          </div>
        )}
        
        {importError && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="font-bold">No items found in the selected import</p>
                <p className="text-sm">{importError}</p>
                
                {debugInfo.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowDebugInfo(!showDebugInfo)}
                      className="text-sm underline text-red-600 flex items-center"
                    >
                      {showDebugInfo ? 'Hide details' : 'Show details'}
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 ${showDebugInfo ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showDebugInfo && (
                      <div className="mt-2 text-sm bg-red-100 p-2 rounded overflow-auto max-h-40">
                        {debugInfo.map((info, index) => (
                          <div key={index} className="mb-1">{info}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-2">
                  <p className="text-sm font-medium">
                    Please ensure your CSV file:
                  </p>
                  <ul className="list-disc list-inside text-sm ml-2 mt-1 space-y-1">
                    <li>Has a header row with column names</li>
                    <li>Contains a column for SKU/Product Code</li>
                    <li>Contains a column for Price/Cost</li>
                    <li>Has valid numeric values for prices</li>
                    <li>Uses comma (,) as the delimiter</li>
                  </ul>
                  
                  <div className="mt-3 bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                    <p className="font-medium mb-1">Example CSV format:</p>
                    <pre className="text-gray-600">
                      SKU,Product Name,Price<br/>
                      ABC123,Dog Food,12.99<br/>
                      XYZ456,Cat Toy,5.50
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {importSuccess && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded mb-4" role="alert">
            <div className="flex">
              <div className="py-1">
                <svg className="fill-current h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM6.7 9.29L9 11.6l4.3-4.3 1.4 1.42L9 14.4l-3.7-3.7 1.4-1.42z" />
                </svg>
              </div>
              <div>
                <p className="font-bold">{importSuccess}</p>
                <p className="text-sm">The updated prices are now reflected in your inventory.</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <div className="flex space-x-4 mb-4">
          <button
            type="button"
            onClick={() => setImportMode('file')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              importMode === 'file' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Upload className="h-4 w-4 mr-1 inline" />
            Upload New File
          </button>
          <button
            type="button"
            onClick={() => setImportMode('existing')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              importMode === 'existing' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={recentImports.length === 0}
          >
            <RefreshCw className="h-4 w-4 mr-1 inline" />
            Reuse Previous Import
          </button>
        </div>
      </div>
      
      <form onSubmit={handleImportSubmit}>
        {importMode === 'file' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price List File (CSV)
              </label>
              <div className="flex items-center">
                <input
                  type="file"
                  accept=".csv"
                  className="w-full p-2 border rounded"
                  onChange={handleFileChange}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                File must contain columns for "Product Name", "SKU", and "Supplier" (price)
              </p>
              {importFile && (
                <p className="text-sm text-indigo-600 mt-1">
                  Selected: {importFile.name}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Previous Import
            </label>
            <select
              className="w-full p-2 border rounded"
              value={selectedImportId || ''}
              onChange={(e) => setSelectedImportId(e.target.value ? Number(e.target.value) : null)}
              required
            >
              <option value="">-- Select a previous import --</option>
              {recentImports.map((imp, index) => (
                <option key={index} value={imp.id}>
                  {imp.date} - {imp.supplier} - {imp.filename} ({imp.updated} items)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Reapply a previous import to update product prices without uploading a new file
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={importLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-400"
            disabled={importLoading}
          >
            {importLoading ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                Importing...
              </>
            ) : (
              <>
                {importMode === 'file' ? (
                  <Upload className="h-4 w-4 mr-1 inline" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1 inline" />
                )}
                {importMode === 'file' ? 'Import Prices' : 'Reapply Import'}
              </>
            )}
          </button>
        </div>
      </form>
      
      {recentImports.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Imports</h3>
          <div className="bg-gray-50 rounded border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left font-medium text-gray-500 px-4 py-2">Date</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-2">Supplier</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-2">File</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-2">Updated</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-2">Skipped</th>
                </tr>
              </thead>
              <tbody>
                {recentImports.map((imp, index) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{imp.date}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{imp.supplier}</td>
                    <td className="px-4 py-3 text-gray-700">{imp.filename}</td>
                    <td className="px-4 py-3 text-green-600">{imp.updated}</td>
                    <td className="px-4 py-3 text-red-600">{imp.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierImportForm;