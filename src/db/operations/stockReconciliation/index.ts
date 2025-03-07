import { supabase } from '../../../services/supabase';
import { 
  StockMovement, 
  StockReconciliation, 
  StockReconciliationSummary,
  MovementType
} from '../../../types';
import { productsService, productVariationsService } from '../../../services';

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
 * Get stock movements by SKU
 */
export async function getStockMovementsBySku(sku: string): Promise<StockMovement[]> {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('sku', sku)
      .order('movement_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting stock movements by SKU:', error);
    throw error;
  }
}

/**
 * Get stock movements by type
 */
export async function getStockMovementsByType(type: MovementType): Promise<StockMovement[]> {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('movement_type', type)
      .order('movement_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting stock movements by type:', error);
    throw error;
  }
}

/**
 * Get all stock movements
 */
export async function getAllStockMovements(): Promise<StockMovement[]> {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .order('movement_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting all stock movements:', error);
    throw error;
  }
}

/**
 * Add a stock reconciliation record
 */
export async function addStockReconciliation(reconciliation: Omit<StockReconciliation, 'id' | 'created_at'>): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('stock_reconciliation')
      .insert({
        ...reconciliation,
        created_at: new Date()
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error adding stock reconciliation:', error);
    throw error;
  }
}

/**
 * Get the latest stock reconciliation for a SKU
 */
export async function getLatestReconciliationBySku(sku: string): Promise<StockReconciliation | null> {
  try {
    const { data, error } = await supabase
      .from('stock_reconciliation')
      .select('*')
      .eq('sku', sku)
      .order('reconciliation_date', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows returned" error
    return data || null;
  } catch (error) {
    console.error('Error getting latest reconciliation by SKU:', error);
    throw error;
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
 * Get actual stock quantity for a SKU
 */
export async function getActualStock(sku: string): Promise<number> {
  try {
    console.log(`Getting actual stock for SKU: ${sku}`);
    
    // Use a single query to check both products and variations
    // This reduces the number of API calls
    const { data: variationData, error: variationError } = await supabase
      .from('product_variations')
      .select('stock_quantity')
      .eq('sku', sku)
      .maybeSingle();
    
    if (variationData) {
      console.log(`Found variation with SKU ${sku}, stock: ${variationData.stock_quantity || 0}`);
      return variationData.stock_quantity || 0;
    }
    
    if (variationError && variationError.code !== 'PGRST116') {
      console.error(`Error fetching variation by SKU ${sku}:`, variationError);
    }
    
    // If not found in variations, check products
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('sku', sku)
      .maybeSingle();
    
    if (productData) {
      console.log(`Found product with SKU ${sku}, stock: ${productData.stock_quantity || 0}`);
      return productData.stock_quantity || 0;
    }
    
    if (productError && productError.code !== 'PGRST116') {
      console.error(`Error fetching product by SKU ${sku}:`, productError);
    }
    
    console.log(`No product or variation found for SKU ${sku}, returning 0`);
    return 0;
  } catch (error) {
    console.error(`Error getting actual stock for SKU ${sku}:`, error);
    return 0; // Return 0 instead of throwing to prevent cascading errors
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
 * Get the timestamp of when the cache was last updated
 */
export function getLastCacheTime(): number {
  return lastCacheTime;
}

/**
 * Generate reconciliation summaries for all SKUs
 */
export async function generateAllReconciliationSummaries(forceRefresh = false): Promise<StockReconciliationSummary[]> {
  try {
    console.log('Generating all reconciliation summaries');
    
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
 * Invalidate the reconciliation cache
 */
export function invalidateReconciliationCache(): void {
  console.log('Invalidating reconciliation cache');
  reconciliationCache = null;
  lastCacheTime = 0;
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