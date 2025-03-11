export interface StockMovement {
  id?: number;
  sku: string;
  product_id?: number;
  variation_id?: number;
  movement_date: Date;
  quantity: number;
  movement_type: 'initial' | 'sale' | 'adjustment' | 'purchase';
  reference_id?: string;
  reason?: 'expiry' | 'damage' | 'theft' | 'correction' | 'other';
  notes?: string;
  batch_number?: string;
  created_at?: Date;
  created_by?: string;
  expiry_date?: Date;
  
  // UI helper properties
  product_name?: string;
}

export interface StockReconciliation {
  id?: number;
  sku: string;
  product_id?: number;
  variation_id?: number;
  reconciliation_date: Date;
  expected_quantity: number;
  actual_quantity: number;
  discrepancy: number;
  notes?: string;
  created_at?: Date;
  created_by?: string;
  
  // UI helper properties
  product_name?: string;
}

export interface StockReconciliationSummary {
  sku: string;
  product_id?: number;
  variation_id?: number;
  product_name: string;
  initial_stock: number;
  total_sales: number;
  total_adjustments: number;
  total_purchases: number;
  expected_stock: number;
  actual_stock: number;
  discrepancy: number;
  last_reconciled?: Date;
}

export type MovementReason = 'expiry' | 'damage' | 'theft' | 'correction' | 'other';
export type MovementType = 'initial' | 'sale' | 'adjustment' | 'purchase'; 