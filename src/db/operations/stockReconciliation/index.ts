import { supabase } from '../../../services/supabase';
import { 
  StockMovement, 
  StockReconciliation, 
  StockReconciliationSummary,
  MovementType,
  Order
} from '../../../types';
import { productsService, productVariationsService, settingsService, ordersService } from '../../../services';

/**
 * Add a new stock movement record
 */
export async function addStockMovement(movement: Omit<StockMovement, 'id' | 'created_at'>): Promise<number> {
  try {
    console.log(`Adding stock movement for SKU ${movement.sku}, type: ${movement.movement_type}, quantity: ${movement.quantity}`);
    
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        ...movement,
        created_at: new Date()
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    // Invalidate cache since data has changed
    invalidateReconciliationCache();
    
    console.log(`Added stock movement with ID ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('Error adding stock movement:', error);
    throw error;
  }
}

/**
 * Get stock movements by SKU, respecting the exclude on-hold orders setting
 */
export async function getStockMovementsBySku(sku: string): Promise<StockMovement[]> {
  try {
    // Check if we should exclude on-hold orders
    const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
    
    // If we're not excluding on-hold orders, just get all movements
    if (!excludeOnHold) {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('sku', sku)
        .order('movement_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
    
    // If we are excluding on-hold orders, we need to rebuild the movements
    // First, get all non-sale movements (initial, adjustment, purchase)
    const { data: nonSaleMovements, error: nonSaleError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('sku', sku)
      .neq('movement_type', 'sale')
      .order('movement_date', { ascending: false });
    
    if (nonSaleError) throw nonSaleError;
    
    // Now get all orders with this SKU that are NOT on-hold and are completed or processing
    // The updated getOrdersWithSku function now filters for completed or processing status
    const orders = await getOrdersWithSku(sku, true);
    
    // Create sale movements for each order
    const saleMovements: StockMovement[] = [];
    
    for (const order of orders) {
      // Find the line item with this SKU
      const lineItem = order.line_items.find(item => item.sku === sku);
      if (!lineItem) continue;
      
      // Create a sale movement
      saleMovements.push({
        sku,
        product_id: lineItem.product_id,
        variation_id: lineItem.variation_id,
        movement_date: order.date_completed || order.date_created || new Date(),
        quantity: -Math.abs(lineItem.quantity),
        movement_type: 'sale',
        reference_id: order.number,
        notes: `Order #${order.number}`
      });
    }
    
    // Combine non-sale movements with sale movements
    return [...nonSaleMovements, ...saleMovements];
  } catch (error) {
    console.error('Error getting stock movements by SKU:', error);
    throw error;
  }
}

/**
 * Get stock movements by type, respecting the exclude on-hold orders setting
 */
