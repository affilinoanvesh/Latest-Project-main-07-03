import React, { useState, useEffect } from 'react';
import { getPurchaseOrders, deletePurchaseOrder } from '../db/operations/purchaseOrders';
import { PurchaseOrder } from '../types';
import POList from '../components/purchaseOrders/POList';
import POForm from '../components/purchaseOrders/POForm';
import PODetail from '../components/purchaseOrders/PODetail';
import { ShoppingBag, Plus, Search, RefreshCw, Filter } from 'lucide-react';

const PurchaseOrders: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedPOId, setSelectedPOId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'supplier' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  useEffect(() => {
    loadPurchaseOrders();
  }, []);
  
  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      const orders = await getPurchaseOrders();
      setPurchaseOrders(orders);
      setFilteredPOs(orders);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    let filtered = [...purchaseOrders];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(po => 
        po.reference_number.toLowerCase().includes(term) ||
        po.supplier_name.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(po => po.status === filterStatus);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'supplier':
          comparison = a.supplier_name.localeCompare(b.supplier_name);
          break;
        case 'amount':
          comparison = a.total_amount - b.total_amount;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredPOs(filtered);
  }, [searchTerm, purchaseOrders, filterStatus, sortBy, sortDirection]);
  
  const handleCreateNew = () => {
    setView('create');
    setSelectedPOId(null);
  };
  
  const handleViewDetail = (id: number) => {
    setSelectedPOId(id);
    setView('detail');
  };
  
  const handleEdit = (id: number) => {
    setSelectedPOId(id);
    setView('edit');
  };
  
  const handleDelete = async (id: number) => {
    try {
      await deletePurchaseOrder(id);
      await loadPurchaseOrders();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
    }
  };
  
  const handleBackToList = () => {
    setView('list');
    setSelectedPOId(null);
    loadPurchaseOrders();
  };

  const toggleSort = (field: 'date' | 'supplier' | 'amount') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };
  
  const renderContent = () => {
    switch (view) {
      case 'create':
        return (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b flex items-center">
              <ShoppingBag className="h-5 w-5 text-blue-500 mr-2" />
              <h1 className="text-xl font-semibold">Create Purchase Order</h1>
            </div>
            <POForm 
              onCancel={handleBackToList} 
              onSave={handleBackToList} 
            />
          </div>
        );
      
      case 'edit':
        return (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b flex items-center">
              <ShoppingBag className="h-5 w-5 text-blue-500 mr-2" />
              <h1 className="text-xl font-semibold">Edit Purchase Order</h1>
            </div>
            <POForm 
              purchaseOrderId={selectedPOId!} 
              onCancel={handleBackToList} 
              onSave={handleBackToList} 
            />
          </div>
        );
      
      case 'detail':
        return (
          <PODetail 
            purchaseOrderId={selectedPOId!} 
            onBack={handleBackToList}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        );
      
      case 'list':
      default:
        return (
          <>
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="p-4 border-b">
                <div className="flex items-center mb-4">
                  <ShoppingBag className="h-6 w-6 text-blue-500 mr-2" />
                  <h1 className="text-2xl font-bold">Purchase Orders</h1>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      placeholder="Search by reference # or supplier..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="all">All Statuses</option>
                        <option value="ordered">Ordered</option>
                        <option value="partially_received">Partially Received</option>
                        <option value="received">Received</option>
                      </select>
                      <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                    
                    <button
                      onClick={loadPurchaseOrders}
                      className="px-3 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 flex items-center transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw size={16} className="mr-1" /> Refresh
                    </button>
                    
                    <button
                      onClick={handleCreateNew}
                      className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center transition-colors"
                    >
                      <Plus size={16} className="mr-1" /> New Order
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="mb-4 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {filteredPOs.length} {filteredPOs.length === 1 ? 'order' : 'orders'} found
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Sort by:</span>
                    <button 
                      className={`px-2 py-1 rounded ${sortBy === 'date' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                      onClick={() => toggleSort('date')}
                    >
                      Date {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                    <button 
                      className={`px-2 py-1 rounded ${sortBy === 'supplier' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                      onClick={() => toggleSort('supplier')}
                    >
                      Supplier {sortBy === 'supplier' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                    <button 
                      className={`px-2 py-1 rounded ${sortBy === 'amount' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                      onClick={() => toggleSort('amount')}
                    >
                      Amount {sortBy === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </div>
                </div>
                
                <POList
                  purchaseOrders={filteredPOs}
                  loading={loading}
                  onViewDetail={handleViewDetail}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          </>
        );
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      {renderContent()}
    </div>
  );
};

export default PurchaseOrders; 