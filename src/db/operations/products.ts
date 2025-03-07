import { db } from '../schema';
import { Product, ProductVariation } from '../../types';
import { updateLastSync } from './sync';
import { updateInventoryItem } from './inventory';

export async function saveProducts(products: Product[]): Promise<void> {
  try {
    await db.transaction('rw', db.products, async () => {
      await db.products.clear();
      await db.products.bulkAdd(products);
    });
    await updateLastSync('products');
  } catch (error) {
    console.error('Error saving products:', error);
    // Try to recreate the database if there's an error
    await db.recreateDatabase();
    throw error;
  }
}

export async function saveProductVariations(variations: ProductVariation[]): Promise<void> {
  try {
    await db.transaction('rw', db.productVariations, async () => {
      await db.productVariations.clear();
      await db.productVariations.bulkAdd(variations);
    });
    await updateLastSync('product_variations');
  } catch (error) {
    console.error('Error saving product variations:', error);
    throw error;
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    // Ensure the database is initialized before accessing
    await db.initializeDatabase();
    
    const products = await db.products.toArray();
    const variations = await db.productVariations.toArray();
    
    // Create a map of parent_id to variations for faster lookup
    const variationsByParentId = new Map<number, ProductVariation[]>();
    
    variations.forEach((variation: ProductVariation) => {
      if (!variationsByParentId.has(variation.parent_id)) {
        variationsByParentId.set(variation.parent_id, []);
      }
      variationsByParentId.get(variation.parent_id)?.push(variation);
    });
    
    // For each variable product, attach its variations
    for (const product of products) {
      if (product.type === 'variable') {
        // Get variations for this product
        const productVariations = variationsByParentId.get(product.id) || [];
        
        if (productVariations.length > 0) {
          console.log(`Found ${productVariations.length} variations for product ${product.name} (ID: ${product.id})`);
          product.productVariations = productVariations;
          
          // Also set the variations array if it doesn't exist
          if (!product.variations) {
            product.variations = productVariations.map(v => v.id);
          }
        } else {
          console.warn(`Variable product ${product.name} (ID: ${product.id}) has no variations in the database`);
          product.productVariations = [];
        }
      }
    }
    
    return products;
  } catch (error) {
    console.error('Error getting products:', error);
    // If there's an error, try to recreate the database
    await db.recreateDatabase();
    // Return an empty array to prevent further errors
    return [];
  }
}

export async function getProductVariations(): Promise<ProductVariation[]> {
  try {
    // Ensure the database is initialized before accessing
    await db.initializeDatabase();
    return await db.productVariations.toArray();
  } catch (error) {
    console.error('Error getting product variations:', error);
    return [];
  }
}

export async function updateProductCostPrice(productId: number, costPrice: number, variationId?: number): Promise<void> {
  try {
    // Ensure the database is initialized before updating
    await db.initializeDatabase();
    
    await db.transaction('rw', db.inventory, db.products, db.productVariations, async () => {
      if (variationId) {
        // Update variation cost price
        const variation = await db.productVariations.get(variationId);
        if (variation) {
          // Update the variation in productVariations table
          await db.productVariations.update(variationId, { cost_price: costPrice });
          
          // Update or create inventory item
          await updateInventoryItem({
            product_id: productId,
            variation_id: variationId,
            sku: variation.sku || '',
            cost_price: costPrice
          });
          
          // Store in localStorage as a backup
          localStorage.setItem(`variation_cost_${variationId}`, costPrice.toString());
        }
      } else {
        // Update product cost price
        const product = await db.products.get(productId);
        if (product) {
          // Update the product in products table
          await db.products.update(productId, { cost_price: costPrice });
          
          // Update or create inventory item
          await updateInventoryItem({
            product_id: productId,
            sku: product.sku || '',
            cost_price: costPrice
          });
          
          // Store in localStorage as a backup
          localStorage.setItem(`product_cost_${productId}`, costPrice.toString());
        }
      }
    });
  } catch (error) {
    console.error('Error updating product cost price:', error);
    throw error;
  }
}