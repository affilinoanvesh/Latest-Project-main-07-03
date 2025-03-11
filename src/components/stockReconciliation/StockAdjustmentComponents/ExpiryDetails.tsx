import React from 'react';
import { DollarSign, AlertCircle, FileText, BarChart2 } from 'lucide-react';
import { Product } from './types';

interface ExpiryDetailsProps {
  isManualSale: boolean;
  setIsManualSale: (value: boolean) => void;
  saleAmount: number;
  setSaleAmount: (value: number) => void;
  lossAmount: number;
  setLossAmount: (value: number) => void;
  quantity: number;
  selectedProduct: Product;
}

const ExpiryDetails: React.FC<ExpiryDetailsProps> = ({
  isManualSale,
  setIsManualSale,
  saleAmount,
  setSaleAmount,
  lossAmount,
  setLossAmount,
  quantity,
  selectedProduct
}) => {
  // Calculate the maximum possible loss based on product cost
  const maxPossibleLoss = selectedProduct.supplier_price 
    ? Math.abs(quantity) * selectedProduct.supplier_price 
    : 0;
  
  // Calculate the net loss for manual sales (max loss - sale amount)
  const netLoss = isManualSale 
    ? Math.max(0, maxPossibleLoss - saleAmount)
    : lossAmount;
  
  // Manual sale section
  const ManualSaleSection = () => (
    <div className="border-l-4 border-green-400 pl-3 py-3 bg-green-50 rounded-lg mt-3">
      <div className="mb-3">
        <label htmlFor="saleAmount" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          <DollarSign size={16} className="text-green-600 mr-1" />
          Sale Amount ($)
        </label>
        <input
          id="saleAmount"
          type="number"
          step="0.01"
          value={saleAmount === 0 ? '' : saleAmount}
          onChange={(e) => setSaleAmount(parseFloat(e.target.value) || 0)}
          className="border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-300"
          placeholder="Enter sale amount"
        />
        <p className="text-xs text-gray-600 mt-1">
          This amount will be added as additional revenue in financial reports
        </p>
      </div>
      
      {netLoss > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <BarChart2 size={16} className="text-orange-600 mr-1" />
              Net Loss Calculation
            </label>
            <span className="text-sm font-medium text-orange-600">${netLoss.toFixed(2)}</span>
          </div>
          <div className="text-xs text-gray-600 bg-white p-2 rounded-lg border border-gray-200">
            <div className="flex justify-between">
              <span>Maximum value:</span>
              <span>${maxPossibleLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sale amount:</span>
              <span>-${saleAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium border-t mt-1 pt-1">
              <span>Net loss:</span>
              <span>${netLoss.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-green-100">
        <p className="font-medium flex items-center text-green-700">
          <FileText size={16} className="mr-1" />
          Financial Impact:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Stock will be reduced by {Math.abs(quantity)} units</li>
          <li><span className="font-medium text-green-600">${saleAmount.toFixed(2)}</span> will be recorded as additional revenue</li>
          {netLoss > 0 ? (
            <li><span className="font-medium text-orange-600">${netLoss.toFixed(2)}</span> will be recorded as an expense (partial loss)</li>
          ) : (
            <li>No loss will be recorded (full value recovered)</li>
          )}
        </ul>
      </div>
    </div>
  );

  // Loss section
  const LossSection = () => (
    <div className="border-l-4 border-red-400 pl-3 py-3 bg-red-50 rounded-lg mt-3">
      <div className="mb-3">
        <label htmlFor="lossAmount" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          <DollarSign size={16} className="text-red-600 mr-1" />
          Loss Amount ($)
        </label>
        <input
          id="lossAmount"
          type="number"
          step="0.01"
          value={lossAmount === 0 ? '' : lossAmount}
          onChange={(e) => setLossAmount(parseFloat(e.target.value) || 0)}
          className="border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
          placeholder="Enter loss amount (optional)"
        />
        {selectedProduct.supplier_price && selectedProduct.supplier_price > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            Suggested loss: ${maxPossibleLoss.toFixed(2)} 
            ({Math.abs(quantity)} units × ${selectedProduct.supplier_price})
            <br />
            This field is optional.
          </p>
        )}
      </div>
      
      <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-red-100">
        <p className="font-medium flex items-center text-red-700">
          <FileText size={16} className="mr-1" />
          Financial Impact:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Stock will be reduced by {Math.abs(quantity)} units</li>
          <li><span className="font-medium text-red-600">${lossAmount.toFixed(2)}</span> will be recorded as an expense</li>
          <li>This loss will appear in financial reports as "Expired Products"</li>
          <li>No revenue will be recorded</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="mb-4 border rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium text-gray-700 mb-2 flex items-center">
        <AlertCircle size={16} className="text-amber-500 mr-1" />
        Expiry Details
      </h3>
      
      <div className="mb-2">
        <div className="flex items-center mb-2">
          <input
            id="isManualSale"
            type="checkbox"
            checked={isManualSale}
            onChange={(e) => setIsManualSale(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isManualSale" className="ml-2 block text-sm text-gray-700 font-medium">
            This product was sold manually
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-3 ml-6">
          Check this if you sold the expired product (e.g., at a discount) instead of disposing it
        </p>
        
        {isManualSale ? <ManualSaleSection /> : <LossSection />}
      </div>
    </div>
  );
};

export default ExpiryDetails; 