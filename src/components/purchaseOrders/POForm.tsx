import React, { useState, useEffect } from 'react';
import { PurchaseOrder, PurchaseOrderItem, Product, Supplier } from '../../types';
import { purchaseOrdersService, purchaseOrderItemsService, productsService, suppliersService } from '../../services';
import { addProductExpiry } from '../../db/operations/expiry';
import POFormHeader from './form/POFormHeader';
import POFormDetails from './form/POFormDetails';
import POFormItemsTable from './form/POFormItemsTable';
import POFormActions from './form/POFormActions';

interface POFormProps {
  purchaseOrderId?: number;
  onCancel: () => void;
  onSave: () => void;
}

const POForm: React.FC<POFormProps> = ({ purchaseOrderId, onCancel, onSave }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showProductSearch, setShowProductSearch] = useState<number | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Form state
  const [formData, setFormData] = useState<PurchaseOrder>({
    date: new Date(),
    supplier_name: '',
    supplier_id: undefined,
    reference_number: '',
    total_amount: 0,
    payment_method: 'Bank Transfer',
    status: 'ordered',
    notes: '',
    created_at: new Date()
  });

  const [items, setItems] = useState<PurchaseOrderItem[]>([]);

  // Load existing purchase order if editing
  useEffect(() => {
    if (purchaseOrderId) {
      const loadPurchaseOrder = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // Get purchase order with items
          const purchaseOrder = await purchaseOrdersService.getPurchaseOrderWithItemsById(purchaseOrderId);
          
          if (purchaseOrder) {
            // Format dates and ensure all required fields exist
            setFormData({
              id: purchaseOrder.id,
              date: new Date(purchaseOrder.date),
              supplier_name: purchaseOrder.supplier_name || '',
              supplier_id: purchaseOrder.supplier_id,
              reference_number: purchaseOrder.reference_number || '',
              total_amount: purchaseOrder.total_amount || 0,
              payment_method: purchaseOrder.payment_method || 'Bank Transfer',
              status: purchaseOrder.status || 'ordered',
              notes: purchaseOrder.notes || '',
              expiry_date: purchaseOrder.expiry_date ? new Date(purchaseOrder.expiry_date) : undefined,
              created_at: new Date(purchaseOrder.created_at),
              updated_at: purchaseOrder.updated_at ? new Date(purchaseOrder.updated_at) : undefined
            });
            
            // Set items with default values for missing fields
            const formattedItems = (purchaseOrder.items || []).map(item => {
              // Create a new object with all required fields
              const formattedItem: PurchaseOrderItem = {
                id: item.id,
                purchase_order_id: item.purchase_order_id,
                sku: item.sku || '',
                product_name: item.product_name || '',
                quantity: item.quantity || 0,
                created_at: item.created_at ? new Date(item.created_at) : new Date()
              };
              
              // Add optional fields if they exist
              if (item.unit_price !== undefined) formattedItem.unit_price = item.unit_price;
              if (item.total_price !== undefined) formattedItem.total_price = item.total_price;
              if (item.quantity_received !== undefined) formattedItem.quantity_received = item.quantity_received;
              if (item.batch_number) formattedItem.batch_number = item.batch_number;
              if (item.expiry_date) formattedItem.expiry_date = new Date(item.expiry_date);
              if (item.notes) formattedItem.notes = item.notes;
              
              return formattedItem;
            });
            
            setItems(formattedItems);
          } else {
            setError('Purchase order not found');
          }
        } catch (err) {
          console.error('Error loading purchase order:', err);
          setError('Failed to load purchase order data');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadPurchaseOrder();
    }
  }, [purchaseOrderId]);

  // Load products and suppliers
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Load products
        const allProducts = await productsService.getAll();
        setProducts(allProducts);
        
        // Load suppliers
        const allSuppliers = await suppliersService.getAll();
        // Convert service suppliers to app Supplier type
        const formattedSuppliers = allSuppliers.map(supplier => ({
          ...supplier,
          created_at: new Date(supplier.created_at || new Date())
        })) as Supplier[];
        setSuppliers(formattedSuppliers);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load products or suppliers');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Search products when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const results = products.filter(product => 
      product.name.toLowerCase().includes(term) || 
      (product.sku && product.sku.toLowerCase().includes(term))
    ).slice(0, 10); // Limit to 10 results
    
    setSearchResults(results);
  }, [searchTerm, products]);

  // Track form changes
  useEffect(() => {
    setIsFormDirty(true);
  }, [formData, items]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, date: new Date(e.target.value) }));
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const supplierId = e.target.value ? parseInt(e.target.value, 10) : undefined;
    const supplier = suppliers.find(s => s.id === supplierId);
    
    setFormData(prev => ({
      ...prev,
      supplier_id: supplierId,
      supplier_name: supplier ? supplier.name : prev.supplier_name
    }));
  };

  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      purchase_order_id: purchaseOrderId || 0,
      sku: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      batch_number: '',
      notes: ''
    };
    
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Recalculate total price if quantity or unit price changes
      if (field === 'quantity' || field === 'unit_price') {
        const quantity = field === 'quantity' ? value : updated[index].quantity;
        const unitPrice = field === 'unit_price' ? value : updated[index].unit_price;
        updated[index].total_price = quantity * unitPrice;
      }
      
      return updated;
    });
  };

  const handleItemExpiryDateChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? new Date(e.target.value) : undefined;
    updateItem(index, 'expiry_date', value);
  };

  const selectProduct = (product: Product, index: number) => {
    updateItem(index, 'sku', product.sku || '');
    updateItem(index, 'product_name', product.name);
    updateItem(index, 'unit_price', product.cost_price || 0);
    updateItem(index, 'total_price', (product.cost_price || 0) * items[index].quantity);
    setShowProductSearch(null);
    setSearchTerm('');
  };

  const calculateTotal = () => {
    const total = items.reduce((sum, item) => sum + item.total_price, 0);
    setFormData(prev => ({ ...prev, total_amount: total }));
    return total;
  };

  useEffect(() => {
    calculateTotal();
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate form data
      if (!formData.supplier_name) {
        throw new Error('Supplier name is required');
      }
      
      if (items.length === 0) {
        throw new Error('At least one item is required');
      }
      
      // Prepare data for saving
      const purchaseOrderData = {
        ...formData,
        updated_at: new Date()
      };
      
      let savedPurchaseOrderId: number;
      
      if (purchaseOrderId) {
        // Update existing purchase order
        await purchaseOrdersService.update(purchaseOrderId, purchaseOrderData);
        savedPurchaseOrderId = purchaseOrderId;
      } else {
        // Create new purchase order
        const result = await purchaseOrdersService.add(purchaseOrderData);
        savedPurchaseOrderId = result.id!;
      }
      
      // Delete existing items if updating
      if (purchaseOrderId) {
        const existingItems = await purchaseOrderItemsService.getItemsByPurchaseOrderId(purchaseOrderId);
        for (const item of existingItems) {
          await purchaseOrderItemsService.delete(item.id!);
        }
      }
      
      // Save items
      for (const item of items) {
        await purchaseOrderItemsService.add({
          ...item,
          purchase_order_id: savedPurchaseOrderId
        });
        
        // Add to expiry tracking if expiry date is set
        if (item.expiry_date && item.batch_number) {
          try {
            // Get product details
            const product = products.find(p => p.sku === item.sku);
            
            // Create expiry record
            await addProductExpiry({
              product_id: product?.id || 0,
              sku: item.sku,
              product_name: item.product_name,
              expiry_date: item.expiry_date,
              quantity: item.quantity,
              batch_number: item.batch_number,
              notes: `Added from Purchase Order #${savedPurchaseOrderId}`
            });
            
            console.log(`Added expiry record for ${item.sku} with batch ${item.batch_number}`);
          } catch (expiryError) {
            console.error('Error adding expiry record:', expiryError);
            // Don't fail the whole operation if expiry record fails
          }
        }
      }
      
      // Reset form state
      setIsFormDirty(false);
      
      // Notify parent component
      onSave();
    } catch (err) {
      console.error('Error saving purchase order:', err);
      setError(err instanceof Error ? err.message : 'Failed to save purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemsUploaded = (newItems: PurchaseOrderItem[]) => {
    setItems(prev => [...prev, ...newItems]);
  };

  if (isLoading && purchaseOrderId) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading purchase order...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <POFormHeader 
        title={purchaseOrderId ? 'Edit Purchase Order' : 'Create Purchase Order'} 
        error={error}
        purchaseOrderId={purchaseOrderId}
      />
      
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <POFormDetails 
            formData={formData}
            suppliers={suppliers}
            handleInputChange={handleInputChange}
            handleDateChange={handleDateChange}
            handleSupplierChange={handleSupplierChange}
          />
          
          <POFormItemsTable 
            items={items}
            searchTerm={searchTerm}
            searchResults={searchResults}
            showProductSearch={showProductSearch}
            totalAmount={formData.total_amount}
            purchaseOrderId={purchaseOrderId}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
            onSearchTermChange={setSearchTerm}
            onShowProductSearch={setShowProductSearch}
            onSelectProduct={selectProduct}
            onExpiryDateChange={handleItemExpiryDateChange}
            onItemsUploaded={handleItemsUploaded}
            onError={setError}
          />
          
          <POFormActions 
            isLoading={isLoading}
            purchaseOrderId={purchaseOrderId}
            onCancel={onCancel}
            isFormDirty={isFormDirty}
          />
        </form>
      </div>
    </div>
  );
};

export default POForm; 