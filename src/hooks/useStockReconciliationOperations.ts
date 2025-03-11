import { useState } from 'react';
import { useStockReconciliation } from '../contexts/StockReconciliationContext';
import { 
  getStockMovementsBySku,
  addStockMovement,
  performReconciliation,
  generateReconciliationSummary,
  getAllStockMovements
} from '../db/operations/stockReconciliation';
import { processStockImportCsv } from '../utils/csv/stockImport';
import { 
  processMultipleOrdersStockMovements,
  processNewOrdersStockMovements 
} from '../db/operations/orders/processOrderStockMovements';
import { ordersService } from '../services';

export const useStockReconciliationOperations = () => {
  const {
    summaries,
    setSummaries,
    setFilteredSummaries,
    selectedSku,
    setSelectedSku,
    setSelectedItem,
    setMovements,
    setError,
    loadData,
    loadDataSilently,
    setLoading,
    matchesFilters
  } = useStockReconciliation();

  const [showHelp, setShowHelp] = useState(false);
  
  // Modal state
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [showInitialStockModal, setShowInitialStockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReconciliationHistoryModal, setShowReconciliationHistoryModal] = useState(false);

  // Handle view movements
  const handleViewMovements = async (sku: string) => {
    try {
      setSelectedSku(sku);
      const movementData = await getStockMovementsBySku(sku);
      setMovements(movementData);
      
      // Find the selected item
      const item = summaries.find(s => s.sku === sku);
      if (item) {
        setSelectedItem(item);
      }
      
      setShowMovementModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load movement data');
    }
  };

  // Handle add adjustment
  const handleAddAdjustment = (sku: string = '') => {
    console.log('handleAddAdjustment called with SKU:', sku);
    console.log('Current summaries:', summaries);
    
    // If a specific SKU is provided (from row button), find that item
    if (sku) {
      const item = summaries.find(s => s.sku === sku);
      console.log('Found item for SKU:', item);
      
      if (item) {
        console.log('Setting selectedItem for adjustment:', item);
        setSelectedItem(item);
        
        // Open the modal with the selected item
        setShowAdjustmentModal(true);
      } else {
        console.log('No item found for SKU:', sku);
        setSelectedItem(null);
        
        // Open the modal without a selected item
        setShowAdjustmentModal(true);
      }
    } else {
      // If no SKU provided (from general "Add Adjustment" button), don't preselect
      console.log('No SKU provided, not preselecting any item');
      setSelectedItem(null);
      
      // Open the modal without a selected item
      setShowAdjustmentModal(true);
    }
  };

  // Handle reconcile
  const handleReconcile = (sku: string) => {
    const item = summaries.find(s => s.sku === sku);
    if (item) {
      setSelectedItem(item);
      setShowReconciliationModal(true);
    }
  };

  // Submit adjustment
  const handleSubmitAdjustment = async (data: {
    sku: string;
    quantity: number;
    reason: 'expiry' | 'damage' | 'theft' | 'correction' | 'other';
    notes: string;
    batchNumber?: string;
    date: Date;
  }) => {
    try {
      // Create the base movement data
      const movementData = {
        sku: data.sku,
        movement_date: data.date,
        quantity: data.quantity,
        movement_type: 'adjustment' as const,
        reason: data.reason,
        notes: data.notes,
        batch_number: data.batchNumber
      };
      
      // Add the stock movement
      const movementId = await addStockMovement(movementData);
      
      // Get the product details to use in descriptions
      const product = summaries.find(s => s.sku === data.sku);
      const productName = product ? product.product_name : data.sku;
      
      setShowAdjustmentModal(false);
      
      // Instead of refreshing all data, only update the specific SKU
      try {
        // Get the updated summary for just this SKU
        const updatedSummary = await generateReconciliationSummary(data.sku);
        
        // Update the summaries array with the new data for this SKU
        setSummaries(prevSummaries => {
          const newSummaries = [...prevSummaries];
          const index = newSummaries.findIndex(s => s.sku === data.sku);
          if (index >= 0) {
            newSummaries[index] = updatedSummary;
          } else {
            newSummaries.push(updatedSummary);
          }
          return newSummaries;
        });
        
        // Also update filtered summaries if needed
        setFilteredSummaries(prevFiltered => {
          const newFiltered = [...prevFiltered];
          const index = newFiltered.findIndex(s => s.sku === data.sku);
          if (index >= 0) {
            newFiltered[index] = updatedSummary;
          }
          return newFiltered;
        });
        
        // If the user is currently viewing movements for this SKU, update those too
        if (selectedSku === data.sku) {
          const updatedMovements = await getStockMovementsBySku(data.sku);
          setMovements(updatedMovements);
        }
      } catch (updateError) {
        console.error('Error updating summary after adjustment:', updateError);
        // If there's an error updating just this SKU, fall back to full refresh
        loadDataSilently(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add adjustment');
    }
  };

  // Submit reconciliation
  const handleSubmitReconciliation = async (data: {
    sku: string;
    actualQuantity: number;
    notes: string;
  }) => {
    try {
      await performReconciliation(
        data.sku,
        data.actualQuantity,
        data.notes
      );
      
      setShowReconciliationModal(false);
      
      // Instead of refreshing all data, only update the specific SKU
      try {
        // Get the updated summary for just this SKU
        const updatedSummary = await generateReconciliationSummary(data.sku);
        
        // Update the summaries array with the new data for this SKU
        setSummaries(prevSummaries => {
          const newSummaries = [...prevSummaries];
          const index = newSummaries.findIndex(s => s.sku === data.sku);
          if (index >= 0) {
            newSummaries[index] = updatedSummary;
          } else {
            newSummaries.push(updatedSummary);
          }
          return newSummaries;
        });
        
        // Also update filtered summaries if needed
        setFilteredSummaries(prevFiltered => {
          const newFiltered = [...prevFiltered];
          const index = newFiltered.findIndex(s => s.sku === data.sku);
          if (index >= 0) {
            newFiltered[index] = updatedSummary;
          }
          return newFiltered;
        });
        
        // If the user is currently viewing movements for this SKU, update those too
        if (selectedSku === data.sku) {
          const updatedMovements = await getStockMovementsBySku(data.sku);
          setMovements(updatedMovements);
        }
      } catch (updateError) {
        console.error('Error updating summary after reconciliation:', updateError);
        // If there's an error updating just this SKU, fall back to full refresh
        loadDataSilently(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to perform reconciliation');
    }
  };

  // Submit initial stock
  const handleSubmitInitialStock = async (data: {
    sku: string;
    quantity: number;
    notes: string;
  }) => {
    try {
      await addStockMovement({
        sku: data.sku,
        movement_date: new Date(),
        quantity: data.quantity,
        movement_type: 'initial',
        notes: data.notes
      });
      
      setShowInitialStockModal(false);
      
      // Instead of refreshing all data, only update the specific SKU
      try {
        // Get the updated summary for just this SKU
        const updatedSummary = await generateReconciliationSummary(data.sku);
        
        // Update the summaries array with the new data for this SKU
        setSummaries(prevSummaries => {
          const newSummaries = [...prevSummaries];
          const index = newSummaries.findIndex(s => s.sku === data.sku);
          if (index >= 0) {
            newSummaries[index] = updatedSummary;
          } else {
            newSummaries.push(updatedSummary);
          }
          return newSummaries;
        });
        
        // Also update filtered summaries if needed
        setFilteredSummaries(prevFiltered => {
          const newFiltered = [...prevFiltered];
          const index = newFiltered.findIndex(s => s.sku === data.sku);
          if (index >= 0) {
            newFiltered[index] = updatedSummary;
          }
          return newFiltered;
        });
        
        // If the user is currently viewing movements for this SKU, update those too
        if (selectedSku === data.sku) {
          const updatedMovements = await getStockMovementsBySku(data.sku);
          setMovements(updatedMovements);
        }
      } catch (updateError) {
        console.error('Error updating summary after adding initial stock:', updateError);
        // If there's an error updating just this SKU, fall back to full refresh
        loadDataSilently(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add initial stock');
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async (file: File) => {
    try {
      const result = await processStockImportCsv(file);
      
      if (result.success > 0) {
        // Show success message
        setShowInitialStockModal(false);
        loadData(true);
      } else {
        setError('No items were imported successfully');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process CSV file');
    }
  };

  // Add a function to generate a report
  const handleGenerateReport = () => {
    setShowReportModal(true);
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all orders before processing
      const orders = await ordersService.getAll();
      
      // Track which SKUs are affected by the orders we're processing
      const affectedSkus = new Set<string>();
      
      // Use the optimized function that only processes new orders
      console.log('Using optimized order processing that only processes new orders');
      const result = await processNewOrdersStockMovements(orders);
      
      console.log(`Processed ${result.processed} orders, skipped ${result.skipped}, failed ${result.failed}`);
      
      if (result.errors.length > 0) {
        console.warn('Errors processing orders:', result.errors);
      }
      
      // If no orders were processed, we can skip refreshing the data
      if (result.processed === 0) {
        console.log('No new orders to process, skipping data refresh');
        setLoading(false);
        return;
      }
      
      // Collect SKUs from the orders that were processed
      for (const order of orders) {
        // Only consider completed or processing orders
        if (order.status === 'completed' || order.status === 'processing') {
          // Track SKUs in this order
          for (const item of order.line_items) {
            if (item.sku) {
              affectedSkus.add(item.sku);
            }
          }
        }
      }
      
      console.log(`Found ${affectedSkus.size} SKUs in orders to refresh`);
      
      // If we have affected SKUs and there are not too many, only refresh those specific SKUs
      // Otherwise, fall back to the standard refresh method
      if (affectedSkus.size > 0 && affectedSkus.size <= 20) {
        console.log(`Selectively refreshing ${affectedSkus.size} affected SKUs`);
        await refreshOnlyAffectedSkus(Array.from(affectedSkus));
      } else if (affectedSkus.size > 0) {
        // If there are too many affected SKUs, use the standard refresh
        console.log(`Using standard refresh for ${affectedSkus.size} SKUs`);
        // Explicitly load reconciliation data
        await loadData(true, true);
      } else {
        // If no SKUs were affected (unlikely but possible), just refresh the UI
        console.log('No SKUs affected, refreshing UI only');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      setError(error.message || 'Failed to refresh data');
      setLoading(false);
    }
  };

  // Refresh only the affected SKUs
  // This function only generates summaries for specific SKUs rather than all SKUs
  // It's used when a small number of SKUs are affected by order processing
  const refreshOnlyAffectedSkus = async (skus: string[]) => {
    try {
      console.log(`Refreshing only ${skus.length} affected SKUs`);
      
      // Process SKUs in batches to avoid overwhelming the database
      const batchSize = 5;
      const updatedSummaries: any[] = [];
      
      for (let i = 0; i < skus.length; i += batchSize) {
        const batch = skus.slice(i, i + batchSize);
        const batchPromises = batch.map(sku => 
          generateReconciliationSummary(sku)
            .catch(error => {
              console.error(`Error generating summary for SKU ${sku}:`, error);
              return null;
            })
        );
        
        const batchResults = await Promise.all(batchPromises);
        updatedSummaries.push(...batchResults.filter(Boolean));
      }
      
      // Update the summaries array with the new data for these SKUs
      setSummaries(prevSummaries => {
        const newSummaries = [...prevSummaries];
        
        // Update or add each summary
        for (const updatedSummary of updatedSummaries) {
          const index = newSummaries.findIndex(s => s.sku === updatedSummary.sku);
          if (index >= 0) {
            newSummaries[index] = updatedSummary;
          } else {
            newSummaries.push(updatedSummary);
          }
        }
        
        return newSummaries;
      });
      
      // Also update filtered summaries
      setFilteredSummaries(prevFiltered => {
        const newFiltered = [...prevFiltered];
        
        // Update or add each summary
        for (const updatedSummary of updatedSummaries) {
          const index = newFiltered.findIndex(s => s.sku === updatedSummary.sku);
          if (index >= 0) {
            newFiltered[index] = updatedSummary;
          } else {
            // Only add to filtered if it matches current filters
            if (matchesFilters(updatedSummary)) {
              newFiltered.push(updatedSummary);
            }
          }
        }
        
        return newFiltered;
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error refreshing affected SKUs:', error);
      setLoading(false);
    }
  };

  // Handle viewing reconciliation history
  const handleViewReconciliationHistory = (sku: string) => {
    const item = summaries.find(s => s.sku === sku);
    if (item) {
      setSelectedItem(item);
      setSelectedSku(sku);
      setShowReconciliationHistoryModal(true);
    }
  };

  // Handle movement deletion
  const handleMovementDeleted = async (movementId: number) => {
    try {
      // If we're viewing movements for a specific SKU, refresh the movements
      if (selectedSku) {
        const updatedMovements = await getStockMovementsBySku(selectedSku);
        setMovements(updatedMovements);
      }
      
      // Update the summary for this SKU
      const updatedSummary = await generateReconciliationSummary(selectedSku || '');
      
      // Update the summaries array with the new data for this SKU
      setSummaries(prevSummaries => {
        const newSummaries = [...prevSummaries];
        const index = newSummaries.findIndex(s => s.sku === selectedSku);
        if (index >= 0) {
          newSummaries[index] = updatedSummary;
        }
        return newSummaries;
      });
      
      // Also update filtered summaries if needed
      setFilteredSummaries(prevFiltered => {
        const newFiltered = [...prevFiltered];
        const index = newFiltered.findIndex(s => s.sku === selectedSku);
        if (index >= 0) {
          newFiltered[index] = updatedSummary;
        }
        return newFiltered;
      });
    } catch (error) {
      console.error('Error handling movement deletion:', error);
    }
  };

  return {
    // Modal state
    showHelp,
    setShowHelp,
    showMovementModal,
    setShowMovementModal,
    showAdjustmentModal,
    setShowAdjustmentModal,
    showReconciliationModal,
    setShowReconciliationModal,
    showInitialStockModal,
    setShowInitialStockModal,
    showReportModal,
    setShowReportModal,
    showReconciliationHistoryModal,
    setShowReconciliationHistoryModal,
    
    // Handlers
    handleViewMovements,
    handleAddAdjustment,
    handleReconcile,
    handleSubmitAdjustment,
    handleSubmitReconciliation,
    handleSubmitInitialStock,
    handleBulkUpload,
    handleGenerateReport,
    handleRefresh,
    handleViewReconciliationHistory,
    handleMovementDeleted,
  };
}; 