import React from 'react';
import { Supplier } from '../../types';
import { Edit, Trash2, Plus, Phone, Mail, Globe } from 'lucide-react';

interface SupplierListProps {
  suppliers: Supplier[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const SupplierList: React.FC<SupplierListProps> = ({ 
  suppliers, 
  loading, 
  onAdd,
  onEdit,
  onDelete 
}) => {
  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      onDelete(id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading suppliers...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Suppliers</h2>
        <button
          onClick={onAdd}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center transition-colors"
        >
          <Plus size={18} className="mr-1" /> Add Supplier
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No suppliers found</h3>
          <p className="text-gray-500 mb-4">Add your first supplier to get started</p>
          <button
            onClick={onAdd}
            className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
          >
            <Plus size={16} className="mr-1" /> Add Supplier
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Terms
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                      {supplier.address && (
                        <div className="text-sm text-gray-500 mt-1">{supplier.address}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {supplier.contact_person && (
                        <div className="text-sm font-medium text-gray-900">{supplier.contact_person}</div>
                      )}
                      <div className="flex flex-col space-y-1 mt-1">
                        {supplier.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone size={14} className="mr-1" /> {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail size={14} className="mr-1" /> {supplier.email}
                          </div>
                        )}
                        {supplier.website && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Globe size={14} className="mr-1" /> 
                            <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
                              {supplier.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.payment_terms || 'Not specified'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onEdit(supplier.id!)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Edit Supplier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id!)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Supplier"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierList; 