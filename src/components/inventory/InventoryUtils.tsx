import React from 'react';
import { HelpCircle } from 'lucide-react';
import { InventoryItem } from '../../types';

// Tooltip component for explanations
export const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative flex items-center">
    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
      {text}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
    </div>
  </div>
);

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Calculate profit margin with color coding
export const calculateProfitMargin = (retailPrice: number, costPrice: number, stockQuantity: number): React.ReactNode => {
  // If there's no stock, return "N/A"
  if (stockQuantity <= 0) {
    return <span className="text-gray-400">N/A</span>;
  }
  
  // If cost price is zero, handle specially
  if (costPrice <= 0) {
    return <span className="text-green-600 font-medium">100.00%</span>; // Assuming 100% profit if no cost
  }
  
  // Calculate margin
  const margin = ((retailPrice - costPrice) / retailPrice) * 100;
  
  // Handle edge cases
  if (isNaN(margin) || !isFinite(margin)) {
    return <span className="text-gray-500">0.00%</span>;
  }
  
  // Color code based on margin
  let colorClass = "text-red-600"; // Default for low margins
  
  if (margin >= 50) {
    colorClass = "text-green-600 font-medium";
  } else if (margin >= 30) {
    colorClass = "text-green-500";
  } else if (margin >= 20) {
    colorClass = "text-yellow-600";
  } else if (margin >= 10) {
    colorClass = "text-orange-500";
  }
  
  return <span className={colorClass}>{margin.toFixed(2)}%</span>;
};

// Calculate totals for inventory items
export const calculateTotals = (inventoryItems: InventoryItem[]): { 
  totalRetailValue: number; 
  totalCostValue: number; 
  potentialProfit: number;
} => {
  let retailValue = 0;
  let costValue = 0;
  
  inventoryItems.forEach(item => {
    retailValue += item.retail_value || 0;
    costValue += item.cost_value || 0;
  });
  
  return {
    totalRetailValue: retailValue,
    totalCostValue: costValue,
    potentialProfit: retailValue - costValue
  };
}; 