export interface Product {
  sku: string;
  name: string;
  stock_quantity: number;
  supplier_price?: number;
  is_variation?: boolean;
  parent_name?: string;
} 