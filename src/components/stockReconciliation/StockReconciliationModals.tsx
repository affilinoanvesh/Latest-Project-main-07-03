import React from 'react';
import { StockReconciliationSummary, StockMovement } from '../../types';
import StockMovementModal from './StockMovementModal';
import StockAdjustmentModal from './StockAdjustmentModal';
import ReconciliationModal from './ReconciliationModal';
import InitialStockModal from './InitialStockModal';
import ReconciliationReport from './ReconciliationReport';
import ReconciliationHistoryModal from './ReconciliationHistoryModal';

interface StockReconciliationModalsProps {
  // Modal visibility state
  showMovementModal: boolean;
  showAdjustmentModal: boolean;
  showReconciliationModal: boolean;
  showInitialStockModal: boolean;
  showReportModal: boolean;
  showReconciliationHistoryModal: boolean;
  
  // Data
  selectedSku: string | null;
  selectedItem: StockReconciliationSummary | null;
  movements: StockMovement[];
  summaries: StockReconciliationSummary[];
  products: Array<{
    sku: string;
    name: string;
    stock_quantity: number;
    supplier_price?: number;
    is_variation?: boolean;
    parent_name?: string;
  }>;
  
  // Handlers
  onCloseMovementModal: () => void;
  onCloseAdjustmentModal: () => void;
  onCloseReconciliationModal: () => void;
  onCloseInitialStockModal: () => void;
  onCloseReportModal: () => void;
  onCloseReconciliationHistoryModal: () => void;
  onSubmitAdjustment: (data: {
    sku: string;
    quantity: number;
    reason: 'expiry' | 'damage' | 'theft' | 'correction' | 'other';
    notes: string;
    batchNumber?: string;
    date: Date;
  }) => Promise<void>;
  onSubmitReconciliation: (data: {
    sku: string;
    actualQuantity: number;
    notes: string;
  }) => Promise<void>;
  onSubmitInitialStock: (data: {
    sku: string;
    quantity: number;
    notes: string;
  }) => Promise<void>;
  onBulkUpload: (file: File) => Promise<void>;
  onMovementDeleted: (movementId: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const StockReconciliationModals: React.FC<StockReconciliationModalsProps> = ({
  // Modal visibility state
  showMovementModal,
  showAdjustmentModal,
  showReconciliationModal,
  showInitialStockModal,
  showReportModal,
  showReconciliationHistoryModal,
  
  // Data
  selectedSku,
  selectedItem,
  movements,
  summaries,
  products,
  
  // Handlers
  onCloseMovementModal,
  onCloseAdjustmentModal,
  onCloseReconciliationModal,
  onCloseInitialStockModal,
  onCloseReportModal,
  onCloseReconciliationHistoryModal,
  onSubmitAdjustment,
  onSubmitReconciliation,
  onSubmitInitialStock,
  onBulkUpload,
  onMovementDeleted,
  onRefresh
}) => {
  return (
    <>
      {/* Stock Movement Modal */}
      {showMovementModal && selectedSku && (
        <StockMovementModal
          sku={selectedSku}
          movements={movements}
          onClose={onCloseMovementModal}
          onMovementDeleted={onMovementDeleted}
        />
      )}
      
      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (() => {
        console.log('Rendering StockAdjustmentModal with selectedItem:', selectedItem);
        return (
          <StockAdjustmentModal
            products={products}
            onSubmit={onSubmitAdjustment}
            onClose={onCloseAdjustmentModal}
            sku={selectedItem?.sku}
            productName={selectedItem?.product_name}
            currentStock={selectedItem?.actual_stock}
          />
        );
      })()}
      
      {/* Reconciliation Modal */}
      {showReconciliationModal && selectedItem && (
        <ReconciliationModal
          sku={selectedItem.sku}
          productName={selectedItem.product_name}
          expectedStock={selectedItem.expected_stock}
          actualStock={selectedItem.actual_stock}
          onSubmit={onSubmitReconciliation}
          onClose={onCloseReconciliationModal}
        />
      )}
      
      {/* Initial Stock Modal */}
      {showInitialStockModal && (
        <InitialStockModal
          onSubmit={onSubmitInitialStock}
          onBulkUpload={onBulkUpload}
          onClose={onCloseInitialStockModal}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReconciliationReport
          data={summaries}
          onClose={onCloseReportModal}
        />
      )}

      {/* Reconciliation History Modal */}
      {showReconciliationHistoryModal && selectedItem && (
        <ReconciliationHistoryModal
          sku={selectedItem.sku}
          productName={selectedItem.product_name}
          onClose={onCloseReconciliationHistoryModal}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
};

export default StockReconciliationModals; 