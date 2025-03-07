import React from 'react';
import { AlertCircle } from 'lucide-react';

interface POFormHeaderProps {
  title: string;
  error: string | null;
  purchaseOrderId?: number;
}

const POFormHeader: React.FC<POFormHeaderProps> = ({ title, error, purchaseOrderId }) => {
  return (
    <div className="bg-gray-50 p-6 border-b border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      {purchaseOrderId && (
        <p className="text-sm text-gray-500 mt-1">ID: {purchaseOrderId}</p>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mt-4 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium">Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default POFormHeader; 