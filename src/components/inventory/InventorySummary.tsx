import React from 'react';
import { DollarSign } from 'lucide-react';
import StatCard from '../StatCard';
import { formatCurrency, Tooltip } from './InventoryUtils';

interface InventorySummaryProps {
  totalRetailValue: number;
  totalCostValue: number;
  potentialProfit: number;
}

const InventorySummary: React.FC<InventorySummaryProps> = ({
  totalRetailValue,
  totalCostValue,
  potentialProfit
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="relative">
        <StatCard 
          title={
            <div className="flex items-center space-x-1">
              <span>Total Retail Value</span>
              <Tooltip text="The total value of all inventory items at their current retail price (Stock Quantity × Current Price)" />
            </div>
          }
          value={formatCurrency(totalRetailValue)}
          icon={<DollarSign className="h-5 w-5 text-green-500" />}
        />
      </div>
      
      <div className="relative">
        <StatCard 
          title={
            <div className="flex items-center space-x-1">
              <span>Total Cost Value</span>
              <Tooltip text="The total cost of all inventory items (Stock Quantity × Cost Price)" />
            </div>
          }
          value={formatCurrency(totalCostValue)}
          icon={<DollarSign className="h-5 w-5 text-blue-500" />}
        />
      </div>
      
      <div className="relative">
        <StatCard 
          title={
            <div className="flex items-center space-x-1">
              <span>Potential Profit</span>
              <Tooltip text="The potential profit if all inventory items are sold at their current retail price (Total Retail Value - Total Cost Value)" />
            </div>
          }
          value={formatCurrency(potentialProfit)}
          icon={<DollarSign className="h-5 w-5 text-purple-500" />}
        />
      </div>
    </div>
  );
};

export default InventorySummary; 