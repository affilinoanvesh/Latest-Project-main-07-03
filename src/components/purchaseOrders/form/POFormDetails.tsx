import React from 'react';
import { PurchaseOrder, Supplier } from '../../../types';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PAYMENT_METHODS = [
  'Credit Card',
  'Bank Transfer',
  'Cash',
  'Check',
  'PayPal',
  'Other'
];

const STATUS_OPTIONS = [
  { value: 'ordered', label: 'Ordered' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'received', label: 'Received' }
];

interface POFormDetailsProps {
  formData: PurchaseOrder;
  suppliers: Supplier[];
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSupplierChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const POFormDetails: React.FC<POFormDetailsProps> = ({
  formData,
  suppliers,
  handleInputChange,
  handleDateChange,
  handleSupplierChange
}) => {
  const navigate = useNavigate();
  
  const handleAddSupplier = () => {
    // Save current form state to localStorage
    localStorage.setItem('poFormData', JSON.stringify(formData));
    // Navigate to suppliers page
    navigate('/suppliers');
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Order Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            value={formData.date.toISOString().split('T')[0]}
            onChange={handleDateChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-2">
            <select
              name="supplier_id"
              value={formData.supplier_id || ''}
              onChange={handleSupplierChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">Select a supplier</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddSupplier}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center transition-colors"
              title="Add New Supplier"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="reference_number"
            value={formData.reference_number}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <select
            name="payment_method"
            value={formData.payment_method}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
          >
            {PAYMENT_METHODS.map(method => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default POFormDetails; 