import { Product, ProductVariation } from '../../types';
import { createWooCommerceClient } from './credentials';
import { productsService, productVariationsService } from '../../services';
import { updateLastSync } from './sync';
import { safeUpdateProgress, chunkArray, filterObjectToSchema, sanitizeJsonbFields } from './utils';
import { supabase } from '../../services/supabase';

// Extract cost price from product metadata or attributes
export const extractCostPrice = (product: any): number => {
  // Try to find cost price in meta data
  if (product.meta_data && Array.isArray(product.meta_data)) {
    // Check for cost price meta
    const costMeta = product.meta_data.find((meta: any) => 
      meta.key === '_wc_cog_cost' || 
      meta.key === 'cost_price' || 
      meta.key === '_cost_price'
    );
    
    if (costMeta && costMeta.value) {
      return parseFloat(costMeta.value);
    }
  }
  
  // Try to find cost price in attributes
  if (product.attributes && Array.isArray(product.attributes)) {
    const costAttr = product.attributes.find((attr: any) => 
      attr.name.toLowerCase() === 'cost' || 
      attr.name.toLowerCase() === 'cost price'
    );
    
    if (costAttr && costAttr.options && costAttr.options[0]) {
      return parseFloat(costAttr.options[0]);
    }
  }
  
  return 0;
};

// Format variation name
export const formatVariationName = (productName: string, attributes: Array<{name: string, option: string}>): string => {
  if (!attributes || attributes.length === 0) {
    return productName;
  }
  
  const attributeString = attributes
    .map(attr => `${attr.name}: ${attr.option}`)
    .join(', ');
  
  return `${productName} - ${attributeString}`;
};

// Fetch all products with pagination and optimized for large datasets
const fetchAllProducts = async (progressCallback?: (progress: number) => void): Promise<any[]> => {
  const client = await createWooCommerceClient();
  let allProducts: any[] = [];
  let page = 1;
  let totalPages = 1;
  const perPage = 100; // Maximum allowed by WooCommerce API
  
  try {
    // Get existing products to check for changes
    const existingProducts = await productsService.getAll();
    const existingProductIds = new Set(existingProducts.map(p => p.id));
    
    // Initial progress update
    safeUpdateProgress(progressCallback, 10);
    
    // First request to get total count
    const initialResponse = await client.get('/products', {
      params: {
        per_page: perPage,
        page: 1
      }
    });
    
    // Get total pages from response headers
    totalPages = parseInt(initialResponse.headers['x-wp-totalpages'] || '1', 10);
    const totalProducts = parseInt(initialResponse.headers['x-wp-total'] || '0', 10);
    
    console.log(`Found ${totalProducts} products across ${totalPages} pages`);
    
    // Add first page results
    allProducts = allProducts.concat(initialResponse.data);
    
    // Create an array of page numbers to fetch
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    
    // Process pages in chunks to avoid overwhelming the API
    const pageChunks = chunkArray(remainingPages, 5);
    
    for (let chunkIndex = 0; chunkIndex < pageChunks.length; chunkIndex++) {
      const chunk = pageChunks[chunkIndex];
      
      // Update progress based on chunks processed
      const chunkProgress = 10 + Math.floor((chunkIndex / pageChunks.length) * 60);
      safeUpdateProgress(progressCallback, Math.min(chunkProgress, 70));
      
      // Process each page in the current chunk sequentially to avoid rate limiting
      for (const pageNum of chunk) {
        try {
          const response = await client.get('/products', {
            params: {
              per_page: perPage,
              page: pageNum
            }
          });
          
          // Add products to our collection
          allProducts = allProducts.concat(response.data);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error fetching products page ${pageNum}:`, error);
          // Continue with next page even if one fails
        }
      }
    }
    
    // Log how many products were fetched
    console.log(`Fetched ${allProducts.length} products from API`);
    
    // Check how many are new
    const newProductCount = allProducts.filter(p => !existingProductIds.has(p.id)).length;
    console.log(`${newProductCount} new products found`);
    
    return allProducts;
  } catch (error) {
    console.error('Error fetching all products:', error);
    throw error;
  }
};

// Fetch all variations for a product with pagination
const fetchAllVariations = async (productId: number): Promise<any[]> => {
  const client = await createWooCommerceClient();
  let allVariations: any[] = [];
  let page = 1;
  let totalPages = 1;
  const perPage = 100; // Maximum allowed by WooCommerce API
  
  try {
    // First request to get total count
    const initialResponse = await client.get(`/products/${productId}/variations`, {
      params: {
        per_page: perPage,
        page: 1
      }
    });
    
    // Get total pages from response headers
    totalPages = parseInt(initialResponse.headers['x-wp-totalpages'] || '1', 10);
    
    // Add first page results
    allVariations = allVariations.concat(initialResponse.data);
    
    // Fetch remaining pages
    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      try {
        const response = await client.get(`/products/${productId}/variations`, {
          params: {
            per_page: perPage,
            page: pageNum
          }
        });
        
        allVariations = allVariations.concat(response.data);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error fetching variations page ${pageNum} for product ${productId}:`, error);
        // Continue with next page even if one fails
      }
    }
    
    return allVariations;
  } catch (error) {
    console.error(`Error fetching variations for product ${productId}:`, error);
    throw error;
  }
};

