import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Save, AlertCircle, RefreshCw, Calendar, Download, Wifi, Layers, AlertTriangle } from 'lucide-react';
import { ApiCredentials, OverheadCost } from '../types';
import { formatErrorMessage } from '../utils/errorHandling';
import { 
  setApiCredentials, 
  getApiCredentials, 
  hasApiCredentials,
  fetchOverheadCosts,
  saveOverheadCosts,
  syncAllData,
  syncProductsOnly,
  syncInventory,
  getLastSyncTimes,
  syncOrdersByYear,
  syncOrdersByDateRange,
  forceDecemberSync,
  fetchDecemberOrdersDirectly,
  fetchDecemberOrdersInChunks,
  hasDecemberOrders
} from '../services/api';

// Import component sections
import ApiCredentialsSection from '../components/settings/ApiCredentialsSection';
import OverheadCostsSection from '../components/settings/OverheadCostsSection';
import SyncOptionsSection from '../components/settings/SyncOptionsSection';
import SyncStatusSection from '../components/settings/SyncStatusSection';

// Custom hook for operation state management
const useOperationState = (initialState = false) => {
  const [isOperating, setIsOperating] = useState(initialState);
  const [progress, setProgress] = useState(0);
  
  // Reset the operation state
  const reset = useCallback(() => {
    setIsOperating(false);
    setProgress(0);
  }, []);
  
  // Start the operation
  const start = useCallback(() => {
    setIsOperating(true);
    setProgress(0);
  }, []);
  
  // Update progress
  const updateProgress = useCallback((value: number) => {
    setProgress(Math.round(value));
  }, []);
  
  return {
    isOperating,
    progress,
    updateProgress,
    start,
    reset
  };
};