export async function getStockMovementsByType(type: MovementType): Promise<StockMovement[]> {
  try {
    // Check if we should exclude on-hold orders
    const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
    
    // If we're not excluding on-hold orders or this isn't a sale movement, just get all movements
    if (!excludeOnHold || type !== 'sale') {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('movement_type', type)
        .order('movement_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
    
    // If we are excluding on-hold orders and this is a sale movement, we need to rebuild the movements
    // Get all orders that are NOT on-hold
    const orders = await ordersService.getAll();
    
    // Create sale movements for each order
    const saleMovements: StockMovement[] = [];
    
    for (const order of orders) {
      // Skip orders that are not completed or processing
      if (order.status !== 'completed' && order.status !== 'processing') continue;
      
      for (const lineItem of order.line_items) {
        if (!lineItem.sku) continue;
        
        // Create a sale movement
        saleMovements.push({
          sku: lineItem.sku,
          product_id: lineItem.product_id,
          variation_id: lineItem.variation_id,
          movement_date: order.date_completed || order.date_created || new Date(),
          quantity: -Math.abs(lineItem.quantity),
          movement_type: 'sale',
          reference_id: order.number,
          notes: `Order #${order.number}`
        });
      }
    }
    
    return saleMovements;
  } catch (error) {
    console.error('Error getting stock movements by type:', error);
    throw error;
  }
}

/**
 * Get all stock movements, respecting the exclude on-hold orders setting
 */
export async function getAllStockMovements(): Promise<StockMovement[]> {
  try {
    // Check if we should exclude on-hold orders
    const excludeOnHold = await settingsService.getExcludeOnHoldOrders();
    
    // If we're not excluding on-hold orders, just get all movements
    if (!excludeOnHold) {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .order('movement_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
    
    // If we are excluding on-hold orders, we need to rebuild the movements
    // First, get all non-sale movements (initial, adjustment, purchase)
    const { data: nonSaleMovements, error: nonSaleError } = await supabase
      .from('stock_movements')
      .select('*')
      .neq('movement_type', 'sale')
      .order('movement_date', { ascending: false });
    
    if (nonSaleError) throw nonSaleError;
    
    // Now get all orders that are NOT on-hold
    const orders = await ordersService.getAll();
    
    // Create sale movements for each order
    const saleMovements: StockMovement[] = [];
    
    for (const order of orders) {
      // Skip orders that are not completed or processing
      if (order.status !== 'completed' && order.status !== 'processing') continue;
      
      for (const lineItem of order.line_items) {
        if (!lineItem.sku) continue;
        
        // Create a sale movement
        saleMovements.push({
          sku: lineItem.sku,
          product_id: lineItem.product_id,
          variation_id: lineItem.variation_id,
          movement_date: order.date_completed || order.date_created || new Date(),
          quantity: -Math.abs(lineItem.quantity),
          movement_type: 'sale',
          reference_id: order.number,
          notes: `Order #${order.number}`
        });
      }
    }
    
    // Combine non-sale movements with sale movements
    return [...nonSaleMovements, ...saleMovements];
  } catch (error) {
    console.error('Error getting all stock movements:', error);
    throw error;
  }
}

/**
 * Get orders that contain a specific SKU, with option to exclude on-hold orders
 */
export async function getOrdersWithSku(sku: string, excludeOnHold: boolean = false): Promise<Order[]> {
  try {
    // Get all orders
    const allOrders = await ordersService.getAll();
    
    // Filter orders to only include those with the specified SKU
    return allOrders.filter(order => {
      // If we're excluding on-hold orders and this order is on-hold, skip it
      if (excludeOnHold && order.status === 'on-hold') return false;
      
      // Only include completed or processing orders (similar to processOrderStockMovements)
      if (order.status !== 'completed' && order.status !== 'processing') return false;
      
      // Check if any line item has the specified SKU
      return order.line_items.some(item => item.sku === sku);
    });
  } catch (error) {
    console.error(`Error getting orders with SKU ${sku}:`, error);
    throw error;
  }
}

/**
 * Add a new stock reconciliation record
 */
export async function addStockReconciliation(reconciliation: Omit<StockReconciliation, 'id' | 'created_at'>): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('stock_reconciliations')
      .insert({
        ...reconciliation,
        created_at: new Date()
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    // Invalidate cache since data has changed
    invalidateReconciliationCache();
    
    return data.id;
  } catch (error) {
    console.error('Error adding stock reconciliation:', error);
    throw error;
  }
}

/**
 * Get the latest reconciliation for a SKU
 */
export async function getLatestReconciliationBySku(sku: string): Promise<StockReconciliation | null> {
  try {
    const { data, error } = await supabase
      .from('stock_reconciliations')
      .select('*')
      .eq('sku', sku)
      .order('reconciliation_date', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No reconciliation found
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting latest reconciliation:', error);
    return null;
  }
}

/**
 * Calculate expected stock for a SKU based on movements
 */
export async function calculateExpectedStock(sku: string): Promise<number> {
  try {
    const movements = await getStockMovementsBySku(sku);
    
    let expectedStock = 0;
    for (const movement of movements) {
      expectedStock += movement.quantity;
    }
    
    return expectedStock;
  } catch (error) {
    console.error('Error calculating expected stock:', error);
    throw error;
  }
}

/**
 * Get actual stock for a SKU from the inventory
 */
export async function getActualStock(sku: string): Promise<number> {
  try {
    // First try to find by SKU in products
    const product = await productsService.getProductBySku(sku);
    if (product && product.stock_quantity !== undefined) {
      return product.stock_quantity;
    }
    
    // If not found in products, try variations
    const variation = await productVariationsService.getVariationBySku(sku);
    if (variation && variation.stock_quantity !== undefined) {
      return variation.stock_quantity;
    }
    
    // If not found in either, return 0
    return 0;
  } catch (error) {
    console.error('Error getting actual stock:', error);
    return 0;
  }
}

/**
 * Generate a stock reconciliation summary for a SKU
 */
export async function generateReconciliationSummary(sku: string): Promise<StockReconciliationSummary> {
  try {
    console.log(`Generating reconciliation summary for SKU: ${sku}`);
    
    // Get stock movements
    let movements: StockMovement[] = [];
    try {
      movements = await getStockMovementsBySku(sku);
      console.log(`Found ${movements.length} movements for SKU ${sku}`);
    } catch (movementsError) {
      console.error(`Error getting movements for SKU ${sku}:`, movementsError);
      movements = [];
    }
    
    // Get latest reconciliation
    let latestReconciliation: StockReconciliation | null = null;
    try {
      latestReconciliation = await getLatestReconciliationBySku(sku);
    } catch (reconciliationError) {
      console.error(`Error getting latest reconciliation for SKU ${sku}:`, reconciliationError);
    }
    
    // Get actual stock
    const actualStock = await getActualStock(sku);
    
    // Get product details - use a more efficient approach with direct database queries
    let productName = 'Unknown Product';
    let productId = undefined;
    let variationId = undefined;
    
    // First check if it's a variation
    try {
      const { data: variation, error: variationError } = await supabase
        .from('product_variations')
        .select('id, parent_id, attributes')
        .eq('sku', sku)
        .maybeSingle();
      
      if (variation) {
        variationId = variation.id;
        productId = variation.parent_id;
        
        // Get parent product in the same query to reduce API calls
        const { data: parentProduct, error: parentError } = await supabase
          .from('products')
          .select('name')
          .eq('id', variation.parent_id)
          .maybeSingle();
        
        if (parentProduct) {
          const attributeText = variation.attributes && Array.isArray(variation.attributes) 
            ? variation.attributes.map((a: any) => a.option).join(', ') 
            : '';
          productName = attributeText 
            ? `${parentProduct.name} - ${attributeText}` 
            : `${parentProduct.name} (Variation)`;
        } else {
          productName = `Variation of Unknown Product (${sku})`;
        }
      } else {
        // If not a variation, check if it's a simple product
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name')
          .eq('sku', sku)
          .maybeSingle();
        
        if (product) {
          productName = product.name || 'Unnamed Product';
          productId = product.id;
        } else {
          productName = `Unknown Product (${sku})`;
        }
      }
    } catch (error) {
      console.error(`Error getting product details for SKU ${sku}:`, error);
      productName = `Unknown Product (${sku})`;
    }
    
    // Calculate totals by movement type
    let initialStock = 0;
    let totalSales = 0;
    let totalAdjustments = 0;
    let totalPurchases = 0;
    
    for (const movement of movements) {
      switch (movement.movement_type) {
        case 'initial':
          initialStock += movement.quantity;
          break;
        case 'sale':
          totalSales += movement.quantity; // This should be negative
          break;
        case 'adjustment':
          totalAdjustments += movement.quantity;
          break;
        case 'purchase':
          totalPurchases += movement.quantity;
          break;
      }
    }
    
    // For display purposes, convert totalSales to a positive number
    const displayTotalSales = Math.abs(totalSales);
    
    // Calculate expected stock
    const expectedStock = initialStock + totalSales + totalAdjustments + totalPurchases;
    
    // Calculate discrepancy
    const discrepancy = actualStock - expectedStock;
    
    console.log(`Summary for SKU ${sku}: Initial=${initialStock}, Sales=${totalSales}, Adjustments=${totalAdjustments}, Purchases=${totalPurchases}, Expected=${expectedStock}, Actual=${actualStock}, Discrepancy=${discrepancy}`);
    
    return {
      sku,
      product_id: productId,
      variation_id: variationId,
      product_name: productName,
      initial_stock: initialStock,
      total_sales: displayTotalSales, // Display as positive
      total_adjustments: totalAdjustments,
      total_purchases: totalPurchases,
      expected_stock: expectedStock,
      actual_stock: actualStock,
      discrepancy,
      last_reconciled: latestReconciliation?.reconciliation_date
    };
  } catch (error) {
    console.error(`Error generating reconciliation summary for SKU ${sku}:`, error);
    
    // Return a default summary with error indication
    return {
      sku,
      product_name: `Error: ${sku}`,
      initial_stock: 0,
      total_sales: 0,
      total_adjustments: 0,
      total_purchases: 0,
      expected_stock: 0,
      actual_stock: 0,
      discrepancy: 0
    };
  }
}

// Add a cache for reconciliation summaries
let reconciliationCache: StockReconciliationSummary[] | null = null;
let lastCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Invalidate the reconciliation cache
 */
export function invalidateReconciliationCache(): void {
  console.log('Invalidating reconciliation cache');
  reconciliationCache = null;
  lastCacheTime = 0;
}

/**
 * Get the timestamp of when the cache was last updated
 */
export function getLastCacheTime(): number | null {
  return lastCacheTime || null;
}

/**
 * Generate reconciliation summaries for all SKUs
 */
export async function generateAllReconciliationSummaries(forceRefresh = false): Promise<StockReconciliationSummary[]> {
  try {
    console.log('Generating all reconciliation summaries', {
      forceRefresh,
      hasCachedData: !!reconciliationCache,
      cacheAge: reconciliationCache ? `${(Date.now() - lastCacheTime) / 1000} seconds` : 'N/A',
      cacheDuration: `${CACHE_DURATION / 1000} seconds`,
      caller: new Error().stack?.split('\n')[2]?.trim() || 'unknown'
    });
    
    const now = Date.now();
    
    // Return cached data if available and not expired
    if (!forceRefresh && reconciliationCache && (now - lastCacheTime) < CACHE_DURATION) {
      console.log('Using cached reconciliation data from', new Date(lastCacheTime).toLocaleTimeString());
      return reconciliationCache;
    }
    
    console.log('Cache expired or force refresh requested, fetching fresh data');
    
    // Get all unique SKUs from stock movements
    let uniqueSkus: string[] = [];
    try {
      // Use a more efficient query to get distinct SKUs
      const { data: skuData, error: skuError } = await supabase
        .from('stock_movements')
        .select('sku')
        .order('sku');
      
      if (skuError) {
        console.error('Error getting SKUs from stock movements:', skuError);
        throw skuError;
      }
      
      // Filter to get unique SKUs
      uniqueSkus = Array.from(new Set(skuData.map((item: { sku: string }) => item.sku)));
      console.log(`Found ${uniqueSkus.length} unique SKUs in stock movements`);
    } catch (error) {
      console.error('Error getting unique SKUs:', error);
      return reconciliationCache || []; // Return cached data if available, otherwise empty array
    }
    
    // Generate summary for each SKU
    const summaries: StockReconciliationSummary[] = [];
    const errors: string[] = [];
    
    // Process SKUs in batches to avoid overwhelming the database
    const batchSize = 5;
    for (let i = 0; i < uniqueSkus.length; i += batchSize) {
      const batch = uniqueSkus.slice(i, i + batchSize);
      const batchPromises = batch.map(sku => generateReconciliationSummary(sku)
        .catch(error => {
          console.error(`Error generating summary for SKU ${sku}:`, error);
          errors.push(sku);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      summaries.push(...batchResults.filter(Boolean) as StockReconciliationSummary[]);
    }
    
    if (errors.length > 0) {
      console.error(`Failed to generate summaries for ${errors.length} SKUs: ${errors.join(', ')}`);
    }
    
    console.log(`Generated ${summaries.length} reconciliation summaries`);
    
    // Update cache
    reconciliationCache = summaries;
    lastCacheTime = now;
    
    return summaries;
  } catch (error) {
    console.error('Error generating all reconciliation summaries:', error);
    return reconciliationCache || []; // Return cached data if available, otherwise empty array
  }
}

/**
 * Perform a stock reconciliation for a SKU
 */
export async function performReconciliation(sku: string, actualQuantity: number, notes?: string): Promise<StockReconciliation> {
  try {
    console.log(`Performing reconciliation for SKU ${sku}, actual quantity: ${actualQuantity}`);
    
    const expectedQuantity = await calculateExpectedStock(sku);
    const discrepancy = actualQuantity - expectedQuantity;
    
    console.log(`Reconciliation for SKU ${sku}: Expected=${expectedQuantity}, Actual=${actualQuantity}, Discrepancy=${discrepancy}`);
    
    // Get product details
    let productId = undefined;
    let variationId = undefined;
    
    // First check if it's a simple product
    const product = await productsService.getProductBySku(sku);
    if (product) {
      productId = product.id;
    } else {
      // If not a simple product, check if it's a variation
      const variation = await productVariationsService.getVariationBySku(sku);
      if (variation) {
        productId = variation.parent_id;
        variationId = variation.id;
      }
    }
    
    // Create reconciliation record
    const reconciliation: Omit<StockReconciliation, 'id' | 'created_at'> = {
      sku,
      product_id: productId,
      variation_id: variationId,
      reconciliation_date: new Date(),
      expected_quantity: expectedQuantity,
      actual_quantity: actualQuantity,
      discrepancy,
      notes
    };
    
    const id = await addStockReconciliation(reconciliation);
    console.log(`Created reconciliation record with ID ${id}`);
    
    // If there's a discrepancy, add an adjustment movement to correct it
    if (discrepancy !== 0) {
      console.log(`Adding adjustment movement for discrepancy of ${discrepancy}`);
      await addStockMovement({
        sku,
        product_id: productId,
        variation_id: variationId,
        movement_date: new Date(),
        quantity: discrepancy,
        movement_type: 'adjustment',
        reason: 'correction',
        notes: `Automatic adjustment from reconciliation #${id}. ${notes || ''}`
      });
    }
    
    // Invalidate cache since data has changed
    invalidateReconciliationCache();
    
    return {
      ...reconciliation,
      id
    };
  } catch (error) {
    console.error('Error performing reconciliation:', error);
    throw error;
  }
}

/**
 * Clean up duplicate stock movements
 * This function identifies and removes duplicate stock movements for sales
 */
export async function cleanupDuplicateStockMovements(): Promise<{ removed: number, errors: string[] }> {
  try {
    console.log('Starting cleanup of duplicate stock movements');
    
    const result = {
      removed: 0,
      errors: [] as string[]
    };
    
    // Get all sale movements
    const { data: saleMovements, error: fetchError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('movement_type', 'sale')
      .order('movement_date', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching sale movements:', fetchError);
      throw fetchError;
    }
    
    if (!saleMovements || saleMovements.length === 0) {
      console.log('No sale movements found to clean up');
      return result;
    }
    
    console.log(`Found ${saleMovements.length} sale movements to analyze`);
    
    // Group movements by reference_id (order number) and sku
    const movementGroups: Record<string, any[]> = {};
    
    for (const movement of saleMovements) {
      if (!movement.reference_id || !movement.sku) continue;
      
      const key = `${movement.reference_id}:${movement.sku}:${movement.quantity}`;
      if (!movementGroups[key]) {
        movementGroups[key] = [];
      }
      movementGroups[key].push(movement);
    }
    
    // Find groups with duplicates
    const duplicateGroups = Object.entries(movementGroups)
      .filter(([_, movements]) => movements.length > 1);
    
    console.log(`Found ${duplicateGroups.length} groups with duplicate movements`);
    
    // Process each group with duplicates
    for (const [key, movements] of duplicateGroups) {
      try {
        // Sort by id (ascending) to keep the oldest one
        movements.sort((a, b) => a.id - b.id);
        
        // Keep the first one, delete the rest
        const [keep, ...duplicates] = movements;
        
        console.log(`Keeping movement ID ${keep.id} for ${key}, removing ${duplicates.length} duplicates`);
        
        // Delete duplicates
        const duplicateIds = duplicates.map(d => d.id);
        const { error: deleteError } = await supabase
          .from('stock_movements')
          .delete()
          .in('id', duplicateIds);
        
        if (deleteError) {
          console.error(`Error deleting duplicate movements for ${key}:`, deleteError);
          result.errors.push(`Failed to delete duplicates for ${key}: ${deleteError.message}`);
        } else {
          result.removed += duplicateIds.length;
        }
      } catch (error: any) {
        console.error(`Error processing duplicate group ${key}:`, error);
        result.errors.push(`Error processing ${key}: ${error.message}`);
      }
    }
    
    // Invalidate cache since data has changed
    if (result.removed > 0) {
      invalidateReconciliationCache();
    }
    
    console.log(`Cleanup complete. Removed ${result.removed} duplicate movements with ${result.errors.length} errors`);
    return result;
  } catch (error: any) {
    console.error('Error cleaning up duplicate stock movements:', error);
    return {
      removed: 0,
      errors: [error.message || 'Unknown error']
    };
  }
}

/**
 * Clean up all sale stock movements
 * This function removes all stock movements with type 'sale' to start fresh
 * Should only be used during a full refresh
 */
export async function cleanupAllSaleMovements(): Promise<{ removed: number, error?: string }> {
  try {
    console.log('Starting cleanup of all sale stock movements');
    
    // Delete all stock movements with type 'sale'
    const { data, error } = await supabase
      .from('stock_movements')
      .delete()
      .eq('movement_type', 'sale')
      .select('id');
    
    if (error) {
      console.error('Error deleting sale movements:', error);
      return { 
        removed: 0, 
        error: error.message 
      };
    }
    
    const removedCount = data?.length || 0;
    console.log(`Removed ${removedCount} sale stock movements`);
    
    // Invalidate cache since data has changed
    invalidateReconciliationCache();
    
    return { removed: removedCount };
  } catch (error: any) {
    console.error('Error cleaning up sale stock movements:', error);
    return { 
      removed: 0, 
      error: error.message || 'Unknown error' 
    };
  }
}

/**
 * Get reconciliation history for a specific SKU
 */
export async function getReconciliationHistoryBySku(sku: string): Promise<StockReconciliation[]> {
  try {
    const { data, error } = await supabase
      .from('stock_reconciliations')
      .select('*')
      .eq('sku', sku)
      .order('reconciliation_date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting reconciliation history:', error);
    return [];
  }
}

/**
 * Update a stock reconciliation record
 */
export async function updateStockReconciliation(id: number, updates: Partial<StockReconciliation>): Promise<void> {
  try {
    const { error } = await supabase
      .from('stock_reconciliations')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    
    // Invalidate cache since data has changed
    invalidateReconciliationCache();
  } catch (error) {
    console.error('Error updating stock reconciliation:', error);
    throw error;
  }
}

/**
 * Get a stock movement by ID
 */
export async function getStockMovementById(id: number): Promise<StockMovement | null> {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No movement found
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting stock movement by ID:', error);
    return null;
  }
}

/**
 * Update a stock movement
 */
export async function updateStockMovement(id: number, updates: Partial<StockMovement>): Promise<void> {
  try {
    const { error } = await supabase
      .from('stock_movements')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    
    // Invalidate cache since data has changed
    invalidateReconciliationCache();
  } catch (error) {
    console.error('Error updating stock movement:', error);
    throw error;
  }
}

/**
 * Delete a stock movement
 */
export async function deleteStockMovement(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('stock_movements')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Invalidate cache since data has changed
    invalidateReconciliationCache();
  } catch (error) {
    console.error('Error deleting stock movement:', error);
    throw error;
  }
}

/**
 * Clean up duplicate purchase stock movements
 * This function identifies and removes duplicate stock movements for purchases
 */
export async function cleanupDuplicatePurchaseMovements(): Promise<{ removed: number, errors: string[] }> {
  try {
    console.log('Starting cleanup of duplicate purchase stock movements');
    
    const result = {
      removed: 0,
      errors: [] as string[]
    };
    
    // Get all purchase movements
    const { data: purchaseMovements, error: fetchError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('movement_type', 'purchase')
      .order('movement_date', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching purchase movements:', fetchError);
      throw fetchError;
    }
    
    if (!purchaseMovements || purchaseMovements.length === 0) {
      console.log('No purchase movements found to clean up');
      return result;
    }
    
    console.log(`Found ${purchaseMovements.length} purchase movements to analyze`);
    
    // Group movements by reference_id (purchase order number) and sku
    const movementGroups: Record<string, any[]> = {};
    
    for (const movement of purchaseMovements) {
      if (!movement.reference_id || !movement.sku) continue;
      
      const key = `${movement.reference_id}:${movement.sku}:${movement.quantity}`;
      if (!movementGroups[key]) {
        movementGroups[key] = [];
      }
      movementGroups[key].push(movement);
    }
    
    // Find groups with duplicates
    const duplicateGroups = Object.entries(movementGroups)
      .filter(([_, movements]) => movements.length > 1);
    
    console.log(`Found ${duplicateGroups.length} groups with duplicate purchase movements`);
    
    // Process each group with duplicates
    for (const [key, movements] of duplicateGroups) {
      try {
        // Sort by id (ascending) to keep the oldest one
        movements.sort((a, b) => a.id - b.id);
        
        // Keep the first one, delete the rest
        const [keep, ...duplicates] = movements;
        
        console.log(`Keeping movement ID ${keep.id} for ${key}, removing ${duplicates.length} duplicates`);
        
        // Delete duplicates
        const duplicateIds = duplicates.map(d => d.id);
        const { error: deleteError } = await supabase
          .from('stock_movements')
          .delete()
          .in('id', duplicateIds);
        
        if (deleteError) {
          console.error(`Error deleting duplicate purchase movements for ${key}:`, deleteError);
          result.errors.push(`Failed to delete duplicates for ${key}: ${deleteError.message}`);
        } else {
          result.removed += duplicateIds.length;
        }
      } catch (error: any) {
        console.error(`Error processing duplicate purchase group ${key}:`, error);
        result.errors.push(`Error processing ${key}: ${error.message}`);
      }
    }
    
    // Invalidate cache since data has changed
    if (result.removed > 0) {
      invalidateReconciliationCache();
    }
    
    console.log(`Purchase cleanup complete. Removed ${result.removed} duplicate movements with ${result.errors.length} errors`);
    return result;
  } catch (error: any) {
    console.error('Error cleaning up duplicate purchase stock movements:', error);
    return {
      removed: 0,
      errors: [error.message || 'Unknown error']
    };
  }
} 