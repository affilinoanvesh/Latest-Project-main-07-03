import React, { useState } from 'react';
import { X, AlertCircle, Info } from 'lucide-react';

interface ReconciliationModalProps {
  sku: string;
  productName: string;
  expectedStock: number;
  actualStock: number;
  onSubmit: (data: {
    sku: string;
    actualQuantity: number;
    notes: string;
  }) => void;
  onClose: () => void;
}

const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  sku,
  productName,
  expectedStock,
  actualStock,
  onSubmit,
  onClose
}) => {
  const [quantity, setQuantity] = useState<number>(actualStock);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const discrepancy = quantity - expectedStock;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (quantity < 0) {
      setError('Quantity cannot be negative');
      return;
    }
    
    onSubmit({
      sku,
      actualQuantity: quantity,
      notes
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Stock Reconciliation</h2>
            <p className="text-sm text-gray-600">{productName} ({sku})</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-200">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                This records the current WooCommerce stock level and any discrepancy with the expected stock. 
                The actual stock value is imported from WooCommerce and should match what you see in your store.
              </p>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Stock (Based on Movements)
            </label>
            <div className="text-sm bg-gray-100 p-2 rounded">
              {expectedStock} units
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Current WooCommerce Stock
            </label>
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="border rounded p-2 w-full"
              placeholder="Enter current WooCommerce quantity"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              This should match the current stock level in your WooCommerce store.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discrepancy
            </label>
            <div className={`text-sm p-2 rounded font-medium ${
              discrepancy === 0 
                ? 'bg-green-100 text-green-700' 
                : discrepancy > 0 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-red-100 text-red-700'
            }`}>
              {discrepancy === 0 
                ? 'No discrepancy' 
                : discrepancy > 0 
                  ? `+${discrepancy} units (more than expected)` 
                  : `${discrepancy} units (less than expected)`}
            </div>
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
              placeholder="Enter notes about this reconciliation (e.g., reason for discrepancy)"
            />
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Record Reconciliation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReconciliationModal; 