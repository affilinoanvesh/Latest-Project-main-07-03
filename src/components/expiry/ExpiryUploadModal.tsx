import React, { useState } from 'react';
import { parseExpiryCSV, validateExpiryData, downloadExpiryTemplate } from '../../utils/csv/expiryImport';
import { addBulkProductExpiry } from '../../db/operations/expiry';
import { X, Download, Upload, AlertTriangle } from 'lucide-react';

interface ExpiryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ExpiryUploadModal: React.FC<ExpiryUploadModalProps> = ({ 
  isOpen, 
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validatedData, setValidatedData] = useState<any[]>([]);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setValidationErrors([]);
    setValidationWarnings([]);
    setValidatedData([]);
    
    try {
      // Parse CSV file
      const parsedData = await parseExpiryCSV(selectedFile);
      setPreview(parsedData.slice(0, 5)); // Show first 5 rows as preview
      
      // Validate data
      const validation = await validateExpiryData(parsedData);
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      setValidatedData(validation.data);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setValidationErrors(['Failed to parse CSV file. Please check the format.']);
    }
  };
  
  const handleUpload = async () => {
    if (!file || validationErrors.length > 0 || validatedData.length === 0) return;
    
    setIsProcessing(true);
    try {
      await addBulkProductExpiry(validatedData);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error uploading expiry data:', error);
      // Show the error to the user
      setValidationErrors([...validationErrors, `Failed to upload data: ${error.message || 'Unknown error'}`]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-3/4 max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Upload Product Expiry Data</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <button 
            onClick={downloadExpiryTemplate}
            className="flex items-center text-blue-500 hover:text-blue-700"
          >
            <Download size={16} className="mr-1" />
            Download Template
          </button>
          <p className="text-sm text-gray-500 mt-1">
            Use this template to prepare your expiry data. The file should include SKU, Expiry Date (DD/MM/YYYY), and Quantity columns.
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select CSV File
          </label>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange}
            className="border p-2 w-full rounded"
          />
        </div>
        
        {preview.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold mb-2">Preview:</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    {Object.keys(preview[0]).map((key) => (
                      <th key={key} className="border p-2 text-left">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td key={i} className="border p-2">{value as string}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Showing first 5 rows. Total rows: {validatedData.length + validationErrors.length}
            </p>
          </div>
        )}
        
        {validationWarnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
            <div className="flex items-center mb-1">
              <AlertTriangle size={16} className="mr-1" />
              <h3 className="font-bold">Warnings:</h3>
            </div>
            <ul className="list-disc pl-5">
              {validationWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            <div className="flex items-center mb-1">
              <AlertTriangle size={16} className="mr-1" />
              <h3 className="font-bold">Errors:</h3>
            </div>
            <ul className="list-disc pl-5">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded mr-2"
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload}
            disabled={isProcessing || validationErrors.length > 0 || validatedData.length === 0}
            className={`flex items-center px-4 py-2 rounded ${
              isProcessing || validationErrors.length > 0 || validatedData.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Upload size={16} className="mr-1" />
                Upload and Process
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpiryUploadModal; 