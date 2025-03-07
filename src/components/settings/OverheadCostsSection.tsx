import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { OverheadCost } from '../../types';

interface OverheadCostsSectionProps {
  overheadCosts: OverheadCost[];
  onAddCost: () => void;
  onRemoveCost: (id: number) => void;
  onCostChange: (id: number, field: keyof OverheadCost, value: any) => void;
}

const OverheadCostsSection: React.FC<OverheadCostsSectionProps> = ({
  overheadCosts,
  onAddCost,
  onRemoveCost,
  onCostChange
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Monthly Overhead Costs</h2>
        <button
          onClick={onAddCost}
          className="flex items-center text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Cost
        </button>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Define your monthly business overhead costs to accurately calculate profit margins.
        These costs will be distributed across your orders based on the selected type.
      </p>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {overheadCosts.map(cost => (
              <tr key={cost.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Cost name"
                    value={cost.name}
                    onChange={(e) => onCostChange(cost.id, 'name', e.target.value)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    className="w-full p-2 border rounded"
                    value={cost.type}
                    onChange={(e) => onCostChange(cost.id, 'type', e.target.value as any)}
                  >
                    <option value="fixed">Fixed (Monthly)</option>
                    <option value="percentage">Percentage of Order</option>
                    <option value="per_order">Per Order</option>
                    <option value="per_item">Per Item</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {cost.type === 'percentage' && <span className="mr-2">%</span>}
                    {cost.type !== 'percentage' && <span className="mr-2">$</span>}
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 p-2 border rounded"
                      value={cost.value}
                      onChange={(e) => onCostChange(cost.id, 'value', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onRemoveCost(cost.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
            
            {overheadCosts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No overhead costs defined. Click "Add Cost" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OverheadCostsSection;