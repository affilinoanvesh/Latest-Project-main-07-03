import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { ProductExpiry } from '../../types';
import { 
  addProductExpiry, 
  updateProductExpiry, 
  getBatchNumbersBySku,
  getTotalQuantityBySku
} from '../../db/operations/expiry';
import { formatNZDateOnly } from '../../utils/dateUtils';
import { productsService, productVariationsService } from '../../services';

interface ExpiryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expiryRecord?: ProductExpiry;
  isAddingAdditionalExpiry?: boolean;
  productForAdditionalExpiry?: {
    product_id: number;
    variation_id?: number;
    sku: string;
    product_name?: string;
  };
}

const ExpiryFormModal: React.FC<ExpiryFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  expiryRecord,
  isAddingAdditionalExpiry = false,
  productForAdditionalExpiry
}) => {
  const [products, setProducts] = useState<Array<{ id: number, name: string, sku: string }>>([]);
  const [variations, setVariations] = useState<Array<{ id: number, parent_id: number, name: string, sku: string }>>([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVariations, setShowVariations] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [existingBatchNumbers, setExistingBatchNumbers] = useState<string[]>([]);
  const [originalBatchNumber, setOriginalBatchNumber] = useState('');
  const [currentTotalQuantity, setCurrentTotalQuantity] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [originalQuantity, setOriginalQuantity] = useState(0);
  
  // Load products and variations
  useEffect(() => {
    const loadData = async () => {
      try {
        const productsData = await productsService.getAll();
        const variationsData = await productVariationsService.getAll();
        
        // Map products to a simpler format
        const mappedProducts = productsData.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku || ''
        })).filter(p => p.sku); // Only include products with SKUs
        
        // Map variations to a simpler format
        const mappedVariations = variationsData.map(v => ({
          id: v.id,
          parent_id: v.parent_id,
          name: v.name,
          sku: v.sku || ''
        })).filter(v => v.sku); // Only include variations with SKUs
        
        setProducts(mappedProducts);
        setVariations(mappedVariations);
      } catch (error) {
        console.error('Error loading products:', error);
        setError('Failed to load products. Please try again.');
      }
    };
    
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);
  
  // Load existing batch numbers and total quantity when SKU changes
  useEffect(() => {
    const loadSkuData = async () => {
      if (selectedSku) {
        try {
          // Get batch numbers
          const batchNumbers = await getBatchNumbersBySku(selectedSku);
          setExistingBatchNumbers(batchNumbers.filter(batch => batch !== originalBatchNumber));
          
          // Get total quantity
          const totalQty = await getTotalQuantityBySku(selectedSku);
          // Subtract original quantity if editing
          const adjustedTotal = expiryRecord ? totalQty - originalQuantity : totalQty;
          setCurrentTotalQuantity(adjustedTotal);
          
          // Get stock quantity
          let stockQty = 0;
          const product = products.find(p => p.sku === selectedSku);
          const variation = variations.find(v => v.sku === selectedSku);
          
          if (variation) {
            const variationObj = await productVariationsService.getById(variation.id);
            stockQty = variationObj?.stock_quantity || 0;
          } else if (product) {
            const productObj = await productsService.getById(product.id);
            stockQty = productObj?.stock_quantity || 0;
          }
          
          setStockQuantity(stockQty);
        } catch (error) {
          console.error('Error loading SKU data:', error);
        }
      }
    };
    
    loadSkuData();
  }, [selectedSku, originalBatchNumber, expiryRecord, originalQuantity, products, variations]);
  
  // Set form values if editing an existing record or adding additional expiry
  useEffect(() => {
    if (expiryRecord) {
      // Editing existing record
      setSelectedSku(expiryRecord.sku);
      setExpiryDate(formatNZDateOnly(new Date(expiryRecord.expiry_date)));
      setQuantity(expiryRecord.quantity.toString());
      setOriginalQuantity(expiryRecord.quantity);
      setBatchNumber(expiryRecord.batch_number || '');
      setOriginalBatchNumber(expiryRecord.batch_number || '');
      setNotes(expiryRecord.notes || '');
    } else if (isAddingAdditionalExpiry && productForAdditionalExpiry) {
      // Adding additional expiry date for existing product
      setSelectedSku(productForAdditionalExpiry.sku);
      setExpiryDate('');
      setQuantity('');
      setOriginalQuantity(0);
      setBatchNumber('');
      setOriginalBatchNumber('');
      setNotes('');
    } else {
      // New record
      setSelectedSku('');
      setExpiryDate('');
      setQuantity('');
      setOriginalQuantity(0);
      setBatchNumber('');
      setOriginalBatchNumber('');
      setNotes('');
    }
  }, [expiryRecord, isOpen, isAddingAdditionalExpiry, productForAdditionalExpiry]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!selectedSku) {
      setError('Please select a product');
      return;
    }
    
    if (!expiryDate) {
      setError('Please enter an expiry date');
      return;
    }
    
    if (!quantity || parseInt(quantity, 10) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    
    // Validate batch number for additional expiry dates
    if (isAddingAdditionalExpiry && !batchNumber) {
      setError('Batch number is required when adding additional expiry dates');
      return;
    }
    
    // Check for duplicate batch numbers
    if (batchNumber && batchNumber !== originalBatchNumber && existingBatchNumbers.includes(batchNumber)) {
      setError(`Batch number "${batchNumber}" already exists for this product. Please use a unique batch number.`);
      return;
    }
    
    // Check if total quantity exceeds stock
    const newQuantity = parseInt(quantity, 10);
    const newTotalQuantity = currentTotalQuantity + newQuantity;
    
    if (newTotalQuantity > stockQuantity) {
      if (!window.confirm(`Warning: The total quantity (${newTotalQuantity}) exceeds the current stock (${stockQuantity}). Do you want to continue anyway?`)) {
        return;
      }
    }
    
    setIsProcessing(true);
    
    try {
      // Find product or variation by SKU
      const product = products.find(p => p.sku === selectedSku);
      const variation = variations.find(v => v.sku === selectedSku);
      
      if (!product && !variation) {
        setError('Selected SKU not found');
        setIsProcessing(false);
        return;
      }
      
      // Parse date
      const dateParts = expiryDate.split('/');
      let parsedDate: Date;
      
      if (dateParts.length === 3) {
        // DD/MM/YYYY format
        parsedDate = new Date(
          parseInt(dateParts[2], 10),
          parseInt(dateParts[1], 10) - 1,
          parseInt(dateParts[0], 10)
        );
      } else {
        // Try standard date format
        parsedDate = new Date(expiryDate);
      }
      
      if (isNaN(parsedDate.getTime())) {
        setError('Invalid date format. Please use DD/MM/YYYY');
        setIsProcessing(false);
        return;
      }
      
      const expiryData = {
        product_id: product?.id || (variation ? variation.parent_id : 0),
        variation_id: variation?.id,
        sku: selectedSku,
        expiry_date: parsedDate,
        batch_number: batchNumber || undefined,
        quantity: newQuantity,
        stock_quantity: stockQuantity,
        notes: notes || undefined
      };
      
      if (expiryRecord?.id && !isAddingAdditionalExpiry) {
        // Update existing record
        await updateProductExpiry(expiryRecord.id, expiryData);
      } else {
        // Add new record (either brand new or additional expiry date)
        await addProductExpiry(expiryData);
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving expiry data:', error);
      setError(error.message || 'Failed to save expiry data. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Filter products and variations based on search term
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredVariations = variations.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {expiryRecord && !isAddingAdditionalExpiry 
              ? 'Edit Expiry Record' 
              : isAddingAdditionalExpiry 
                ? `Add Additional Expiry Date for ${productForAdditionalExpiry?.product_name || selectedSku}`
                : 'Add New Expiry Record'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            {expiryRecord && !isAddingAdditionalExpiry ? (
              // Editing existing record - show product info as read-only
              <div className="p-3 bg-blue-50 text-blue-800 rounded mb-2">
                <div className="font-medium">Editing expiry record for:</div>
                <div className="mt-1">
                  <strong>{expiryRecord.product_name || 'Product'}</strong>
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-700">SKU:</span> {expiryRecord.sku}
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-700">Current Stock:</span> {stockQuantity}
                </div>
              </div>
            ) : isAddingAdditionalExpiry ? (
              // Adding additional expiry date - show product info as read-only
              <div className="p-3 bg-blue-50 text-blue-800 rounded mb-2">
                <div className="font-medium">Adding additional expiry date for:</div>
                <div className="mt-1">
                  <strong>{productForAdditionalExpiry?.product_name || 'Product'}</strong>
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-700">SKU:</span> {selectedSku}
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-700">Current Stock:</span> {stockQuantity}
                </div>
              </div>
            ) : (
              // New record - show search and product selection
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Products
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or SKU"
                  className="border p-2 w-full rounded"
                />
              </>
            )}
          </div>
          
          <div className="mb-4">
            {!expiryRecord && !isAddingAdditionalExpiry && (
              // Only show variations toggle for new records
              <div className="flex items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 mr-4">
                  Show Variations
                </label>
                <input
                  type="checkbox"
                  checked={showVariations}
                  onChange={(e) => setShowVariations(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
            )}
            
            {!expiryRecord && !isAddingAdditionalExpiry && (
              // Only show product dropdown for new records
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Product
                </label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="border p-2 w-full rounded"
                  required
                >
                  <option value="">-- Select a product --</option>
                  
                  {/* Simple products */}
                  {filteredProducts.length > 0 && (
                    <optgroup label="Products">
                      {filteredProducts.map(product => (
                        <option key={`p-${product.id}`} value={product.sku}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Variations */}
                  {showVariations && filteredVariations.length > 0 && (
                    <optgroup label="Variations">
                      {filteredVariations.map(variation => {
                        const parent = products.find(p => p.id === variation.parent_id);
                        return (
                          <option key={`v-${variation.id}`} value={variation.sku}>
                            {parent ? `${parent.name} - ` : ''}{variation.name} ({variation.sku})
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                </select>
              </>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date (DD/MM/YYYY)
            </label>
            <input
              type="text"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="border p-2 w-full rounded"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="border p-2 w-full rounded"
              required
            />
            {currentTotalQuantity > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Current total across all batches: {currentTotalQuantity} {parseInt(quantity, 10) > 0 && `+ ${parseInt(quantity, 10)} = ${currentTotalQuantity + parseInt(quantity, 10)}`}
              </p>
            )}
            {stockQuantity > 0 && currentTotalQuantity + (parseInt(quantity, 10) || 0) > stockQuantity && (
              <p className="text-xs text-red-500 mt-1 flex items-center">
                <AlertTriangle size={12} className="mr-1" />
                Warning: Total quantity exceeds current stock ({stockQuantity})
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Number {isAddingAdditionalExpiry || existingBatchNumbers.length > 0 ? '(Required for multiple expiry dates)' : '(Optional)'}
            </label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="border p-2 w-full rounded"
              required={isAddingAdditionalExpiry || existingBatchNumbers.length > 0}
              placeholder={isAddingAdditionalExpiry || existingBatchNumbers.length > 0 ? "Enter a unique batch number" : "Optional batch number"}
            />
            {(isAddingAdditionalExpiry || existingBatchNumbers.length > 0) && (
              <p className="text-xs text-gray-500 mt-1">
                Batch number is required to distinguish between different expiry dates for the same product.
              </p>
            )}
            {existingBatchNumbers.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-blue-600 flex items-center">
                  <AlertTriangle size={12} className="mr-1" />
                  This product already has {existingBatchNumbers.length} other batch(es)
                </p>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border p-2 w-full rounded"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end">
            <button 
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded mr-2"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isProcessing}
              className={`flex items-center px-4 py-2 rounded ${
                isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isProcessing ? (
                <>Processing...</>
              ) : (
                <>
                  <Save size={16} className="mr-1" />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpiryFormModal; 