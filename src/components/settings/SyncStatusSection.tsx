import React from 'react';
import { format } from 'date-fns';
import { Info } from 'lucide-react';
import { formatNZDate, getNZTimezone } from '../../services/api/utils';

interface SyncStatusSectionProps {
  lastSyncTimes: {
    products: Date | null;
    orders: Date | null;
    inventory: Date | null;
  };
  syncProgress: number;
}

const SyncStatusSection: React.FC<SyncStatusSectionProps> = ({
  lastSyncTimes,
  syncProgress
}) => {
  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Never';
    return format(date, `dd/MM/yyyy h:mm a '(${getNZTimezone()}')`);
  };

  return (
    <div>
      {/* Sync Progress Bar */}
      {syncProgress > 0 && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${syncProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">{syncProgress}% complete</p>
        </div>
      )}
      
      {/* Sync Optimization Info */}
      <div className="bg-blue-50 p-4 rounded-md mb-4 flex items-start">
        <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
        <div>
          <p className="text-blue-700 font-medium">Smart Synchronization</p>
          <p className="text-sm text-blue-600">
            The system syncs data month by month and avoids re-syncing existing data to optimize performance and reduce API calls.
            Products are only synced if they haven't been updated in the last 24 hours. All dates and times are in New Zealand timezone.
          </p>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Last Sync Times</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Products</p>
            <p className="text-sm">{formatSyncTime(lastSyncTimes.products)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Orders</p>
            <p className="text-sm">{formatSyncTime(lastSyncTimes.orders)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Inventory</p>
            <p className="text-sm">{formatSyncTime(lastSyncTimes.inventory)}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 p-3 rounded-md">
        <p className="text-xs text-yellow-700">
          <strong>API Rate Limiting:</strong> WooCommerce REST API has a limit of 100 items per page. 
          This application optimizes requests by processing data in small batches to avoid overwhelming the API.
        </p>
      </div>
    </div>
  );
};

export default SyncStatusSection;