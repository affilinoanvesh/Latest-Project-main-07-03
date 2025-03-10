import React from 'react';
import { Switch } from '../common/Switch';

interface OrderSettingsSectionProps {
  excludeOnHoldOrders: boolean;
  onExcludeOnHoldOrdersChange: (value: boolean) => void;
}

const OrderSettingsSection: React.FC<OrderSettingsSectionProps> = ({
  excludeOnHoldOrders,
  onExcludeOnHoldOrdersChange
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4">Order Settings</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Exclude On-Hold Orders</h3>
            <p className="text-xs text-gray-500 mt-1">
              When enabled, orders with "on-hold" status will be excluded from all orders, reports, and calculations.
            </p>
          </div>
          <Switch
            checked={excludeOnHoldOrders}
            onChange={onExcludeOnHoldOrdersChange}
            label=""
            srLabel="Exclude on-hold orders"
          />
        </div>
      </div>
    </div>
  );
};

export default OrderSettingsSection; 