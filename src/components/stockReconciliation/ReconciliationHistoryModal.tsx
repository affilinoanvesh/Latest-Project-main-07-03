import React, { useState, useEffect } from 'react';
import { X, Edit, Calendar, AlertTriangle, CheckCircle, Save, XCircle } from 'lucide-react';
import { StockReconciliation } from '../../types';
import { formatNZDate } from '../../utils/dateUtils';
import { getReconciliationHistoryBySku, updateStockReconciliation } from '../../db/operations/stockReconciliation';

interface ReconciliationHistoryModalProps {
  sku: string;
  productName: string;
  onClose: () => void;
  onRefresh: () => void;
}

const ReconciliationHistoryModal: React.FC<ReconciliationHistoryModalProps> = ({
  sku,
  productName,
  onClose,
  onRefresh
}) => {
  const [reconciliations, setReconciliations] = useState<StockReconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  // Load reconciliation history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const history = await getReconciliationHistoryBySku(sku);
        setReconciliations(history);
      } catch (error) {
        console.error('Error loading reconciliation history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [sku]);

  // Start editing a reconciliation
  const handleEdit = (reconciliation: StockReconciliation) => {
    setEditingId(reconciliation.id || null);
    setEditNotes(reconciliation.notes || '');
  };

  // Save edited notes
  const handleSave = async (reconciliation: StockReconciliation) => {
    if (!reconciliation.id) return;
    
    try {
      setSavingId(reconciliation.id);
      await updateStockReconciliation(reconciliation.id, { notes: editNotes });
      
      // Update local state
      setReconciliations(reconciliations.map(r => 
        r.id === reconciliation.id ? { ...r, notes: editNotes } : r
      ));
      
      // Reset editing state
      setEditingId(null);
      setEditNotes('');
      
      // Refresh parent component
      onRefresh();
    } catch (error) {
      console.error('Error updating reconciliation:', error);
    } finally {
      setSavingId(null);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
    setEditNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold">
              Reconciliation History
            </h2>
            <p className="text-sm text-gray-600">
              {productName} ({sku})
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-grow">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-2">Loading history...</span>
            </div>
          ) : reconciliations.length === 0 ? (
            <div className="text-center p-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No reconciliation history</h3>
              <p className="text-gray-500">
                This product has not been reconciled yet.
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800 mb-1">About Reconciliation History</h3>
                <p className="text-xs text-blue-700">
                  This view shows all past stock reconciliations for this product. You can edit the notes for any reconciliation to add more details or context.
                </p>
              </div>
              
              <div className="bg-white rounded-lg border overflow-hidden">
                {reconciliations.map((reconciliation, index) => (
                  <div 
                    key={reconciliation.id} 
                    className={`border-b last:border-b-0 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                  >
                    <div className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                        <div className="flex items-center mb-2 md:mb-0">
                          <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm font-medium">
                            {formatNZDate(reconciliation.reconciliation_date)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">Expected:</span>
                            <span className="text-sm font-medium">{reconciliation.expected_quantity}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">Actual:</span>
                            <span className="text-sm font-medium">{reconciliation.actual_quantity}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">Discrepancy:</span>
                            <span className={`text-sm font-medium flex items-center ${
                              reconciliation.discrepancy === 0 
                                ? 'text-green-500' 
                                : 'text-red-500'
                            }`}>
                              {reconciliation.discrepancy > 0 ? `+${reconciliation.discrepancy}` : reconciliation.discrepancy}
                              {reconciliation.discrepancy !== 0 && (
                                <AlertTriangle className="inline-block ml-1 h-3 w-3" />
                              )}
                              {reconciliation.discrepancy === 0 && (
                                <CheckCircle className="inline-block ml-1 h-3 w-3" />
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between items-start">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Notes
                          </label>
                          
                          {editingId !== reconciliation.id && (
                            <button
                              onClick={() => handleEdit(reconciliation)}
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                            >
                              <Edit size={12} className="mr-1" />
                              Edit Notes
                            </button>
                          )}
                        </div>
                        
                        {editingId === reconciliation.id ? (
                          <div>
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                              placeholder="Enter notes about this reconciliation"
                            />
                            
                            <div className="flex justify-end mt-2 space-x-2">
                              <button
                                onClick={handleCancel}
                                className="px-3 py-1 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
                              >
                                <XCircle size={12} className="mr-1" />
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSave(reconciliation)}
                                disabled={savingId === reconciliation.id}
                                className="px-3 py-1 text-xs bg-blue-600 rounded-md text-white hover:bg-blue-700 flex items-center"
                              >
                                <Save size={12} className="mr-1" />
                                {savingId === reconciliation.id ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-3 rounded-md text-sm min-h-[3rem]">
                            {reconciliation.notes || <span className="text-gray-400 italic">No notes provided</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconciliationHistoryModal; 