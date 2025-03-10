import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantityAdjusterProps {
  quantity: number;
  setQuantity: (quantity: number) => void;
}

const QuantityAdjuster: React.FC<QuantityAdjusterProps> = ({ quantity, setQuantity }) => {
  const decrementQuantity = () => {
    setQuantity(quantity - 1);
  };

  const incrementQuantity = () => {
    setQuantity(quantity + 1);
  };

  return (
    <div className="mb-4">
      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
        Adjustment Quantity
      </label>
      <div className="flex items-center">
        <button
          type="button"
          onClick={decrementQuantity}
          className="bg-gray-100 hover:bg-gray-200 p-2 rounded-l-lg border border-r-0 border-gray-300 transition-colors flex items-center justify-center"
        >
          <Minus size={18} className="text-gray-700" />
        </button>
        <input
          id="quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          className="border-y border-gray-300 p-2 text-center w-full focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
          placeholder="Enter quantity"
        />
        <button
          type="button"
          onClick={incrementQuantity}
          className="bg-gray-100 hover:bg-gray-200 p-2 rounded-r-lg border border-l-0 border-gray-300 transition-colors flex items-center justify-center"
        >
          <Plus size={18} className="text-gray-700" />
        </button>
      </div>
      <div className="flex items-center mt-2">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${quantity < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {quantity < 0 ? 'Removing' : 'Adding'} {Math.abs(quantity)} units
        </div>
        <p className="text-xs text-gray-500 ml-2">
          Use negative values for removing stock, positive for adding stock
        </p>
      </div>
    </div>
  );
};

export default QuantityAdjuster; 