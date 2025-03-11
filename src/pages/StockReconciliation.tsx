import React, { useState } from 'react';

// Import context and hooks
import { StockReconciliationProvider } from '../contexts/StockReconciliationContext';
import { useStockReconciliation } from '../contexts/StockReconciliationContext';
import { useStockReconciliationOperations } from '../hooks/useStockReconciliationOperations';

// Import components
import StockReconciliationTable from '../components/stockReconciliation/StockReconciliationTable';
import StockReconciliationHeader from '../components/stockReconciliation/StockReconciliationHeader';
import StockReconciliationFilters from '../components/stockReconciliation/StockReconciliationFilters';
import StockReconciliationError from '../components/stockReconciliation/StockReconciliationError';
import StockReconciliationModals from '../components/stockReconciliation/StockReconciliationModals';

// Import cleanup utility
import { cleanupDuplicatePurchases } from '../utils/stockCleanup';

const StockReconciliationContent: React.FC = () => {
  // Get state from context
  const {
    loading,
    error,
    lastUpdated,
    searchTerm,
    setSearchTerm,
    discrepancyFilter,
    setDiscrepancyFilter,
    filteredSummaries,
    summaries,
    selectedSku,
    selectedItem,
    movements,
    products,
    setError
  } = useStockReconciliation();

  // Local state for cleanup loading
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Get operations from hook
  const {
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
    handleMovementDeleted
  } = useStockReconciliationOperations();

  // Handle cleanup of duplicate purchase movements
  const handleCleanupDuplicates = async () => {
    try {
      setCleanupLoading(true);
      const result = await cleanupDuplicatePurchases();
      
      if (result.success) {
        // Show success message
        setError(`Successfully removed ${result.removed} duplicate purchase movements.`);
        
        // Refresh data to show updated values
        await handleRefresh();
      } else {
        // Show error message
        setError(`Failed to clean up duplicates: ${result.errors.join(', ')}`);
      }
    } catch (error: any) {
      setError(`Error cleaning up duplicates: ${error.message}`);
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <div className="max-w-full mx-auto px-1 sm:px-2 py-4">
      {/* Header with help section and action buttons */}
      <StockReconciliationHeader
        loading={loading || cleanupLoading}
        lastUpdated={lastUpdated}
        showHelp={showHelp}
        setShowHelp={setShowHelp}
        onAddInitial={() => setShowInitialStockModal(true)}
        onAddAdjustment={() => handleAddAdjustment()}
        onRefresh={handleRefresh}
        onGenerateReport={handleGenerateReport}
        onCleanupDuplicates={handleCleanupDuplicates}
      />
      
      {/* Error message */}
      <StockReconciliationError
        error={error}
        summariesLength={summaries.length}
        lastUpdated={lastUpdated}
        loading={loading || cleanupLoading}
      />
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Search and filters */}
        <StockReconciliationFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          discrepancyFilter={discrepancyFilter}
          setDiscrepancyFilter={setDiscrepancyFilter}
        />
        
        {/* Data table */}
        <StockReconciliationTable 
          data={filteredSummaries}
          onViewMovements={handleViewMovements}
          onReconcile={handleReconcile}
          onAddAdjustment={handleAddAdjustment}
          onViewReconciliationHistory={handleViewReconciliationHistory}
          loading={loading || cleanupLoading}
          isFiltered={searchTerm !== '' || discrepancyFilter !== 'all'}
        />
      </div>
      
      {/* All modals */}
      <StockReconciliationModals
        showMovementModal={showMovementModal}
        showAdjustmentModal={showAdjustmentModal}
        showReconciliationModal={showReconciliationModal}
        showInitialStockModal={showInitialStockModal}
        showReportModal={showReportModal}
        showReconciliationHistoryModal={showReconciliationHistoryModal}
        selectedSku={selectedSku}
        selectedItem={selectedItem}
        movements={movements}
        summaries={summaries}
        products={products}
        onCloseMovementModal={() => setShowMovementModal(false)}
        onCloseAdjustmentModal={() => setShowAdjustmentModal(false)}
        onCloseReconciliationModal={() => setShowReconciliationModal(false)}
        onCloseInitialStockModal={() => setShowInitialStockModal(false)}
        onCloseReportModal={() => setShowReportModal(false)}
        onCloseReconciliationHistoryModal={() => setShowReconciliationHistoryModal(false)}
        onSubmitAdjustment={handleSubmitAdjustment}
        onSubmitReconciliation={handleSubmitReconciliation}
        onSubmitInitialStock={handleSubmitInitialStock}
        onBulkUpload={handleBulkUpload}
        onMovementDeleted={handleMovementDeleted}
        onRefresh={handleRefresh}
      />
    </div>
  );
};

// Wrap the content with the provider
const StockReconciliation: React.FC = () => {
  return (
    <StockReconciliationProvider>
      <StockReconciliationContent />
    </StockReconciliationProvider>
  );
};

export default StockReconciliation; 