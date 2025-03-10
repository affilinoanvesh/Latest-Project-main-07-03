import React from 'react';
import { DollarSign, AlertCircle } from 'lucide-react';
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
          This amount will be added as additional revenue
        </p>
      </div>
      
      <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-green-100">
        <p className="font-medium flex items-center text-green-700">
          <AlertCircle size={16} className="mr-1" />
          What happens:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Expected stock will be reduced by {Math.abs(quantity)} units</li>
          <li>Revenue of ${saleAmount.toFixed(2)} will be recorded</li>
          <li>No loss will be recorded (since you recovered value)</li>
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
          min="0"
          value={lossAmount === 0 ? '' : lossAmount}
          onChange={(e) => setLossAmount(parseFloat(e.target.value) || 0)}
          className="border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
          placeholder="Enter loss amount"
        />
        {selectedProduct.supplier_price && selectedProduct.supplier_price > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            Maximum possible loss: ${(Math.abs(quantity) * selectedProduct.supplier_price).toFixed(2)} 
            ({Math.abs(quantity)} units × ${selectedProduct.supplier_price})
          </p>
        )}
      </div>
      
      <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-red-100">
        <p className="font-medium flex items-center text-red-700">
          <AlertCircle size={16} className="mr-1" />
          What happens:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Expected stock will be reduced by {Math.abs(quantity)} units</li>
          <li>Loss of ${lossAmount.toFixed(2)} will be recorded</li>
          <li>This loss will appear in financial reports</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="mb-4 border rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium text-gray-700 mb-2">Expiry Details</h3>
      
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