// Fetch products from WooCommerce API and store in database
export const syncProducts = async (progressCallback?: (progress: number) => void): Promise<Product[]> => {
  // Initial progress update
  safeUpdateProgress(progressCallback, 10);
  
  try {
    // Get existing products and variations
    const existingProducts = await productsService.getAll();
    const existingProductMap = new Map(existingProducts.map(p => [p.id, p]));
    
    // Fetch all products with pagination
    const rawProducts = await fetchAllProducts(progressCallback);
    
    // Process products
    const products = rawProducts.map((product: any) => {
      // Check if we already have this product
      const existingProduct = existingProductMap.get(product.id);
      
      // If we have an existing product, preserve its cost_price and supplier info
      if (existingProduct) {
        return {
          ...product,
          regular_price: parseFloat(product.regular_price || product.price || '0'),
          sale_price: product.sale_price ? parseFloat(product.sale_price) : undefined,
          cost_price: existingProduct.cost_price,
          supplier_price: existingProduct.supplier_price,
          supplier_name: existingProduct.supplier_name,
          supplier_updated: existingProduct.supplier_updated
        };
      }
      
      // Otherwise, create a new product
      return {
        ...product,
        regular_price: parseFloat(product.regular_price || product.price || '0'),
        sale_price: product.sale_price ? parseFloat(product.sale_price) : undefined,
        cost_price: extractCostPrice(product)
      };
    });
    
    // Process products to identify variable products
    const variableProducts = products.filter(product => product.type === 'variable');
    
    // Update progress
    safeUpdateProgress(progressCallback, 70);
    
    // Fetch variations for variable products
    const variations: ProductVariation[] = [];
    let variationCount = 0;
    const totalVariableProducts = variableProducts.length;
    
    // Process variable products in chunks to avoid overwhelming the API
    const productChunks = chunkArray(variableProducts, 5);
    
    for (let chunkIndex = 0; chunkIndex < productChunks.length; chunkIndex++) {
      const chunk = productChunks[chunkIndex];
      
      // Process each product in the current chunk
      for (const product of chunk) {
        if (product.variations && product.variations.length > 0) {
          // Fetch all variations with pagination
          const productVariationsRaw = await fetchAllVariations(product.id);
          
          const productVariations = productVariationsRaw.map((variation: any) => {
            // Extract attributes
            const attributes = variation.attributes.map((attr: any) => ({
              name: attr.name,
              option: attr.option
            }));
            
            // Create a formatted variation object
            return {
              id: variation.id,
              parent_id: product.id,
              name: formatVariationName(product.name, attributes),
              sku: variation.sku || '',
              price: parseFloat(variation.price || '0'),
              regular_price: parseFloat(variation.regular_price || variation.price || '0'),
              sale_price: variation.sale_price ? parseFloat(variation.sale_price) : undefined,
              stock_quantity: variation.stock_quantity || 0,
              attributes,
              cost_price: extractCostPrice(variation)
            };
          });
          
          variations.push(...productVariations);
        }
        
        // Update progress for variations
        variationCount++;
        if (totalVariableProducts > 0) {
          const variationProgress = 70 + Math.floor((variationCount / totalVariableProducts) * 20);
          safeUpdateProgress(progressCallback, Math.min(variationProgress, 90));
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Update progress
    safeUpdateProgress(progressCallback, 90);
    
    // Save products and variations to database
    await saveProductsToSupabase(products);
    await saveProductVariationsToSupabase(variations);
    await updateLastSync('products');
    
    // Final progress update
    safeUpdateProgress(progressCallback, 100);
    
    return products;
  } catch (error) {
    console.error('Error syncing products:', error);
    throw error;
  }
};

// Sanitize numeric fields to ensure empty strings are converted to null or 0
const sanitizeNumericFields = (obj: any): any => {
  const numericFields = [
    'price', 
    'regular_price', 
    'sale_price', 
    'cost_price', 
    'supplier_price', 
    'stock_quantity'
  ];
  
  const result = { ...obj };
  
  numericFields.forEach(field => {
    if (field in result) {
      // Convert empty strings to null
      if (result[field] === '') {
        result[field] = null;
      }
      // Convert string numbers to actual numbers
      else if (typeof result[field] === 'string' && !isNaN(Number(result[field]))) {
        result[field] = Number(result[field]);
      }
    }
  });
  
  return result;
};

// Save products to Supabase
const saveProductsToSupabase = async (products: Product[]): Promise<void> => {
  try {
    // Get existing products from the database
    const existingProducts = await productsService.getAll();
    const existingProductMap = new Map(existingProducts.map(p => [p.id, p]));
    
    // Define allowed fields based on database schema
    const allowedFields = [
      'id', 
      'name', 
      'sku', 
      'type', 
      'price',
      'regular_price',
      'sale_price',
      'cost_price',
      'supplier_price',
      'supplier_name',
      'supplier_updated',
      'stock_quantity',
      'created_at'
    ];
    
    // Fields that should be preserved from existing products if they exist
    const preserveFields = [
      'supplier_price',
      'supplier_name',
      'supplier_updated',
      'cost_price'
    ] as const;
    
    // Filter products to only include fields that exist in the database schema
    const filteredProducts = products.map(product => {
      // Sanitize numeric fields first
      const sanitizedProduct = sanitizeNumericFields(product);
      
      // Get the existing product if it exists
      const existingProduct = existingProductMap.get(product.id);
      
      // If we have an existing product, preserve specified fields
      if (existingProduct) {
        preserveFields.forEach(field => {
          if (existingProduct[field] !== undefined && existingProduct[field] !== null) {
            // Type assertion to handle the index signature issue
            (sanitizedProduct as any)[field] = existingProduct[field];
          }
        });
      }
      
      // Ensure required fields are present
      const filtered = filterObjectToSchema(sanitizedProduct, allowedFields);
      
      // Make sure required fields are present
      if (!filtered.name) {
        filtered.name = product.name; // Ensure name is always included
      }
      
      return filtered as Omit<Product, 'id'>;
    });
    
    // Find products to delete (products in DB that are not in the new list)
    const newProductIds = new Set(products.map(p => p.id));
    const productsToDelete = existingProducts
      .filter(p => !newProductIds.has(p.id))
      .map(p => p.id);
    
    // Delete products that no longer exist
    if (productsToDelete.length > 0) {
      console.log(`Deleting ${productsToDelete.length} products that no longer exist`);
      for (const batch of chunkArray(productsToDelete, 100)) {
        await supabase.from('products').delete().in('id', batch);
      }
    }
    
    // Upsert products (update existing, insert new)
    console.log(`Upserting ${filteredProducts.length} products`);
    for (const batch of chunkArray(filteredProducts, 100)) {
      await supabase
        .from('products')
        .upsert(batch, { onConflict: 'id' });
    }
    
    console.log(`Successfully saved ${filteredProducts.length} products to Supabase`);
  } catch (error) {
    console.error('Error saving products to Supabase:', error);
    throw error;
  }
};

// Save product variations to Supabase
const saveProductVariationsToSupabase = async (variations: ProductVariation[]): Promise<void> => {
  try {
    // Get existing variations from the database
    const existingVariations = await productVariationsService.getAll();
    const existingVariationMap = new Map(existingVariations.map(v => [v.id, v]));
    
    // Define allowed fields based on database schema
    const allowedFields = [
      'id', 
      'parent_id', 
      'name',
      'sku', 
      'price',
      'regular_price',
      'sale_price',
      'cost_price',
      'supplier_price',
      'supplier_name',
      'supplier_updated',
      'stock_quantity',
      'attributes',
      'created_at'
    ];
    
    // Fields that should be preserved from existing variations if they exist
    const preserveFields = [
      'supplier_price',
      'supplier_name',
      'supplier_updated',
      'cost_price'
    ] as const;
    
    // Filter variations to only include fields that exist in the database schema
    const filteredVariations = variations.map(variation => {
      // Sanitize numeric fields first
      const sanitizedVariation = sanitizeNumericFields(variation);
      
      // Sanitize JSONB fields
      const jsonbSanitizedVariation = sanitizeJsonbFields(sanitizedVariation, ['attributes']);
      
      // Get the existing variation if it exists
      const existingVariation = existingVariationMap.get(variation.id);
      
      // If we have an existing variation, preserve specified fields
      if (existingVariation) {
        preserveFields.forEach(field => {
          if (existingVariation[field] !== undefined && existingVariation[field] !== null) {
            // Type assertion to handle the index signature issue
            (jsonbSanitizedVariation as any)[field] = existingVariation[field];
          }
        });
      }
      
      // Ensure required fields are present
      const filtered = filterObjectToSchema(jsonbSanitizedVariation, allowedFields);
      
      // Make sure required fields are present
      if (!filtered.parent_id) {
        filtered.parent_id = variation.parent_id; // Ensure parent_id is always included
      }
      
      return filtered as Omit<ProductVariation, 'id'>;
    });
    
    // Find variations to delete (variations in DB that are not in the new list)
    const newVariationIds = new Set(variations.map(v => v.id));
    const variationsToDelete = existingVariations
      .filter(v => !newVariationIds.has(v.id))
      .map(v => v.id);
    
    // Delete variations that no longer exist
    if (variationsToDelete.length > 0) {
      console.log(`Deleting ${variationsToDelete.length} variations that no longer exist`);
      for (const batch of chunkArray(variationsToDelete, 100)) {
        await supabase.from('product_variations').delete().in('id', batch);
      }
    }
    
    // Upsert variations (update existing, insert new)
    console.log(`Upserting ${filteredVariations.length} variations`);
    for (const batch of chunkArray(filteredVariations, 100)) {
      await supabase
        .from('product_variations')
        .upsert(batch, { onConflict: 'id' });
    }
    
    console.log(`Successfully saved ${filteredVariations.length} variations to Supabase`);
  } catch (error) {
    console.error('Error saving product variations to Supabase:', error);
    throw error;
  }
};

// Fetch products from Supabase
export const fetchProducts = async (): Promise<Product[]> => {
  try {
    return await productsService.getAll();
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};