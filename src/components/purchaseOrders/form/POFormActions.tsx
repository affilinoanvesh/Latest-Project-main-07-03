import React from 'react';
import { Save, ArrowLeft } from 'lucide-react';

interface POFormActionsProps {
  isLoading: boolean;
  purchaseOrderId?: number;
  onCancel: () => void;
  isFormDirty: boolean;
}

const POFormActions: React.FC<POFormActionsProps> = ({
  isLoading,
  purchaseOrderId,
  onCancel,
  isFormDirty
}) => {
  const handleCancel = () => {
    if (isFormDirty && !window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      return;
    }
    onCancel();
  };

  return (
    <div className="flex justify-between">
      <button
        type="button"
        onClick={handleCancel}
        className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Cancel
      </button>
      
      <button
        type="submit"
        disabled={isLoading}
        className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-1" />
            {purchaseOrderId ? 'Update Purchase Order' : 'Save Purchase Order'}
          </>
        )}
      </button>
    </div>
  );
};

export default POFormActions; 