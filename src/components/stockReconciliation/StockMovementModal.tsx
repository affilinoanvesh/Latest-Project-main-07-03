import React, { useState, useEffect } from 'react';
import { StockMovement } from '../../types';
import { formatNZDate } from '../../utils/dateUtils';
import { X, Filter } from 'lucide-react';

interface StockMovementModalProps {
  sku: string;
  movements: StockMovement[];
  onClose: () => void;
}

const StockMovementModal: React.FC<StockMovementModalProps> = ({
  sku,
  movements,
  onClose
}) => {
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>(movements);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (typeFilter === 'all') {
      setFilteredMovements(movements);
    } else {
      setFilteredMovements(movements.filter(m => m.movement_type === typeFilter));
    }
  }, [typeFilter, movements]);

  // Get movement type label
  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'initial':
        return 'Initial Stock';
      case 'sale':
        return 'Sale';
      case 'adjustment':
        return 'Adjustment';
      case 'purchase':
        return 'Purchase';
      default:
        return type;
    }
  };

  // Get reason label
  const getReasonLabel = (reason: string | undefined) => {
    if (!reason) return '';
    
    switch (reason) {
      case 'expiry':
        return 'Expiry';
      case 'damage':
        return 'Damage';
      case 'theft':
        return 'Theft';
      case 'correction':
        return 'Correction';
      case 'other':
        return 'Other';
      default:
        return reason;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Stock Movement History - {sku}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <Filter size={16} />
            <span className="text-sm font-medium">Filter by type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="all">All Types</option>
              <option value="initial">Initial Stock</option>
              <option value="sale">Sales</option>
              <option value="adjustment">Adjustments</option>
              <option value="purchase">Purchases</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-grow p-4">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {formatNZDate(movement.movement_date)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {getMovementTypeLabel(movement.movement_type)}
                  </td>
                  <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${movement.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {getReasonLabel(movement.reason)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {movement.reference_id || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 max-w-xs truncate">
                    {movement.notes || '-'}
                  </td>
                </tr>
              ))}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No movements found for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockMovementModal; 