import React, { useState } from 'react';
import { X, Upload, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { downloadStockImportTemplate } from '../../utils/csv/stockImport';

interface InitialStockModalProps {
  onSubmit: (data: {
    sku: string;
    quantity: number;
    notes: string;
  }) => void;
  onBulkUpload: (file: File) => void;
  onClose: () => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ sku: string; error: string }>;
}

const InitialStockModal: React.FC<InitialStockModalProps> = ({
  onSubmit,
  onBulkUpload,
  onClose
}) => {
  const [sku, setSku] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'single') {
      if (!sku) {
        setError('SKU is required');
        return;
      }
      
      if (quantity <= 0) {
        setError('Quantity must be greater than zero');
        return;
      }
      
      onSubmit({
        sku,
        quantity,
        notes
      });
    } else {
      if (!uploadFile) {
        setError('Please select a file to upload');
        return;
      }
      
      setImporting(true);
      onBulkUpload(uploadFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
      // Reset any previous import results
      setImportResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    downloadStockImportTemplate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Set Initial Stock</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 border-b">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-4 py-2 rounded ${
                mode === 'single' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Single Product
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`px-4 py-2 rounded ${
                mode === 'bulk' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Bulk Upload
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {mode === 'single' ? (
            <>
              <div className="mb-4">
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <input
                  id="sku"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="border rounded p-2 w-full"
                  placeholder="Enter product SKU"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Quantity
                </label>
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="border rounded p-2 w-full"
                  placeholder="Enter initial quantity"
                  min="0"
                />
              </div>
              
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
                  placeholder="Enter notes about this initial stock"
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                    CSV File
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Template
                  </button>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    id="file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <Upload className="h-12 w-12 text-gray-400" />
                    <span className="mt-2 text-sm text-gray-500">
                      {uploadFile ? uploadFile.name : 'Click to upload CSV file'}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  CSV should have columns: sku, quantity, notes (optional)
                </p>
              </div>

              {importResult && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm font-medium">
                      Successfully imported: {importResult.success} items
                    </span>
                  </div>
                  
                  {importResult.failed > 0 && (
                    <div>
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-sm font-medium">
                          Failed to import: {importResult.failed} items
                        </span>
                      </div>
                      
                      {importResult.errors.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto text-xs">
                          <table className="w-full">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-2 py-1 text-left">SKU</th>
                                <th className="px-2 py-1 text-left">Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importResult.errors.map((err, index) => (
                                <tr key={index} className="border-t">
                                  <td className="px-2 py-1">{err.sku}</td>
                                  <td className="px-2 py-1 text-red-600">{err.error}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
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
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
                importing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={importing}
            >
              {importing ? 'Importing...' : mode === 'single' ? 'Save Initial Stock' : 'Upload CSV'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InitialStockModal; 