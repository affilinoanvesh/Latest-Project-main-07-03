import React from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface SyncOptionsSectionProps {
  showSyncOptions: boolean;
  syncType: 'all' | 'products' | 'inventory' | 'year' | 'custom';
  syncYear: number;
  syncStartDate: string;
  syncEndDate: string;
  years: number[];
  onToggleSyncOptions: () => void;
  onSyncTypeChange: (type: 'all' | 'products' | 'inventory' | 'year' | 'custom') => void;
  onSyncYearChange: (year: number) => void;
  onSyncStartDateChange: (date: string) => void;
  onSyncEndDateChange: (date: string) => void;
}

const SyncOptionsSection: React.FC<SyncOptionsSectionProps> = ({
  showSyncOptions,
  syncType,
  syncYear,
  syncStartDate,
  syncEndDate,
  years,
  onToggleSyncOptions,
  onSyncTypeChange,
  onSyncYearChange,
  onSyncStartDateChange,
  onSyncEndDateChange
}) => {
  // Validate date range for custom sync
  const isValidDateRange = () => {
    if (syncType !== 'custom') return true;
    
    const start = new Date(syncStartDate);
    const end = new Date(syncEndDate);
    
    return start <= end;
  };

  const dateRangeError = !isValidDateRange() ? 
    "End date must be after start date" : "";

  return (
    <div className="bg-gray-50 p-4 rounded-md mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">Sync Options</h3>
        <button
          onClick={onToggleSyncOptions}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {showSyncOptions ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>
      
      {showSyncOptions && (
        <div className="space-y-4">
          <div>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="syncType"
                value="all"
                checked={syncType === 'all'}
                onChange={() => onSyncTypeChange('all')}
              />
              <span className="ml-2">Sync all data (last 3 months)</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              This will sync products, inventory, and orders from the last 3 months, month by month.
            </p>
          </div>
          
          <div>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="syncType"
                value="products"
                checked={syncType === 'products'}
                onChange={() => onSyncTypeChange('products')}
              />
              <span className="ml-2">Sync products only</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              This will only sync product data, which doesn't change as frequently.
            </p>
          </div>
          
          <div>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="syncType"
                value="inventory"
                checked={syncType === 'inventory'}
                onChange={() => onSyncTypeChange('inventory')}
              />
              <span className="ml-2">Sync inventory only</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              This will only sync inventory data, including stock quantities and prices.
            </p>
          </div>
          
          <div>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="syncType"
                value="year"
                checked={syncType === 'year'}
                onChange={() => onSyncTypeChange('year')}
              />
              <span className="ml-2">Sync by year</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              This will sync orders for the entire selected year, month by month.
            </p>
            
            {syncType === 'year' && (
              <div className="mt-2 ml-6">
                <select
                  className="p-2 border rounded"
                  value={syncYear}
                  onChange={(e) => onSyncYearChange(parseInt(e.target.value))}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="syncType"
                value="custom"
                checked={syncType === 'custom'}
                onChange={() => onSyncTypeChange('custom')}
              />
              <span className="ml-2">Sync by custom date range</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              This will sync orders for the specified date range, month by month.
            </p>
            
            {syncType === 'custom' && (
              <div className="mt-2 ml-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded"
                      value={syncStartDate}
                      onChange={(e) => onSyncStartDateChange(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded"
                      value={syncEndDate}
                      onChange={(e) => onSyncEndDateChange(e.target.value)}
                    />
                  </div>
                </div>
                
                {dateRangeError && (
                  <div className="mt-2 flex items-center text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {dateRangeError}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> All dates and times are in New Zealand timezone (NZST/NZDT).
              Data is processed in small batches to avoid overwhelming the WooCommerce API.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncOptionsSection;