import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface StockReconciliationErrorProps {
  error: string | null;
  summariesLength: number;
  lastUpdated: Date | null;
  loading: boolean;
}

const StockReconciliationError: React.FC<StockReconciliationErrorProps> = ({
  error,
  summariesLength,
  lastUpdated,
  loading
}) => {
  if (!error && !(loading && summariesLength === 0)) {
    return null;
  }

  if (loading && summariesLength === 0) {
    return (
      <div className="mb-2 p-2 rounded-lg bg-yellow-100 text-yellow-800 flex items-center text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        <p>Loading stock reconciliation data... Please wait.</p>
      </div>
    );
  }

  return (
    <div className="mb-2 p-2 rounded-lg bg-red-100 text-red-700 flex items-center text-xs">
      <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />
      <div>
        <p className="font-medium">Error loading data</p>
        <p>{error}</p>
        {summariesLength > 0 && lastUpdated && (
          <p className="mt-0.5">Showing cached data from <span className="font-medium">{formatDateTime(lastUpdated)}</span></p>
        )}
      </div>
    </div>
  );
};

export default StockReconciliationError; 