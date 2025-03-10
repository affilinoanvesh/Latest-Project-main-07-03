import { ProductExpiry } from '../../../types';
import { productExpiryService, productsService, productVariationsService } from '../../../services';
import { supabase } from '../../../services/supabase';

/**
 * Add a new product expiry record
 */
export async function addProductExpiry(expiry: Omit<ProductExpiry, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  try {
    // Check if there's already an expiry record with the same SKU and batch number
    if (expiry.batch_number) {
      // Use direct Supabase query since the method doesn't exist in the service
      const { data: existingRecords } = await supabase
        .from('product_expiry')
        .select('*')
        .eq('sku', expiry.sku)
        .eq('batch_number', expiry.batch_number);
      
      if (existingRecords && existingRecords.length > 0) {
        throw new Error(`An expiry record with batch number "${expiry.batch_number}" already exists for this product`);
      }
    }
    
    const result = await productExpiryService.add({
      ...expiry,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return result.id!;
  } catch (error) {
    console.error('Error adding product expiry:', error);
    throw error;
  }
}

/**
 * Update an existing product expiry record
 */
export async function updateProductExpiry(id: number, expiry: Partial<ProductExpiry>): Promise<number> {
  try {
    await productExpiryService.update(id, {
      ...expiry,
      updated_at: new Date()
    });
    
    return id;
  } catch (error) {
    console.error('Error updating product expiry:', error);
    throw error;
  }
}

/**
 * Delete a product expiry record
 */
export async function deleteProductExpiry(id: number): Promise<void> {
  try {
    await productExpiryService.delete(id);
  } catch (error) {
    console.error('Error deleting product expiry:', error);
    throw error;
  }
}

/**
 * Get all product expiry records
 */
export async function getAllProductExpiry(): Promise<ProductExpiry[]> {
  try {
    return await productExpiryService.getAll();
  } catch (error) {
    console.error('Error getting all product expiry records:', error);
    throw error;
  }
}

/**
 * Get product expiry records by SKU
 */
export async function getProductExpiryBySku(sku: string): Promise<ProductExpiry[]> {
  try {
    return await productExpiryService.getExpiryBySku(sku);
  } catch (error) {
    console.error('Error getting product expiry by SKU:', error);
    throw error;
  }
}

/**
 * Get products expiring within a certain number of days
 */
export async function getExpiringProducts(days: number = 90): Promise<ProductExpiry[]> {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    
    return await productExpiryService.getExpiryByDateRange(today, futureDate);
  } catch (error) {
    console.error('Error getting expiring products:', error);
    throw error;
  }
}

/**
 * Add multiple product expiry records
 */
export async function addBulkProductExpiry(expiryData: Array<Omit<ProductExpiry, 'id' | 'created_at' | 'updated_at'>>): Promise<number[]> {
  try {
    const results: number[] = [];
    
    // Process each expiry record individually to handle duplicates
    for (const expiry of expiryData) {
      try {
        // Check for existing records with the same SKU and batch number
        if (expiry.batch_number) {
          // Use direct Supabase query since the method doesn't exist in the service
          const { data: existingRecords } = await supabase
            .from('product_expiry')
            .select('*')
            .eq('sku', expiry.sku)
            .eq('batch_number', expiry.batch_number);
          
          if (existingRecords && existingRecords.length > 0) {
            console.warn(`Skipping duplicate expiry record for SKU ${expiry.sku} with batch ${expiry.batch_number}`);
            continue;
          }
        }
        
        // Try to find product information if not provided
        if (!expiry.product_id || expiry.product_id === 0) {
          const product = await productsService.getProductBySku(expiry.sku);
          
          if (product) {
            expiry.product_id = product.id;
            if (!expiry.product_name) {
              expiry.product_name = product.name;
            }
          } else {
            // Check if it's a variation
            const variation = await productVariationsService.getVariationBySku(expiry.sku);
            if (variation) {
              expiry.product_id = variation.parent_id;
              expiry.variation_id = variation.id;
              
              // Get the parent product name if product name not provided
              if (!expiry.product_name) {
                const parentProduct = await productsService.getById(variation.parent_id);
                if (parentProduct) {
                  expiry.product_name = `${parentProduct.name} - ${variation.name}`;
                }
              }
            }
          }
        }
        
        // Add the expiry record
        const result = await productExpiryService.add({
          ...expiry,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        if (result && result.id) {
          results.push(result.id);
        }
      } catch (error: any) {
        console.error(`Error adding expiry record for SKU ${expiry.sku}:`, error);
        // Continue with other records even if one fails
      }
    }
    
    return results;
  } catch (error: any) {
    console.error('Error adding bulk product expiry:', error);
    throw error;
  }
}

/**
 * Get product expiry records with product details
 */
export async function getProductExpiryWithDetails(): Promise<ProductExpiry[]> {
  try {
    // Get all expiry records directly from Supabase to avoid caching issues
    const { data: expiryRecords, error } = await supabase
      .from('product_expiry')
      .select('*');
    
    if (error) {
      console.error('Error fetching expiry records:', error);
      throw error;
    }
    
    console.log(`Retrieved ${expiryRecords?.length || 0} expiry records`);
    
    // Get all products and variations for enrichment
    const products = await productsService.getAll();
    const variations = await productVariationsService.getAll();
    
    // Create maps for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]));
    const variationMap = new Map(variations.map(v => [v.id, v]));
    
    // Enrich expiry records with product details
    return expiryRecords.map(record => {
      let productName = record.product_name || 'Unknown Product';
      let stockQuantity = record.stock_quantity || 0;
      
      if (record.variation_id) {
        // This is a variation
        const variation = variationMap.get(record.variation_id);
        const product = variation ? productMap.get(variation.parent_id) : null;
        
        if (variation && product) {
          productName = `${product.name} (${variation.attributes?.map(a => a.option).join(', ') || ''})`;
          stockQuantity = variation.stock_quantity || 0;
        }
      } else if (record.product_id) {
        // This is a simple product
        const product = productMap.get(record.product_id);
        
        if (product) {
          productName = product.name;
          stockQuantity = product.stock_quantity || 0;
        }
      }
      
      return {
        ...record,
        product_name: productName,
        stock_quantity: stockQuantity
      };
    });
  } catch (error) {
    console.error('Error getting product expiry with details:', error);
    throw error;
  }
}

/**
 * Get product expiry records sorted by expiry date
 */
export async function getProductExpiryByExpiryDate(ascending: boolean = true, timestamp?: number): Promise<ProductExpiry[]> {
  try {
    // Get all expiry records with details
    const records = await getProductExpiryWithDetails();
    
    // Sort by expiry date
    return records.sort((a, b) => {
      const dateA = new Date(a.expiry_date).getTime();
      const dateB = new Date(b.expiry_date).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  } catch (error) {
    console.error('Error getting product expiry by expiry date:', error);
    throw error;
  }
}

/**
 * Get all batch numbers for a specific SKU
 */
export async function getBatchNumbersBySku(sku: string): Promise<string[]> {
  try {
    const expiryRecords = await productExpiryService.getExpiryBySku(sku);
    
    // Extract unique batch numbers
    const batchNumbers = expiryRecords
      .filter(record => record.batch_number)
      .map(record => record.batch_number!)
      .filter((value, index, self) => self.indexOf(value) === index);
    
    return batchNumbers;
  } catch (error) {
    console.error('Error getting batch numbers by SKU:', error);
    throw error;
  }
}

/**
 * Get total quantity for a specific SKU across all batches
 */
export async function getTotalQuantityBySku(sku: string): Promise<number> {
  try {
    const expiryRecords = await productExpiryService.getExpiryBySku(sku);
    
    // Sum up quantities
    return expiryRecords.reduce((total, record) => total + (record.quantity || 0), 0);
  } catch (error) {
    console.error('Error getting total quantity by SKU:', error);
    throw error;
  }
}

/**
 * Delete product expiry records by batch number and SKU
 * This is used when deleting purchase orders to clean up associated expiry records
 */
export async function deleteProductExpiryByBatchAndSku(batchNumber: string, sku: string): Promise<void> {
  try {
    // Find all expiry records with the given batch number and SKU
    const expiryRecords = await productExpiryService.getExpiryByBatchAndSku(batchNumber, sku);
    
    // Delete each record
    for (const record of expiryRecords) {
      if (record.id) {
        await productExpiryService.delete(record.id);
      }
    }
  } catch (error) {
    console.error('Error deleting product expiry by batch and SKU:', error);
    throw error;
  }
}

/**
 * Archive a product expiry record
 * This is a no-op since the archived column doesn't exist in the database
 */
export async function archiveProductExpiry(id: number): Promise<void> {
  console.log('Archive functionality is not available - archived column does not exist in the database');
  // No-op
}

/**
 * Unarchive a product expiry record
 * This is a no-op since the archived column doesn't exist in the database
 */
export async function unarchiveProductExpiry(id: number): Promise<void> {
  console.log('Unarchive functionality is not available - archived column does not exist in the database');
  // No-op
}

/**
 * Get archived product expiry records
 * This returns all records since the archived column doesn't exist in the database
 */
export async function getArchivedProductExpiry(): Promise<ProductExpiry[]> {
  try {
    // Get all expiry records directly from Supabase
    const { data: expiryRecords, error } = await supabase
      .from('product_expiry')
      .select('*');
    
    if (error) {
      console.error('Error fetching expiry records:', error);
      throw error;
    }
    
    return expiryRecords as ProductExpiry[];
  } catch (error) {
    console.error('Error getting product expiry:', error);
    throw error;
  }
}

/**
 * Auto-archive expiry records for products with zero stock
 * This is a no-op since the archived column doesn't exist in the database
 */
export async function autoArchiveExpiryForZeroStock(sku: string): Promise<void> {
  console.log('Auto-archive functionality is not available - archived column does not exist in the database');
  // No-op
}

/**
 * Check if a product has any expiry records
 */
export async function hasUnarchivedExpiryRecords(sku: string): Promise<boolean> {
  try {
    // Get all expiry records for this SKU
    const { data: records, error } = await supabase
      .from('product_expiry')
      .select('*')
      .eq('sku', sku);
    
    if (error) {
      console.error('Error checking for expiry records:', error);
      throw error;
    }
    
    return records.length > 0;
  } catch (error) {
    console.error('Error checking for expiry records:', error);
    throw error;
  }
} 