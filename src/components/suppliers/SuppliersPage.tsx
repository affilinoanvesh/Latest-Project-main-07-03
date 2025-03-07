import React, { useState, useEffect } from 'react';
import { Supplier } from '../../types';
import { suppliersService } from '../../services';
import SupplierList from './SupplierList';
import SupplierForm from './SupplierForm';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type PageView = 'list' | 'add' | 'edit';

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<PageView>('list');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>(undefined);
  const navigate = useNavigate();
  const [returnToPO, setReturnToPO] = useState(false);

  useEffect(() => {
    loadSuppliers();
    // Check if we came from the purchase order form
    const poFormData = localStorage.getItem('poFormData');
    if (poFormData) {
      setReturnToPO(true);
    }
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const allSuppliers = await suppliersService.getAll();
      // Convert service suppliers to app Supplier type
      const formattedSuppliers = allSuppliers.map(supplier => ({
        ...supplier,
        created_at: new Date(supplier.created_at || new Date())
      })) as Supplier[];
      setSuppliers(formattedSuppliers);
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = () => {
    setSelectedSupplierId(undefined);
    setView('add');
  };

  const handleEditSupplier = (id: number) => {
    setSelectedSupplierId(id);
    setView('edit');
  };

  const handleDeleteSupplier = async (id: number) => {
    try {
      await suppliersService.delete(id);
      await loadSuppliers();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier');
    }
  };

  const handleSaveSupplier = async () => {
    await loadSuppliers();
    setView('list');
  };

  const handleCancel = () => {
    setView('list');
  };

  const handleReturnToPO = () => {
    localStorage.removeItem('poFormData');
    navigate('/purchase-orders');
  };

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 m-6 rounded-lg">
          {error}
          <button 
            className="ml-2 text-red-500 hover:text-red-700"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {returnToPO && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
          <p className="text-blue-700">
            You came from the Purchase Order form. After adding suppliers, you can return to continue creating your purchase order.
          </p>
          <button
            onClick={handleReturnToPO}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Return to Purchase Order
          </button>
        </div>
      )}

      {view === 'list' && (
        <SupplierList
          suppliers={suppliers}
          loading={loading}
          onAdd={handleAddSupplier}
          onEdit={handleEditSupplier}
          onDelete={handleDeleteSupplier}
        />
      )}

      {view === 'add' && (
        <SupplierForm
          onCancel={handleCancel}
          onSave={handleSaveSupplier}
        />
      )}

      {view === 'edit' && selectedSupplierId && (
        <SupplierForm
          supplierId={selectedSupplierId}
          onCancel={handleCancel}
          onSave={handleSaveSupplier}
        />
      )}
    </div>
  );
};

export default SuppliersPage; 