import React from 'react';
import { RefreshCw } from 'lucide-react';
import SyncOptionsSection from './SyncOptionsSection';
import SyncStatusSection from './SyncStatusSection';

interface DataSyncSectionProps {
  syncing: boolean;
  syncProgress: number;
  credentialsExist: boolean;
  showSyncOptions: boolean;
  syncType: 'all' | 'products' | 'year' | 'custom';
  syncYear: number;
  syncStartDate: string;
  syncEndDate: string;
  years: number[];
  lastSyncTimes: {
    products: Date | null;
    orders: Date | null;
    inventory: Date | null;
  };
  onToggleSyncOptions: () => void;
  onSyncTypeChange: (type: 'all' | 'products' | 'year' | 'custom') => void;
  onSyncYearChange: (year: number) => void;
  onSyncStartDateChange: (date: string) => void;
  onSyncEndDateChange: (date: string) => void;
  onSyncData: () => void;
}

const DataSyncSection: React.FC<DataSyncSectionProps> = ({
  syncing,
  syncProgress,
  credentialsExist,
  showSyncOptions,
  syncType,
  syncYear,
  syncStartDate,
  syncEndDate,
  years,
  lastSyncTimes,
  onToggleSyncOptions,
  onSyncTypeChange,
  onSyncYearChange,
  onSyncStartDateChange,
  onSyncEndDateChange,
  onSyncData
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Data Synchronization</h2>
        <div className="flex space-x-2">
          <button
            onClick={onToggleSyncOptions}
            className="flex items-center text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200"
          >
            {showSyncOptions ? "Hide Options" : "Show Options"}
          </button>
          
          <button
            onClick={onSyncData}
            disabled={syncing || !credentialsExist}
            className="flex items-center text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Sync Now
              </>
            )}
          </button>
        </div>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Synchronize your data with the local database to reduce API calls and improve performance.
        Data will only be synced when you click the "Sync Now" button.
      </p>
      
      {/* Sync Options */}
      <SyncOptionsSection
        showSyncOptions={showSyncOptions}
        syncType={syncType}
        syncYear={syncYear}
        syncStartDate={syncStartDate}
        syncEndDate={syncEndDate}
        years={years}
        onToggleSyncOptions={onToggleSyncOptions}
        onSyncTypeChange={onSyncTypeChange}
        onSyncYearChange={onSyncYearChange}
        onSyncStartDateChange={onSyncStartDateChange}
        onSyncEndDateChange={onSyncEndDateChange}
      />
      
      {/* Sync Status */}
      <SyncStatusSection
        lastSyncTimes={lastSyncTimes}
        syncProgress={syncProgress}
      />
    </div>
  );
};

export default DataSyncSection;