import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, Check, X, FileText, Info } from 'lucide-react';
import { ExpenseCategory } from '../../types';
import { processExpenseImport } from '../../db/operations/expenses';

interface ExpenseImportFormProps {
  categories: ExpenseCategory[];
  onClose: () => void;
  onSuccess: (result: { imported: number, skipped: number }) => void;
}

const ExpenseImportForm: React.FC<ExpenseImportFormProps> = ({ 
  categories, 
  onClose, 
  onSuccess 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultCategory, setDefaultCategory] = useState(categories[0]?.name || 'Other');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    date: '',
    amount: '',
    description: '',
    category: '',
    reference: '',
    payment_method: '',
  });
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Read file to get preview and headers
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const content = event.target.result as string;
          const lines = content.split('\n').slice(0, 6); // Get first 6 lines for preview
          setCsvPreview(lines);
          
          // Extract headers for column mapping
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.trim());
            setAvailableColumns(headers);
            
            // Try to auto-map columns based on common names
            const mapping: Record<string, string> = {};
            
            headers.forEach(header => {
              const lowerHeader = header.toLowerCase();
              
              if (lowerHeader.includes('date') || lowerHeader === 'time' || lowerHeader === 'when') {
                mapping.date = header;
              } else if (lowerHeader.includes('amount') || lowerHeader.includes('sum') || 
                         lowerHeader.includes('total') || lowerHeader.includes('price') || 
                         lowerHeader.includes('cost')) {
                mapping.amount = header;
              } else if (lowerHeader.includes('desc') || lowerHeader.includes('narration') || 
                         lowerHeader.includes('details') || lowerHeader.includes('note')) {
                mapping.description = header;
              } else if (lowerHeader.includes('categ') || lowerHeader.includes('type')) {
                mapping.category = header;
              } else if (lowerHeader.includes('ref') || lowerHeader.includes('transaction')) {
                mapping.reference = header;
              } else if (lowerHeader.includes('payment') || lowerHeader.includes('method') || 
                         lowerHeader.includes('card') || lowerHeader.includes('bank')) {
                mapping.payment_method = header;
              }
            });
            
            setColumnMapping(mapping);
          }
          
          // Move to mapping step
          setStep('mapping');
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleColumnMappingChange = (field: string, value: string) => {
    setColumnMapping({
      ...columnMapping,
      [field]: value
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }
    
    // Validate that at least date and amount are mapped
    if (!columnMapping.date || !columnMapping.amount) {
      setError('Date and Amount columns must be mapped');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Read the entire file
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        if (event.target?.result) {
          const content = event.target.result as string;
          
          // Process the import
          const result = await processExpenseImport(
            content,
            columnMapping,
            defaultCategory
          );
          
          // Notify parent of success
          onSuccess({
            imported: result.imported,
            skipped: result.skipped
          });
          
          // Close the form after a delay
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      };
      
      reader.onerror = () => {
        setError('Failed to read file');
        setLoading(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing expenses:', error);
      setError(`Failed to import expenses: ${error instanceof Error ? error.message : String(error)}`);
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Check if it's a CSV file
      if (droppedFile.name.toLowerCase().endsWith('.csv')) {
        // Manually set the file in the input element
        if (fileInputRef.current) {
          // Create a DataTransfer object to set the files property
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(droppedFile);
          fileInputRef.current.files = dataTransfer.files;
          
          // Trigger the onChange event
          const event = new Event('change', { bubbles: true });
          fileInputRef.current.dispatchEvent(event);
        }
      } else {
        setError('Please upload a CSV file');
      }
    }
  };

  const renderUploadStep = () => (
    <div>
      <h3 className="text-lg font-medium mb-4">Upload Expense CSV</h3>
      
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-600 mb-2">Drag and drop your CSV file here, or click to browse</p>
        <p className="text-xs text-gray-500 mb-4">Supported format: CSV</p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Browse Files
        </button>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-700 font-medium">CSV Format Requirements</p>
            <p className="text-xs text-blue-600 mt-1">
              Your CSV file should include columns for date, amount, and description. 
              The first row should contain column headers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMappingStep = () => (
    <div>
      <h3 className="text-lg font-medium mb-4">Map CSV Columns</h3>
      
      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <h4 className="text-sm font-medium mb-2">CSV Preview</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <tbody>
              {csvPreview.map((line, index) => (
                <tr key={index} className={index === 0 ? "bg-gray-100" : ""}>
                  {line.split(',').map((cell, cellIndex) => (
                    <td key={cellIndex} className="border px-2 py-1">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Map Columns</h4>
        <p className="text-xs text-gray-500 mb-4">
          Match your CSV columns to the corresponding expense fields. Date and Amount are required.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-2 border rounded"
              value={columnMapping.date}
              onChange={(e) => handleColumnMappingChange('date', e.target.value)}
              required
            >
              <option value="">-- Select Column --</option>
              {availableColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-2 border rounded"
              value={columnMapping.amount}
              onChange={(e) => handleColumnMappingChange('amount', e.target.value)}
              required
            >
              <option value="">-- Select Column --</option>
              {availableColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <select
              className="w-full p-2 border rounded"
              value={columnMapping.description}
              onChange={(e) => handleColumnMappingChange('description', e.target.value)}
            >
              <option value="">-- Select Column --</option>
              {availableColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full p-2 border rounded"
              value={columnMapping.category}
              onChange={(e) => handleColumnMappingChange('category', e.target.value)}
            >
              <option value="">-- Select Column --</option>
              {availableColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference
            </label>
            <select
              className="w-full p-2 border rounded"
              value={columnMapping.reference}
              onChange={(e) => handleColumnMappingChange('reference', e.target.value)}
            >
              <option value="">-- Select Column --</option>
              {availableColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              className="w-full p-2 border rounded"
              value={columnMapping.payment_method}
              onChange={(e) => handleColumnMappingChange('payment_method', e.target.value)}
            >
              <option value="">-- Select Column --</option>
              {availableColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Default Category
        </label>
        <p className="text-xs text-gray-500 mb-2">
          This category will be used for expenses where a category is not specified or not recognized.
        </p>
        <select
          className="w-full p-2 border rounded"
          value={defaultCategory}
          onChange={(e) => setDefaultCategory(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.name}>{category.name}</option>
          ))}
        </select>
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep('upload')}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        
        <button
          type="button"
          onClick={handleImport}
          disabled={!columnMapping.date || !columnMapping.amount}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          Import Expenses
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Importing expenses...</p>
        </div>
      ) : (
        <>
          {step === 'upload' && renderUploadStep()}
          {step === 'mapping' && renderMappingStep()}
        </>
      )}
    </div>
  );
};

export default ExpenseImportForm;