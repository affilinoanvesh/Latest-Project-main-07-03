import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { MovementReason } from '../../types';

// Import our components from the index file
import {
  ProductSelector,
  QuantityAdjuster,
  DateSelector,
  ReasonSelector,
  NotesAndBatch,
  Product
} from './StockAdjustmentComponents';

// Import ExpiryDetails component
import ExpiryDetails from './StockAdjustmentComponents/ExpiryDetails';

interface StockAdjustmentModalProps {
  sku?: string;
  productName?: string;
  currentStock?: number;
  onSubmit: (data: {
    sku: string;
    quantity: number;
    reason: MovementReason;
    notes: string;
    batchNumber?: string;
    date: Date;
    // Add new fields for expiry and manual sales
    isManualSale?: boolean;
    saleAmount?: number;
    lossAmount?: number;
    lossPercentage?: number;
  }) => void;
  onClose: () => void;
  products?: Product[];
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  sku,
  productName,
  currentStock,
  onSubmit,
  onClose,
  products = []
}) => {
  // Log props for debugging
  console.log('StockAdjustmentModal props:', { sku, productName, currentStock });
  
  // State management
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(-1); // Default to -1 for removals
  const [reason, setReason] = useState<MovementReason>('other');
  const [notes, setNotes] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  
  // New state for expiry details
  const [isManualSale, setIsManualSale] = useState<boolean>(false);
  const [saleAmount, setSaleAmount] = useState<number>(0);
  const [lossAmount, setLossAmount] = useState<number>(0);
  
  // Calculate loss percentage based on loss amount and product cost
  const [lossPercentage, setLossPercentage] = useState<number>(0);
  
  // Update loss amount when product or quantity changes
  useEffect(() => {
    if (selectedProduct && selectedProduct.supplier_price && quantity < 0) {
      const calculatedLoss = Math.abs(quantity) * selectedProduct.supplier_price;
      setLossAmount(calculatedLoss);
    }
  }, [selectedProduct, quantity]);
  
  // Calculate loss percentage when loss amount changes
  useEffect(() => {
    if (selectedProduct && selectedProduct.supplier_price && quantity < 0) {
      const totalValue = Math.abs(quantity) * selectedProduct.supplier_price;
      if (totalValue > 0) {
        const percentage = (lossAmount / totalValue) * 100;
        setLossPercentage(percentage);
      }
    }
  }, [lossAmount, selectedProduct, quantity]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }
    
    if (quantity === 0) {
      setError('Quantity cannot be zero');
      return;
    }
    
    // Validate sale amount if it's a manual sale
    if (reason === 'expiry' && isManualSale && saleAmount <= 0) {
      setError('Please enter a sale amount greater than zero');
      return;
    }
    
    // Validate loss amount if it's not a manual sale
    if (reason === 'expiry' && !isManualSale && lossAmount <= 0) {
      setError('Please enter a loss amount greater than zero');
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    // Submit the stock adjustment with additional fields
    onSubmit({
      sku: selectedProduct.sku,
      quantity,
      reason,
      notes,
      batchNumber: batchNumber || undefined,
      date,
      // Include expiry-related fields if reason is expiry
      ...(reason === 'expiry' && {
        isManualSale,
        saleAmount: isManualSale ? saleAmount : 0,
        lossAmount: !isManualSale ? lossAmount : 0,
        lossPercentage
      })
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold">Manual Stock Adjustment</h2>
            {sku && productName && (
              <p className="text-sm text-gray-600 mt-1">
                Pre-selected: {productName} ({sku})
              </p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Product Selection */}
          <ProductSelector
            products={products}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            initialSku={sku}
            initialProductName={productName}
            initialStock={currentStock}
            autoFocus={!sku}
          />
          
          {/* Date Field */}
          <DateSelector date={date} setDate={setDate} />
          
          {/* Current Stock - only shown if product is selected */}
          {selectedProduct && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Stock
              </label>
              <div className="text-sm bg-gray-100 p-2 rounded-lg font-medium">
                {selectedProduct.stock_quantity} units
              </div>
            </div>
          )}
          
          {/* Adjustment Quantity */}
          <QuantityAdjuster quantity={quantity} setQuantity={setQuantity} />
          
          {/* Reason */}
          <ReasonSelector reason={reason} setReason={setReason} />
          
          {/* Expiry Details - only shown if reason is expiry and quantity is negative */}
          {reason === 'expiry' && quantity < 0 && selectedProduct && (
            <ExpiryDetails
              isManualSale={isManualSale}
              setIsManualSale={setIsManualSale}
              saleAmount={saleAmount}
              setSaleAmount={setSaleAmount}
              lossAmount={lossAmount}
              setLossAmount={setLossAmount}
              quantity={quantity}
              selectedProduct={selectedProduct}
            />
          )}
          
          {/* Notes and Batch Number */}
          <NotesAndBatch
            notes={notes}
            setNotes={setNotes}
            batchNumber={batchNumber}
            setBatchNumber={setBatchNumber}
          />
          
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-200 flex items-start">
              <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}
          
          {/* Form actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustmentModal; 