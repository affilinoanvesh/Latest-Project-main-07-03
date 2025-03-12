import React, { useState, useEffect } from 'react';
import { Trash2, Database } from 'lucide-react';
import { clearBrowserStorage, getLocalStorageSize } from '../../utils/cacheUtils';

interface CacheManagementSectionProps {
  onCacheCleared?: () => void;
}

const CacheManagementSection: React.FC<CacheManagementSectionProps> = ({ onCacheCleared }) => {
  const [clearing, setClearing] = useState(false);
  const [localStorageSize, setLocalStorageSize] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Get the size of localStorage
    setLocalStorageSize(getLocalStorageSize());
  }, []);

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear all browser cache? This will remove all locally stored data but will not affect data stored in Supabase.')) {
      setClearing(true);
      setSuccessMessage('');
      
      try {
        await clearBrowserStorage();
        setSuccessMessage('Browser cache cleared successfully!');
        setLocalStorageSize(getLocalStorageSize());
        
        if (onCacheCleared) {
          onCacheCleared();
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (error) {
        console.error('Error clearing cache:', error);
      } finally {
        setClearing(false);
      }
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Browser Cache Management</h2>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Clear browser cache to free up space and resolve potential data inconsistencies. 
        This will remove all locally stored data but will not affect data stored in Supabase.
      </p>
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
          {successMessage}
        </div>
      )}
      
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md mb-4">
        <div className="flex items-center">
          <Database className="h-5 w-5 text-gray-500 mr-2" />
          <span className="text-sm text-gray-700">
            Estimated browser storage usage: <span className="font-medium">{localStorageSize} KB</span>
          </span>
        </div>
        
        <button
          onClick={handleClearCache}
          disabled={clearing}
          className="flex items-center text-sm bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 disabled:bg-red-400"
        >
          {clearing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Clearing...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Browser Cache
            </>
          )}
        </button>
      </div>
      
      <div className="bg-yellow-50 p-3 rounded-md text-xs text-yellow-800">
        <p className="font-medium">Note:</p>
        <ul className="list-disc pl-4 mt-1 space-y-1">
          <li>Clearing the cache will remove all locally stored data including cached products, orders, and settings.</li>
          <li>This will not affect data stored in Supabase.</li>
          <li>You may need to refresh the page after clearing the cache.</li>
          <li>If you're experiencing data inconsistencies, try clearing the cache first.</li>
        </ul>
      </div>
    </div>
  );
};

export default CacheManagementSection; 