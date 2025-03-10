import React from 'react';
import { FileText, Hash } from 'lucide-react';

interface NotesAndBatchProps {
  notes: string;
  setNotes: (notes: string) => void;
  batchNumber: string;
  setBatchNumber: (batchNumber: string) => void;
}

const NotesAndBatch: React.FC<NotesAndBatchProps> = ({
  notes,
  setNotes,
  batchNumber,
  setBatchNumber
}) => {
  return (
    <div className="space-y-4">
      {/* Batch Number */}
      <div>
        <label htmlFor="batchNumber" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          <Hash size={16} className="text-gray-500 mr-1" />
          Batch Number (Optional)
        </label>
        <input
          id="batchNumber"
          type="text"
          value={batchNumber}
          onChange={(e) => setBatchNumber(e.target.value)}
          className="border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
          placeholder="Enter batch number if applicable"
        />
        <p className="text-xs text-gray-500 mt-1 ml-1">
          Use this to track specific batches of products
        </p>
      </div>
      
      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          <FileText size={16} className="text-gray-500 mr-1" />
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
          rows={3}
          placeholder="Enter detailed notes about this adjustment"
        />
        <p className="text-xs text-gray-500 mt-1 ml-1">
          Add any additional information about this stock adjustment
        </p>
      </div>
    </div>
  );
};

export default NotesAndBatch; 