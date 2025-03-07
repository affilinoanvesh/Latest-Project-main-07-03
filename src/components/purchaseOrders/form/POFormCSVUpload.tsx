import React, { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import * as Papa from 'papaparse';
import { PurchaseOrderItem } from '../../../types';

interface POFormCSVUploadProps {
  purchaseOrderId?: number;
  onItemsUploaded: (items: PurchaseOrderItem[]) => void;
  onError: (message: string) => void;
}

const POFormCSVUpload: React.FC<POFormCSVUploadProps> = ({ 
  purchaseOrderId, 
  onItemsUploaded, 
  onError 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvData = event.target?.result as string;
        
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: function(results) {
            const parsedItems = results.data.map((row: any) => {
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
            
            // Add the parsed items
            onItemsUploaded(parsedItems);
            
            // Reset the file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          },
          error: function(error: any) {
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
    <div className="flex space-x-2">
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        ref={fileInputRef}
        className="hidden"
        id="csv-upload"
      />
      <label
        htmlFor="csv-upload"
        className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center cursor-pointer transition-colors"
      >
        <Upload className="h-4 w-4 mr-1" />
        Upload Items
      </label>
      <button
        type="button"
        onClick={downloadSampleCSV}
        className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center transition-colors"
      >
        <FileText className="h-4 w-4 mr-1" />
        Download Template
      </button>
    </div>
  );
};

export default POFormCSVUpload; 