import React from 'react';
import { 
  RefreshCw, 
  Plus, 
  FileText,
  Info,
  ChevronDown,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface StockReconciliationHeaderProps {
  loading: boolean;
  lastUpdated: Date | null;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  onAddInitial: () => void;
  onAddAdjustment: () => void;
  onRefresh: () => void;
  onGenerateReport: () => void;
  onCleanupDuplicates?: () => void;
}

const StockReconciliationHeader: React.FC<StockReconciliationHeaderProps> = ({
  loading,
  lastUpdated,
  showHelp,
  setShowHelp,
  onAddInitial,
  onAddAdjustment,
  onRefresh,
  onGenerateReport,
  onCleanupDuplicates
}) => {
  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Stock Reconciliation</h1>
        <p className="text-gray-600 mb-2">
          Track and manage your inventory with detailed stock movements and reconciliation.
        </p>
      </div>
      
      {/* Collapsible help section */}
      <div className="mb-6">
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center w-full text-left p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <Info className="h-5 w-5 text-blue-500 mr-2" />
          <span className="text-blue-800 font-medium">How to Use Stock Reconciliation</span>
          <span className="ml-auto">
            {showHelp ? <ChevronDown className="h-5 w-5 text-blue-500" /> : <ChevronRight className="h-5 w-5 text-blue-500" />}
          </span>
        </button>
        
        {showHelp && (
          <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <h3 className="text-sm font-medium text-yellow-800 mb-1">Important: How This Works With WooCommerce</h3>
              <p className="text-xs text-yellow-700">
                This system tracks and records stock movements but does not directly modify your WooCommerce inventory. 
                Actual stock levels are imported from WooCommerce. Use this tool to document and explain stock changes 
                that have already occurred in your WooCommerce store.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-blue-700 mb-1">View Stock Movements</h3>
                <p className="text-xs text-blue-600">
                  Click the actions menu (three dots) and select "View Movements" to see all stock changes for a product.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-700 mb-1">Reconcile Stock</h3>
                <p className="text-xs text-blue-600">
                  Select "Reconcile" to record the current WooCommerce stock levels and document any discrepancies. Note: Actual stock is imported from WooCommerce and cannot be directly edited here.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-700 mb-1">Add Adjustments</h3>
                <p className="text-xs text-blue-600">
                  Use "Add Adjustment" to record stock changes for reasons like damage, theft, or corrections. These adjustments help track why stock levels changed in WooCommerce.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-700 mb-1">View Reconciliation History</h3>
                <p className="text-xs text-blue-600">
                  Select "Reconciliation History" to see past reconciliations and edit notes for better tracking.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={onAddInitial}
            className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Initial
          </button>
          <button
            onClick={onAddAdjustment}
            className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
            title="Add adjustment for any product (damage, theft, expiry, etc.)"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Adjustment
          </button>
          <button
            onClick={onRefresh}
            className={`flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs`}
            disabled={loading}
            title="Process orders and refresh data from the server"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Processing...' : 'Process Orders & Refresh'}
          </button>
          <button
            onClick={onGenerateReport}
            className="flex items-center px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
          >
            <FileText className="h-3 w-3 mr-1" />
            Report
          </button>
          {onCleanupDuplicates && (
            <button
              onClick={onCleanupDuplicates}
              className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
              title="Clean up duplicate purchase movements"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Fix Duplicates
            </button>
          )}
        </div>
      </div>
      
      {lastUpdated && (
        <div className="mt-1 mb-3 flex items-center text-xs text-gray-500">
          <span>Stock Data Updated: <span className="text-blue-600 font-medium">{formatDateTime(lastUpdated)}</span> (after clicking "Process Orders & Refresh")</span>
        </div>
      )}
    </>
  );
};

export default StockReconciliationHeader; 