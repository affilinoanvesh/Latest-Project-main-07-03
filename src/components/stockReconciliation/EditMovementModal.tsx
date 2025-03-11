import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save, Calendar, Package, ArrowRight, Tag, FileText, Trash2 } from 'lucide-react';
import { StockMovement, MovementReason } from '../../types';
import { getStockMovementById, updateStockMovement, deleteStockMovement } from '../../db/operations/stockReconciliation';
import { formatNZDate } from '../../utils/dateUtils';

interface EditMovementModalProps {
  movementId: number;
  onClose: () => void;
  onSuccess: (wasDeleted: boolean) => void;
}

const EditMovementModal: React.FC<EditMovementModalProps> = ({
  movementId,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movement, setMovement] = useState<StockMovement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Editable fields
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState<MovementReason>('other');
  const [batchNumber, setBatchNumber] = useState('');
  
  // Load movement data
  useEffect(() => {
    const loadMovement = async () => {
      try {
        setLoading(true);
        const data = await getStockMovementById(movementId);
        
        if (!data) {
          setError('Movement not found');
          return;
        }
        
        setMovement(data);
        setNotes(data.notes || '');
        setReason(data.reason as MovementReason || 'other');
        setBatchNumber(data.batch_number || '');
      } catch (err) {
        console.error('Error loading movement:', err);
        setError('Failed to load movement data');
      } finally {
        setLoading(false);
      }
    };
    
    loadMovement();
  }, [movementId]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!movement) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await updateStockMovement(movementId, {
        notes,
        reason,
        batch_number: batchNumber || undefined
      });
      
      onSuccess(false);
      onClose();
    } catch (err) {
      console.error('Error updating movement:', err);
      setError('Failed to update movement');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle delete
  const handleDelete = async () => {
    if (!movement) return;
    
    try {
      setDeleting(true);
      setError(null);
      
      await deleteStockMovement(movementId);
      
      onSuccess(true);
      onClose();
    } catch (err) {
      console.error('Error deleting movement:', err);
      setError('Failed to delete movement');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  // Get movement type label
  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'initial':
        return 'Initial Stock';
      case 'sale':
        return 'Sale';
      case 'adjustment':
        return 'Adjustment';
      case 'purchase':
        return 'Purchase';
      default:
        return type;
    }
  };
  
  // Get reason label
  const getReasonLabel = (reason: string | undefined) => {
    if (!reason) return '-';
    
    switch (reason) {
      case 'expiry':
        return 'Expiry';
      case 'damage':
        return 'Damage';
      case 'theft':
        return 'Theft';
      case 'correction':
        return 'Correction';
      case 'other':
        return 'Other';
      default:
        return reason;
    }
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-center mt-4">Loading movement data...</p>
        </div>
      </div>
    );
  }
  
  if (!movement) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
            <p className="text-gray-500">{error || 'Movement not found'}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold">Edit Stock Movement</h2>
            <p className="text-sm text-gray-600">
              {getMovementTypeLabel(movement.movement_type)} for {movement.sku}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-200">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                You can edit the notes, reason, and batch number for this movement. The other fields cannot be changed.
                If this entry was created by mistake, you can delete it using the delete button.
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Movement Details (Read-only) */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start">
                <Package className="h-4 w-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-1">SKU</div>
                  <div className="text-sm font-medium">{movement.sku}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <Calendar className="h-4 w-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-1">Date</div>
                  <div className="text-sm font-medium">{formatNZDate(movement.movement_date)}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <ArrowRight className="h-4 w-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-1">Type</div>
                  <div className="text-sm font-medium">{getMovementTypeLabel(movement.movement_type)}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <Tag className="h-4 w-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-1">Quantity</div>
                  <div className={`text-sm font-medium ${movement.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {movement.quantity}
                  </div>
                </div>
              </div>
              
              {movement.reference_id && (
                <div className="col-span-2 flex items-start">
                  <FileText className="h-4 w-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Reference</div>
                    <div className="text-sm font-medium">{movement.reference_id}</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Editable Fields */}
            <div className="space-y-4 pt-2">
              {movement.movement_type === 'adjustment' && (
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <select
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as MovementReason)}
                    className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="expiry">Expiry</option>
                    <option value="damage">Damage</option>
                    <option value="theft">Theft</option>
                    <option value="correction">Correction</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter notes about this movement"
                />
              </div>
              
              <div>
                <label htmlFor="batchNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Number
                </label>
                <input
                  id="batchNumber"
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter batch number (optional)"
                />
              </div>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-200 flex items-start">
                <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}
            
            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
                <p className="text-sm font-medium mb-2">Are you sure you want to delete this movement?</p>
                <p className="text-xs mb-3">This action cannot be undone. Deleting this record may affect inventory calculations.</p>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1 text-xs bg-red-600 rounded-md text-white hover:bg-red-700 flex items-center"
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Form actions */}
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center"
                disabled={saving || deleting}
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </button>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  disabled={saving || deleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  disabled={saving || deleting}
                >
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditMovementModal; 