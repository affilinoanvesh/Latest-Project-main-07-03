import React, { useState, useEffect } from 'react';
import { Supplier } from '../../types';
import { suppliersService } from '../../services';
import { AlertCircle, Save, ArrowLeft } from 'lucide-react';

interface SupplierFormProps {
  supplierId?: number;
  onCancel: () => void;
  onSave: () => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ supplierId, onCancel, onSave }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Supplier>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    payment_terms: '',
    notes: '',
    created_at: new Date()
  });

  // Load existing supplier if editing
  useEffect(() => {
    if (supplierId) {
      const loadSupplier = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const supplier = await suppliersService.getById(supplierId);
          if (supplier) {
            // Ensure created_at is a Date object
            const supplierWithDate = {
              ...supplier,
              created_at: supplier.created_at ? new Date(supplier.created_at) : new Date()
            };
            setFormData(supplierWithDate);
          } else {
            setError('Supplier not found');
          }
        } catch (err) {
          console.error('Error loading supplier:', err);
          setError('Failed to load supplier data');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadSupplier();
    }
  }, [supplierId]);

  // Track form changes
  useEffect(() => {
    setIsFormDirty(true);
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Supplier name is required');
      }
      
      // Prepare data for Supabase - ensure required fields are present
      const supplierData = {
        ...formData,
        email: formData.email || '',  // Ensure email is not undefined
        phone: formData.phone || '',  // Ensure phone is not undefined
        updated_at: new Date()
      };
      
      // Save to Supabase
      if (supplierId) {
        // Update existing supplier
        await suppliersService.update(supplierId, supplierData);
      } else {
        // Add new supplier
        await suppliersService.add(supplierData);
      }
      
      // Reset form state
      setIsFormDirty(false);
      
      // Notify parent component
      onSave();
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError(err instanceof Error ? err.message : 'Failed to save supplier');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isFormDirty && !window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      return;
    }
    onCancel();
  };

  if (isLoading && supplierId) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading supplier...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium">Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Supplier Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter supplier name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Primary contact name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="contact@supplier.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="(123) 456-7890"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="123 Business St, City, State, ZIP"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="https://supplier.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                name="payment_terms"
                value={formData.payment_terms || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="e.g., Net 30, COD"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                rows={3}
                placeholder="Additional information about this supplier"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-8">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
            disabled={isLoading}
          >
            <ArrowLeft size={16} className="mr-1" /> Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-1" /> {supplierId ? 'Update' : 'Create'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierForm; 