const Settings: React.FC = () => {
  // API Credentials state
  const [apiCredentials, setApiCreds] = useState<ApiCredentials>({
    store_url: '',
    key: '',
    secret: ''
  });
  const [credentialsExist, setCredentialsExist] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState(false);
  
  // Overhead costs state
  const [overheadCosts, setOverheadCosts] = useState<OverheadCost[]>([]);
  
  // Sync state
  const [lastSyncTimes, setLastSyncTimes] = useState<{
    products: Date | null;
    orders: Date | null;
    inventory: Date | null;
  }>({
    products: null,
    orders: null,
    inventory: null
  });
  const [showSyncOptions, setShowSyncOptions] = useState(false);
  const [syncType, setSyncType] = useState<'all' | 'products' | 'inventory' | 'year' | 'custom'>('all');
  const [syncYear, setSyncYear] = useState<number>(new Date().getFullYear());
  const [syncStartDate, setSyncStartDate] = useState<string>(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [syncEndDate, setSyncEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // December sync year state
  const [decemberSyncYear, setDecemberSyncYear] = useState<number>(new Date().getFullYear());
  
  // December orders status
  const [hasDecemberOrdersForYear, setHasDecemberOrdersForYear] = useState<boolean>(false);
  const [checkingDecemberOrders, setCheckingDecemberOrders] = useState<boolean>(false);
  
  // Connection test result
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success?: boolean;
    message?: string;
    details?: any;
  }>({});
  
  // Use the custom hook for operation states
  const syncOperation = useOperationState();
  const decemberRegularSync = useOperationState();
  const decemberDirectFetch = useOperationState();
  const decemberChunkedFetch = useOperationState();
  const decemberConnectionTest = useOperationState();
  
  // Generate years for selector (last 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load overhead costs
        const costs = await fetchOverheadCosts();
        setOverheadCosts(costs);
        
        // Load API credentials if they exist
        const hasCredentials = await hasApiCredentials();
        setCredentialsExist(hasCredentials);
        
        if (hasCredentials) {
          const credentials = await getApiCredentials();
          if (credentials) {
            setApiCreds(credentials);
          }
        } else {
          // If no credentials exist, show the form
          setEditingCredentials(true);
        }
        
        // Load last sync times
        const syncTimes = await getLastSyncTimes();
        setLastSyncTimes({
          products: syncTimes.products || null,
          orders: syncTimes.orders || null,
          inventory: syncTimes.inventory || null
        });
      } catch (error) {
        console.error('Error loading settings data:', error);
        setErrorMessage(formatErrorMessage(error, 'Failed to load settings data'));
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Overhead costs handlers
  const handleAddOverheadCost = () => {
    // Get the next available ID (max + 1)
    const nextId = overheadCosts.length > 0 
      ? Math.max(...overheadCosts.map(cost => cost.id)) + 1 
      : 1;

    const newCost: OverheadCost = {
      id: nextId,
      name: '',
      type: 'fixed',
      value: 0
    };
    
    setOverheadCosts([...overheadCosts, newCost]);
  };

  const handleRemoveOverheadCost = (id: number) => {
    setOverheadCosts(overheadCosts.filter(cost => cost.id !== id));
  };

  const handleOverheadCostChange = (id: number, field: keyof OverheadCost, value: any) => {
    setOverheadCosts(overheadCosts.map(cost => {
      if (cost.id === id) {
        return { ...cost, [field]: value };
      }
      return cost;
    }));
  };

  // API credentials handlers
  const handleApiCredentialsChange = (field: keyof ApiCredentials, value: string) => {
    setApiCreds({ ...apiCredentials, [field]: value });
  };

  // Save settings handler
  const handleSaveSettings = async () => {
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      // Save overhead costs
      await saveOverheadCosts(overheadCosts);
      
      // Save API credentials if they've been edited
      if (editingCredentials) {
        // Validate credentials before saving
        if (!apiCredentials.store_url || !apiCredentials.key || !apiCredentials.secret) {
          setErrorMessage('Please fill in all API credential fields');
          setSaving(false);
          return;
        }
        
        await setApiCredentials(apiCredentials);
        setCredentialsExist(true);
        setEditingCredentials(false);
      }
      
      setSuccessMessage('Settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMessage(formatErrorMessage(error, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  // Sync data handler
  const handleSyncData = async () => {
    syncOperation.start();
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      let result;
      
      switch (syncType) {
        case 'all':
          result = await syncAllData(syncOperation.updateProgress);
          break;
        case 'products':
          result = await syncProductsOnly(syncOperation.updateProgress);
          break;
        case 'inventory':
          result = await syncInventory(syncOperation.updateProgress);
          break;
        case 'year':
          // Create date range for the selected year
          const yearStartDate = new Date(syncYear, 0, 1);
          const yearEndDate = new Date(syncYear, 11, 31, 23, 59, 59);
          result = await syncOrdersByYear(
            yearStartDate.toISOString(), 
            yearEndDate.toISOString(), 
            syncOperation.updateProgress
          );
          break;
        case 'custom':
          const startDate = new Date(syncStartDate);
          const endDate = new Date(syncEndDate);
          // Set end date to end of day
          endDate.setHours(23, 59, 59);
          result = await syncOrdersByDateRange(
            startDate.toISOString(), 
            endDate.toISOString(), 
            syncOperation.updateProgress
          );
          break;
      }
      
      // Refresh last sync times
      const syncTimes = await getLastSyncTimes();
      setLastSyncTimes({
        products: syncTimes.products || null,
        orders: syncTimes.orders || null,
        inventory: syncTimes.inventory || null
      });
      
      setSuccessMessage(`Data sync completed successfully.`);
    } catch (error) {
      console.error('Sync error:', error);
      setErrorMessage(formatErrorMessage(error, 'Failed to sync data'));
    } finally {
      syncOperation.reset();
    }
  };

  // Generic function to handle all December sync operations
  const handleDecemberOperation = async (
    operationType: 'regular' | 'direct' | 'chunked' | 'testing',
    syncFunction: (year: number, progressCallback?: (progress: number) => void) => Promise<any>,
    successMessage: string
  ) => {
    // Set operation state
    setSuccessMessage('');
    setErrorMessage('');
    
    // Determine which operation state to use
    const operationState = 
      operationType === 'regular' ? decemberRegularSync :
      operationType === 'direct' ? decemberDirectFetch :
      operationType === 'chunked' ? decemberChunkedFetch :
      decemberConnectionTest;
    
    // Reset all operation states
    decemberRegularSync.reset();
    decemberDirectFetch.reset();
    decemberChunkedFetch.reset();
    decemberConnectionTest.reset();
    
    // Start the current operation
    operationState.start();
    
    try {
      // Skip credentials check for testing operation
      if (operationType !== 'testing') {
        // Check if API credentials are set
        const hasCredentials = await hasApiCredentials();
        if (!hasCredentials) {
          setErrorMessage('API credentials not set. Please save your API credentials first.');
          operationState.reset();
          return;
        }
      }
      
      // Create a progress update function
      const updateProgress = (progress: number) => {
        operationState.updateProgress(progress);
      };
      
      // Execute the appropriate sync function
      const result = await syncFunction(decemberSyncYear, updateProgress);
      
      // For testing, handle the result differently
      if (operationType === 'testing') {
        setConnectionTestResult(result);
        if (result.success) {
          setSuccessMessage(result.message);
        } else {
          setErrorMessage(result.message);
        }
      } else {
        // Update last sync times for non-testing operations
        const lastSyncTimes = await getLastSyncTimes();
        setLastSyncTimes({
          products: lastSyncTimes.products || null,
          orders: lastSyncTimes.orders || null,
          inventory: lastSyncTimes.inventory || null
        });
        
        // Check if December orders are now present
        await checkDecemberOrdersStatus(decemberSyncYear);
        
        setSuccessMessage(successMessage);
      }
    } catch (error) {
      console.error(`Error during December ${operationType} operation:`, error);
      const errorMessage = formatErrorMessage(
        error, 
        `Failed to ${operationType === 'testing' ? 'test API connection' : 'fetch December data'}`
      );
      setErrorMessage(errorMessage);
      
      if (operationType === 'testing') {
        setConnectionTestResult({
          success: false,
          message: errorMessage
        });
      }
    } finally {
      operationState.reset();
    }
  };

  // Add this function to check for December orders
  const checkDecemberOrdersStatus = async (year: number) => {
    setCheckingDecemberOrders(true);
    try {
      const hasOrders = await hasDecemberOrders(year);
      setHasDecemberOrdersForYear(hasOrders);
    } catch (error) {
      console.error('Error checking December orders status:', error);
      setErrorMessage(formatErrorMessage(error, 'Failed to check December orders status'));
    } finally {
      setCheckingDecemberOrders(false);
    }
  };
  
  // Update the useEffect to check for December orders when the year changes
  useEffect(() => {
    checkDecemberOrdersStatus(decemberSyncYear);
  }, [decemberSyncYear]);

  // Create adapter functions to match the expected signature
  const syncOrdersByYearAdapter = async (year: number, progressCallback?: (progress: number) => void) => {
    // Create date range for the entire year
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st 23:59:59
    
    // Convert to ISO strings as required by syncOrdersByYear
    return await syncOrdersByYear(startDate.toISOString(), endDate.toISOString(), progressCallback);
  };

  const fetchDecemberOrdersDirectlyAdapter = async (year: number, progressCallback?: (progress: number) => void) => {
    return await fetchDecemberOrdersDirectly(year, progressCallback);
  };

  const fetchDecemberOrdersInChunksAdapter = async (year: number, progressCallback?: (progress: number) => void) => {
    return await fetchDecemberOrdersInChunks(year, progressCallback);
  };

  // Handle regular December sync
  const handleDecemberSync = async () => {
    await handleDecemberOperation(
      'regular',
      syncOrdersByYearAdapter,
      `Successfully synced December ${decemberSyncYear} orders.`
    );
  };

  // Handle direct December fetch
  const handleDirectDecemberFetch = async () => {
    await handleDecemberOperation(
      'direct',
      fetchDecemberOrdersDirectlyAdapter,
      `Successfully fetched December ${decemberSyncYear} orders directly.`
    );
  };

  // Handle chunked December fetch
  const handleChunkedDecemberFetch = async () => {
    await handleDecemberOperation(
      'chunked',
      fetchDecemberOrdersInChunksAdapter,
      `Successfully fetched December ${decemberSyncYear} orders in chunks.`
    );
  };

  // Reset database handler
  const handleResetDatabase = async () => {
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      // Database reset functionality removed
      setSuccessMessage('Database reset functionality has been removed');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error resetting database:', error);
      setErrorMessage(formatErrorMessage(error, 'Failed to reset database'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {errorMessage}
        </div>
      )}
      
      {/* API Credentials Section */}
      <ApiCredentialsSection 
        apiCredentials={apiCredentials}
        credentialsExist={credentialsExist}
        editingCredentials={editingCredentials}
        onEditCredentials={() => setEditingCredentials(true)}
        onApiCredentialsChange={handleApiCredentialsChange}
      />
      
      {/* Data Sync Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Data Synchronization</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSyncOptions(!showSyncOptions)}
              className="flex items-center text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200"
            >
              {showSyncOptions ? "Hide Options" : "Show Options"}
            </button>
            
            <button
              onClick={handleSyncData}
              disabled={syncOperation.isOperating || !credentialsExist}
              className="flex items-center text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
            >
              {syncOperation.isOperating ? (
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
          onToggleSyncOptions={() => setShowSyncOptions(!showSyncOptions)}
          onSyncTypeChange={(type) => setSyncType(type)}
          onSyncYearChange={(year) => setSyncYear(year)}
          onSyncStartDateChange={(date) => setSyncStartDate(date)}
          onSyncEndDateChange={(date) => setSyncEndDate(date)}
        />
        
        {/* December Sync Section */}
        <div className="bg-yellow-50 p-4 rounded-md mb-4 border border-yellow-200">
          <h3 className="text-sm font-medium text-yellow-800 mb-2 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            December Data Sync Options
          </h3>
          <p className="text-xs text-yellow-700 mb-4">
            Use these options to specifically sync December data, which may require special handling due to year-end processing.
            If the regular sync method doesn't work, try the chunked fetch method which breaks the request into smaller date ranges.
          </p>
          
          <div className="flex items-center space-x-4 mb-4">
            <div>
              <label className="block text-xs text-yellow-700 mb-1">Year</label>
              <select
                className="p-2 border rounded text-sm"
                value={decemberSyncYear}
                onChange={(e) => setDecemberSyncYear(parseInt(e.target.value))}
                disabled={decemberRegularSync.isOperating}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Connection Test Results */}
          {connectionTestResult.message && (
            <div className={`p-3 rounded-md text-xs mb-4 ${
              connectionTestResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <p className="font-medium">{connectionTestResult.message}</p>
              {connectionTestResult.details && connectionTestResult.success && (
                <div className="mt-2">
                  <p>Total Orders: {connectionTestResult.details.totalOrders || 0}</p>
                  {connectionTestResult.details.firstOrderDate && (
                    <p>First Order Date: {connectionTestResult.details.firstOrderDate}</p>
                  )}
                </div>
              )}
              {connectionTestResult.details && !connectionTestResult.success && connectionTestResult.details.possibleCauses && (
                <div className="mt-2">
                  <p className="font-medium">Possible Causes:</p>
                  <ul className="list-disc pl-4 mt-1">
                    {connectionTestResult.details.possibleCauses.map((cause: string, index: number) => (
                      <li key={index}>{cause}</li>
                    ))}
                  </ul>
                  {connectionTestResult.details.recommendations && (
                    <>
                      <p className="font-medium mt-2">Recommendations:</p>
                      <ul className="list-disc pl-4 mt-1">
                        {connectionTestResult.details.recommendations.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Sync Buttons */}
          {connectionTestResult.success && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={handleDecemberSync}
                disabled={decemberRegularSync.isOperating}
                className={`px-3 py-2 rounded text-sm font-medium flex items-center ${
                  decemberRegularSync.isOperating 
                    ? 'bg-yellow-300 text-yellow-800 cursor-not-allowed' 
                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                }`}
              >
                {decemberRegularSync.isOperating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing... {decemberRegularSync.progress}%
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Regular Sync
                  </>
                )}
              </button>
              
              <button
                onClick={handleDirectDecemberFetch}
                disabled={decemberDirectFetch.isOperating}
                className={`px-3 py-2 rounded text-sm font-medium flex items-center ${
                  decemberDirectFetch.isOperating 
                    ? 'bg-blue-300 text-blue-800 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {decemberDirectFetch.isOperating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Fetching... {decemberDirectFetch.progress}%
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Direct API Fetch
                  </>
                )}
              </button>
              
              <button
                onClick={handleChunkedDecemberFetch}
                disabled={decemberChunkedFetch.isOperating}
                className={`px-3 py-2 rounded text-sm font-medium flex items-center ${
                  decemberChunkedFetch.isOperating 
                    ? 'bg-green-300 text-green-800 cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {decemberChunkedFetch.isOperating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Fetching in chunks... {decemberChunkedFetch.progress}%
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4 mr-2" />
                    Chunked Fetch (Recommended)
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* December Orders Status */}
          <div className={`p-3 rounded-md text-xs mb-4 ${
            checkingDecemberOrders 
              ? 'bg-gray-100 text-gray-700' 
              : hasDecemberOrdersForYear 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
          }`}>
            {checkingDecemberOrders ? (
              <div className="flex items-center">
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                Checking for December {decemberSyncYear} orders...
              </div>
            ) : hasDecemberOrdersForYear ? (
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                December {decemberSyncYear} orders are present in the database.
              </div>
            ) : (
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                No December {decemberSyncYear} orders found in the database.
              </div>
            )}
          </div>
          
          <div className="bg-yellow-100 p-3 rounded-md text-xs text-yellow-800">
            <p className="font-medium">Troubleshooting Tips:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>First use the "Sync Now" button to sync data.</li>
              <li>If the sync fails, try the "Direct API Fetch" method.</li>
              <li>The "Chunked Fetch" method breaks December into smaller date ranges to avoid timeouts.</li>
              <li>Check the browser console (F12) for detailed logs about the sync process.</li>
              <li>If you're getting Network Errors, verify your API credentials and URL in Settings.</li>
            </ul>
          </div>
        </div>
        
        {/* Sync Status */}
        <SyncStatusSection
          lastSyncTimes={lastSyncTimes}
          syncProgress={syncOperation.progress}
        />
      </div>
      
      {/* Overhead Costs Section */}
      <OverheadCostsSection 
        overheadCosts={overheadCosts}
        onAddCost={handleAddOverheadCost}
        onRemoveCost={handleRemoveOverheadCost}
        onCostChange={handleOverheadCostChange}
      />
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>
      
      {/* Reset Database Button */}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleResetDatabase}
          disabled={saving}
          className="flex items-center bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-red-400"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Resetting...
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 mr-2" />
              Reset Database
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Settings;