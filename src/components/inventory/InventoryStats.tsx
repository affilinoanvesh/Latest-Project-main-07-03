import React from 'react';
import { InventoryItem } from '../../types';
import { Tooltip } from './InventoryUtils';

interface InventoryStatsProps {
  inventory: InventoryItem[];
  filteredInventory: InventoryItem[];
}

const InventoryStats: React.FC<InventoryStatsProps> = ({ inventory, filteredInventory }) => {
  const simpleProductsCount = inventory.filter(item => !item.variation_id).length;
  const variationsCount = inventory.filter(item => !!item.variation_id).length;
  const inStockCount = inventory.filter(item => (item.stock_quantity || 0) > 0).length;
  const outOfStockCount = inventory.filter(item => (item.stock_quantity || 0) === 0).length;
  
  // For filtered inventory
  const filteredSimpleCount = filteredInventory.filter(item => !item.variation_id).length;
  const filteredVariationsCount = filteredInventory.filter(item => !!item.variation_id).length;
  const filteredInStockCount = filteredInventory.filter(item => (item.stock_quantity || 0) > 0).length;
  const filteredOutOfStockCount = filteredInventory.filter(item => (item.stock_quantity || 0) === 0).length;
  
  return (
    <div className="mt-4 bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap justify-between items-center text-sm text-gray-500 gap-2">
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            <span className="font-medium">Total Items:</span>
            <Tooltip text="Total number of inventory items in the database" />
          </div>
          <span>{inventory.length} (showing {filteredInventory.length})</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            <span className="font-medium">Simple Products:</span>
            <Tooltip text="Products without variations (e.g., a single product with no size/color options)" />
          </div>
          <span>{simpleProductsCount} (showing {filteredSimpleCount})</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            <span className="font-medium">Variations:</span>
            <Tooltip text="Product variations (e.g., different sizes, colors, or other attributes of a parent product)" />
          </div>
          <span>{variationsCount} (showing {filteredVariationsCount})</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            <span className="font-medium">In Stock:</span>
            <Tooltip text="Items with stock quantity greater than zero" />
          </div>
          <span>{inStockCount} (showing {filteredInStockCount})</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            <span className="font-medium">Out of Stock:</span>
            <Tooltip text="Items with zero stock quantity" />
          </div>
          <span>{outOfStockCount} (showing {filteredOutOfStockCount})</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            <span className="font-medium">Last Updated:</span>
            <Tooltip text="Time when the inventory data was last refreshed" />
          </div>
          <span>{new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default InventoryStats; 