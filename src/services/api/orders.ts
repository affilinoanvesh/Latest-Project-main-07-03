import { Order } from '../../types';
import { createWooCommerceClient } from './credentials';
import { ordersService, productsService, productVariationsService } from '../../services';
import { supabase } from '../../services/supabase';
import { updateLastSync } from './sync';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, addDays } from 'date-fns';
import { 
  safeUpdateProgress, 
  formatDateForAPI, 
  chunkArray, 
  convertToNZTimezone,
  processBatches,
  filterObjectToSchema,
  sanitizeJsonbFields
} from './utils';

// Process orders to include variation information
export const processOrdersWithVariations = async (orders: any[]): Promise<Order[]> => {
  // Get all products and variations
  const products = await productsService.getAll();
  const variations = await productVariationsService.getAll();
  
  // Create lookup maps
  const productMap = new Map(products.map(p => [p.id, p]));
  const variationMap = new Map(variations.map(v => [v.id, v]));
  
  return orders.map(order => {
    // Process line items to include SKUs and variation information
    const lineItems = order.line_items.map((item: any) => {
      let sku = '';
      let costPrice = 0;
      
      // Check if this is a variation
      if (item.variation_id) {
        const variation = variationMap.get(item.variation_id);
        if (variation) {
          sku = variation.sku || '';
          costPrice = variation.cost_price || 0;
        }
      } else {
        // This is a simple product
        const product = productMap.get(item.product_id);
        if (product) {
          sku = product.sku || '';
          costPrice = product.cost_price || 0;
        }
      }
      
      return {
        ...item,
        sku,
        cost_price: costPrice
      };
    });
    
    // Convert dates to NZ timezone
    const dateCreated = order.date_created ? convertToNZTimezone(order.date_created) : null;
    const dateCompleted = order.date_completed ? convertToNZTimezone(order.date_completed) : null;
    
    return {
      ...order,
      line_items: lineItems,
      date_created: dateCreated,
      date_completed: dateCompleted
    };
  });
};

// Fetch all orders with pagination and optimized for large datasets
const fetchAllOrders = async (startDate?: string, endDate?: string, progressCallback?: (progress: number) => void): Promise<any[]> => {
  const client = await createWooCommerceClient();
  let allOrders: any[] = [];
  
  // Calculate date range for fetching orders
  // Default to last 90 days if not specified
  if (!startDate) {
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 90); // Last 90 days
    startDate = formatDateForAPI(defaultStartDate);
  }
  
  if (!endDate) {
    endDate = formatDateForAPI(new Date());
  }
  
  // Check if this is a December date range
  const isDecemberRange = startDate.includes('-12-') || endDate.includes('-12-') || 
                          startDate.includes('-11-30') || endDate.includes('-01-');
  
  try {
    // Initial progress update
    safeUpdateProgress(progressCallback, 20);
    
    if (isDecemberRange) {
      console.log(`December date range detected - Special handling enabled for: ${startDate} to ${endDate}`);
    }
    
    console.log(`Fetching orders from ${startDate} to ${endDate}`);
    
    // First request to get total count
    const initialResponse = await client.get('/orders', {
      params: {
        per_page: 100, // Max allowed per page
        after: startDate,
        before: endDate,
        page: 1
      }
    });
    
    // Get total pages from response headers
    const totalPages = parseInt(initialResponse.headers['x-wp-totalpages'] || '1', 10);
    const totalOrders = parseInt(initialResponse.headers['x-wp-total'] || '0', 10);
    
    if (isDecemberRange) {
      console.log(`December range: Found ${totalOrders} orders across ${totalPages} pages for date range ${startDate} to ${endDate}`);
      
      // Log the first few orders to help with debugging
      if (initialResponse.data.length > 0) {
        console.log(`First order date: ${initialResponse.data[0].date_created}`);
        console.log(`Last order date: ${initialResponse.data[initialResponse.data.length - 1].date_created}`);
      } else {
        console.log(`No orders found in the first page for December range`);
      }
    } else {
      console.log(`Found ${totalOrders} orders across ${totalPages} pages for date range ${startDate} to ${endDate}`);
    }
    
    // Add first page results
    allOrders = allOrders.concat(initialResponse.data);
    
    // Create an array of page numbers to fetch
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    
    // Process pages in batches to avoid overwhelming the API
    if (remainingPages.length > 0) {
      // Define a function to process a batch of pages
      const processPageBatch = async (pagesBatch: number[]): Promise<any[]> => {
        const batchResults: any[] = [];
        
        for (const pageNum of pagesBatch) {
          try {
            const response = await client.get('/orders', {
              params: {
                per_page: 100,
                after: startDate,
                before: endDate,
                page: pageNum
              }
            });
            
            // Add orders to our collection
            batchResults.push(...response.data);
          } catch (error) {
            console.error(`Error fetching orders page ${pageNum}:`, error);
            // Continue with next page even if one fails
          }
        }
        
        return batchResults;
      };
      
      // Process all pages in batches with delays between batches
      const batchResults = await processBatches(
        remainingPages,
        processPageBatch,
        3, // Process 3 pages at a time
        300, // 300ms delay between batches
        (progress) => {
          // Map batch progress to 20-70% of overall progress
          const mappedProgress = 20 + Math.floor((progress * 0.5));
          safeUpdateProgress(progressCallback, mappedProgress);
        }
      );
      
      // Add all batch results to our orders collection
      allOrders = [...allOrders, ...batchResults.flat()];
    }
    
    // Convert dates to NZ timezone
    allOrders = allOrders.map(order => {
      const dateCreated = order.date_created ? createSafeDate(order.date_created) : null;
      let dateCreatedNZ = '';
      let dateCreatedDisplay = 'N/A';
      
      if (isValidDate(dateCreated)) {
        const tzDate = convertToNZTimezone(dateCreated);
        if (tzDate) {
          dateCreatedNZ = tzDate.toISOString();
          dateCreatedDisplay = format(tzDate, 'dd/MM/yyyy h:mm a');
        }
      }
      
      return {
        ...order,
        date_created_nz: dateCreatedNZ,
        date_created_display: dateCreatedDisplay
      };
    });
    
    return allOrders;
  } catch (error) {
    console.error('Error fetching all orders:', error);
    throw error;
  }
};

// Fetch orders from WooCommerce API and store in database
export const syncOrders = async (startDate?: string, endDate?: string, progressCallback?: (progress: number) => void): Promise<Order[]> => {
  try {
    // Fetch all orders with pagination
    const orders = await fetchAllOrders(startDate, endDate, progressCallback);
    
    // Update progress
    safeUpdateProgress(progressCallback, 70);
    
    // Process orders in batches to avoid memory issues
    const processOrderBatch = async (ordersBatch: any[]): Promise<Order[]> => {
      return await processOrdersWithVariations(ordersBatch);
    };
    
    // Process all orders in batches
    const processedOrders = await processBatches(
      orders,
      processOrderBatch,
      50, // Process 50 orders at a time
      10, // 10ms delay between batches
      (progress) => {
        // Map batch progress to 70-90% of overall progress
        const mappedProgress = 70 + Math.floor((progress * 0.2));
        safeUpdateProgress(progressCallback, mappedProgress);
      }
    );
    
    // Get existing orders
    const existingOrders = await ordersService.getAll();
    const existingOrderIds = new Set(existingOrders.map(order => order.id));
    
    // Filter out orders that already exist in the database
    const newOrders = processedOrders.filter(order => !existingOrderIds.has(order.id));
    
    // Merge new orders with existing orders
    const mergedOrders = [...existingOrders, ...newOrders];
    
    // Save merged orders to database
    await saveOrdersToSupabase(mergedOrders);
    await updateLastSync('orders');
    
    // Final progress update
    safeUpdateProgress(progressCallback, 100);
    
    return mergedOrders;
  } catch (error) {
    console.error('Error syncing orders:', error);
    throw error;
  }
};

// Sync orders for a specific month
export const syncOrdersByMonth = async (
  monthStart: Date, 
  monthEnd: Date, 
  progressCallback?: (progress: number) => void
): Promise<Order[]> => {
  // Initial progress update
  safeUpdateProgress(progressCallback, 10);
  
  try {
    // For December, we need to ensure we include the entire month
    // Add four days to the end date to ensure we include orders from the last day
    // This accounts for timezone differences that might cause December 31st orders to be missed
    const adjustedMonthEnd = new Date(monthEnd);
    const isDecember = monthEnd.getMonth() === 11; // December is month 11 (0-indexed)
    
    if (isDecember) {
      // For December, add 4 days to ensure we capture all orders across the year boundary
      adjustedMonthEnd.setDate(adjustedMonthEnd.getDate() + 4);
      console.log(`December detected - Adjusting end date to: ${adjustedMonthEnd.toISOString()}`);
    } else {
      // For other months, add one day to ensure we capture all orders
      adjustedMonthEnd.setDate(adjustedMonthEnd.getDate() + 1);
    }
    
    // Format dates for API
    const startDateStr = formatDateForAPI(monthStart);
    const endDateStr = formatDateForAPI(adjustedMonthEnd);
    
    console.log(`Syncing month: ${format(monthStart, 'MMMM yyyy')} (${startDateStr} to ${endDateStr})`);
    
    // Get existing orders for this month
    const existingOrders = await ordersService.getAll();
    const monthOrders = existingOrders.filter(order => {
      const orderDate = order.date_created ? createSafeDate(order.date_created) : null;
      return isValidDate(orderDate) && orderDate >= monthStart && orderDate <= monthEnd;
    });
    
    // For December, always force a sync regardless of existing data
    if (isDecember) {
      console.log(`December month detected - Forcing sync for the entire month regardless of existing data (${monthOrders.length} existing orders).`);
    }
    // Check if we already have orders for this month and it's not December
    else if (monthOrders.length > 0) {
      console.log(`Already have ${monthOrders.length} orders for ${format(monthStart, 'MMMM yyyy')}`);
      
      // Update progress
      safeUpdateProgress(progressCallback, 100);
      return monthOrders;
    }
    
    // Use the syncOrders function with the specified date range
    console.log(`Syncing orders for ${format(monthStart, 'MMMM yyyy')}`);
    return await syncOrders(startDateStr, endDateStr, (progress) => {
      // Map progress to 10-100% range
      const adjustedProgress = 10 + Math.floor((progress * 0.9));
      safeUpdateProgress(progressCallback, adjustedProgress);
    });
  } catch (error) {
    console.error(`Error syncing orders for month ${format(monthStart, 'MMMM yyyy')}:`, error);
    throw error;
  }
};

// Sync orders for a specific year
export const syncOrdersByYear = async (startDate: string, endDate: string, progressCallback?: (progress: number) => void): Promise<Order[]> => {
  // Initial progress update
  safeUpdateProgress(progressCallback, 10);
  
  try {
    // Parse dates
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    // Get all months in the year
    const months = eachMonthOfInterval({
      start: startOfMonth(start),
      end: endOfMonth(end)
    });
    
    console.log(`Syncing ${months.length} months from ${format(start, 'MMMM yyyy')} to ${format(end, 'MMMM yyyy')}`);
    
    // Define a function to process a month
    const processMonth = async (month: Date): Promise<Order[]> => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      console.log(`Processing month: ${format(month, 'MMMM yyyy')}`);
      
      // Sync orders for this month
      return await syncOrdersByMonth(
        monthStart,
        monthEnd,
        // We don't pass the progress callback here to avoid nested progress updates
        // that could cause Symbol cloning errors
      );
    };
    
    // Process all months in batches with delays between batches
    const allOrders = await processBatches(
      months,
      async (monthsBatch) => {
        const batchResults: Order[] = [];
        
        for (const month of monthsBatch) {
          const monthOrders = await processMonth(month);
          batchResults.push(...monthOrders);
        }
        
        return batchResults;
      },
      1, // Process 1 month at a time
      500, // 500ms delay between months
      (progress) => {
        // Map batch progress to 10-90% of overall progress
        const mappedProgress = 10 + Math.floor((progress * 0.8));
        safeUpdateProgress(progressCallback, mappedProgress);
      }
    );
    
    // Final progress update
    safeUpdateProgress(progressCallback, 100);
    
    return allOrders;
  } catch (error) {
    console.error('Error syncing orders by year:', error);
    throw error;
  }
};

// Helper function to create December date range
const createDecemberDateRange = (year: number, extraDays: number = 5): { startDate: string, endDate: string } => {
  // Create date range for December of the specified year
  const decemberStart = new Date(year, 11, 1); // December 1st
  const decemberEnd = new Date(year, 11, 31, 23, 59, 59); // December 31st 23:59:59
  
  // Add extra days to ensure we capture all orders
  const adjustedDecemberEnd = new Date(decemberEnd);
  if (extraDays > 0) {
    adjustedDecemberEnd.setDate(adjustedDecemberEnd.getDate() + extraDays);
  }
  
  // Format dates for API
  const startDateStr = formatDateForAPI(decemberStart);
  const endDateStr = formatDateForAPI(adjustedDecemberEnd);
  
  return { startDate: startDateStr, endDate: endDateStr };
};

// Generic function to fetch orders by date range with different strategies
const fetchOrdersByDateRange = async (
  options: {
    startDate: string,
    endDate: string,
    strategy: 'regular' | 'direct' | 'chunked',
    chunkSize?: number,
    progressCallback?: (progress: number) => void,
    progressStart?: number,
    progressEnd?: number
  }
): Promise<Order[]> => {
  const { 
    startDate, 
    endDate, 
    strategy, 
    chunkSize = 5, 
    progressCallback,
    progressStart = 0,
    progressEnd = 100
  } = options;
  
  // Calculate progress range
  const progressRange = progressEnd - progressStart;
  
  // Helper to map progress within our range
  const mapProgress = (progress: number) => {
    return progressStart + Math.floor(progress * progressRange / 100);
  };
  
  // Update initial progress
  safeUpdateProgress(progressCallback, mapProgress(5));
  
  try {
    console.log(`Fetching orders from ${startDate} to ${endDate} using ${strategy} strategy`);
    
    // Different strategies for fetching orders
    switch (strategy) {
      case 'regular':
        // Use the standard syncOrders function
        return await syncOrders(startDate, endDate, (progress) => {
          safeUpdateProgress(progressCallback, mapProgress(5 + progress * 0.95));
        });
        
      case 'direct':
        // Directly fetch all orders from the API
        const allOrders = await fetchAllOrders(startDate, endDate, (progress) => {
          safeUpdateProgress(progressCallback, mapProgress(5 + progress * 0.7));
        });
        
        // Process the orders
        safeUpdateProgress(progressCallback, mapProgress(75));
        const processedOrders = await processOrdersWithVariations(allOrders);
        
        // Get existing orders
        const existingOrders = await ordersService.getAll();
        
        // Filter out orders that already exist in the database
        const existingOrderIds = new Set(existingOrders.map(order => order.id));
        const newOrders = processedOrders.filter(order => !existingOrderIds.has(order.id));
        
        console.log(`Found ${newOrders.length} new orders to add to database`);
        
        // Save merged orders to database
        safeUpdateProgress(progressCallback, mapProgress(85));
        await saveOrdersToSupabase(newOrders);
        
        safeUpdateProgress(progressCallback, mapProgress(100));
        return newOrders;
        
      case 'chunked':
        // Parse dates
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        // Break date range into smaller chunks
        const dateChunks: { start: Date; end: Date }[] = [];
        let currentStart = new Date(startDateObj);
        
        while (currentStart < endDateObj) {
          // Calculate chunk end date
          const chunkEnd = new Date(currentStart);
          chunkEnd.setDate(chunkEnd.getDate() + (chunkSize - 1)); // e.g., 5-day chunks (inclusive)
          
          // Ensure we don't go beyond the end date
          const actualEnd = chunkEnd > endDateObj ? endDateObj : chunkEnd;
          
          // Add the chunk to our list
          dateChunks.push({
            start: new Date(currentStart),
            end: new Date(actualEnd)
          });
          
          // Move to next chunk
          currentStart = new Date(actualEnd);
          currentStart.setDate(currentStart.getDate() + 1);
        }
        
        console.log(`Split date range into ${dateChunks.length} chunks of ${chunkSize} days each`);
        
        // Process each chunk
        let allChunkOrders: Order[] = [];
        let processedChunks = 0;
        
        for (const chunk of dateChunks) {
          const chunkStartStr = formatDateForAPI(chunk.start);
          const chunkEndStr = formatDateForAPI(chunk.end);
          
          console.log(`Processing chunk ${processedChunks + 1}/${dateChunks.length}: ${chunk.start.toDateString()} to ${chunk.end.toDateString()}`);
          
          try {
            // Calculate progress for this chunk
            const chunkProgressStart = 5 + (processedChunks / dateChunks.length) * 90;
            const chunkProgressEnd = 5 + ((processedChunks + 1) / dateChunks.length) * 90;
            
            // Fetch orders for this chunk using direct method
            const chunkOrders = await fetchOrdersByDateRange({
              startDate: chunkStartStr,
              endDate: chunkEndStr,
              strategy: 'direct',
              progressCallback: (progress) => {
                const adjustedProgress = chunkProgressStart + (progress * (chunkProgressEnd - chunkProgressStart) / 100);
                safeUpdateProgress(progressCallback, mapProgress(adjustedProgress));
              },
              progressStart: 0,
              progressEnd: 100
            });
            
            // Add to our collection
            allChunkOrders = [...allChunkOrders, ...chunkOrders];
            
          } catch (error) {
            console.error(`Error processing chunk ${processedChunks + 1}/${dateChunks.length}:`, error);
            console.log('Continuing with next chunk...');
          }
          
          processedChunks++;
          safeUpdateProgress(progressCallback, mapProgress(5 + (processedChunks / dateChunks.length) * 90));
        }
        
        safeUpdateProgress(progressCallback, mapProgress(95));
        console.log(`Completed processing ${processedChunks} chunks, found ${allChunkOrders.length} orders total`);
        
        safeUpdateProgress(progressCallback, mapProgress(100));
        return allChunkOrders;
        
      default:
        throw new Error(`Unknown fetch strategy: ${strategy}`);
    }
  } catch (error) {
    console.error(`Error fetching orders with ${strategy} strategy:`, error);
    throw error;
  }
};

// Simplified December-specific functions that use the generic function
export const forceDecemberSync = async (
  year: number = new Date().getFullYear(),
  progressCallback?: (progress: number) => void
): Promise<Order[]> => {
  try {
    console.log(`Force syncing December data for year ${year}`);
    
    // Create date range for December
    const { startDate, endDate } = createDecemberDateRange(year);
    
    console.log(`December force sync: ${startDate} to ${endDate}`);
    
    // Use the regular sync strategy
    return await fetchOrdersByDateRange({
      startDate,
      endDate,
      strategy: 'regular',
      progressCallback
    });
  } catch (error) {
    console.error(`Error force syncing December data for year ${year}:`, error);
    throw error;
  }
};

// Directly fetch December orders from the API without using existing sync mechanisms
export const fetchDecemberOrdersDirectly = async (
  year: number = new Date().getFullYear(),
  progressCallback?: (progress: number) => void
): Promise<Order[]> => {
  try {
    console.log(`Direct fetch of December ${year} data started`);
    
    // Create date range for December
    const { startDate, endDate } = createDecemberDateRange(year);
    
    console.log(`December direct fetch: ${startDate} to ${endDate}`);
    
    // Use the direct fetch strategy
    return await fetchOrdersByDateRange({
      startDate,
      endDate,
      strategy: 'direct',
      progressCallback
    });
  } catch (error) {
    console.error(`Error directly fetching December data for year ${year}:`, error);
    throw error;
  }
};

// Fetch December orders in smaller date chunks to avoid network timeouts
export const fetchDecemberOrdersInChunks = async (
  year: number = new Date().getFullYear(),
  progressCallback?: (progress: number) => void
): Promise<Order[]> => {
  try {
    console.log(`Fetching December ${year} data in smaller chunks to avoid network timeouts`);
    
    // Create date range for December
    const { startDate, endDate } = createDecemberDateRange(year);
    
    console.log(`December chunked fetch: ${startDate} to ${endDate}`);
    
    // Use the chunked fetch strategy
    return await fetchOrdersByDateRange({
      startDate,
      endDate,
      strategy: 'chunked',
      chunkSize: 5, // 5-day chunks
      progressCallback
    });
  } catch (error) {
    console.error(`Error fetching December data in chunks for year ${year}:`, error);
    throw error;
  }
};

// Delete an order from the database
export const deleteOrder = async (orderId: number): Promise<void> => {
  try {
    // Get all orders
    const orders = await ordersService.getAll();
    
    // Filter out the order to delete
    const updatedOrders = orders.filter(order => order.id !== orderId);
    
    // Save the updated orders list
    await saveOrdersToSupabase(updatedOrders);
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

// Fetch orders from Supabase
export const fetchOrders = async (): Promise<Order[]> => {
  try {
    return await ordersService.getAll();
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

// Check if there are any December orders in the database for a specific year
export const hasDecemberOrders = async (year: number): Promise<boolean> => {
  try {
    // Get all orders
    const orders = await ordersService.getAll();
    
    // Filter for December orders of the specified year
    const decemberOrders = orders.filter(order => {
      const orderDate = order.date_created ? createSafeDate(order.date_created) : null;
      return isValidDate(orderDate) && orderDate.getFullYear() === year && orderDate.getMonth() === 11;
    });
    
    console.log(`Found ${decemberOrders.length} December ${year} orders in database`);
    
    return decemberOrders.length > 0;
  } catch (error) {
    console.error(`Error checking for December ${year} orders:`, error);
    return false;
  }
};

// Sync orders for a custom date range
export const syncOrdersByDateRange = async (startDate: string, endDate: string, progressCallback?: (progress: number) => void): Promise<Order[]> => {
  try {
    console.log(`Syncing orders for date range: ${startDate} to ${endDate}`);
    
    // Use the generic fetch function with regular strategy
    return await fetchOrdersByDateRange({
      startDate,
      endDate,
      strategy: 'regular',
      progressCallback
    });
  } catch (error) {
    console.error('Error syncing orders by date range:', error);
    throw error;
  }
};

// Sanitize numeric fields to ensure empty strings are converted to null or 0
const sanitizeNumericFields = (obj: any): any => {
  const numericFields = [
    'total',
    'subtotal',
    'total_tax',
    'shipping_total',
    'discount_total',
    'customer_id'
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
  
  // Also sanitize line items if they exist
  if (result.line_items && Array.isArray(result.line_items)) {
    result.line_items = result.line_items.map((item: any) => {
      const itemNumericFields = ['price', 'quantity', 'total', 'cost_price', 'profit', 'margin'];
      
      const sanitizedItem = { ...item };
      
      itemNumericFields.forEach(field => {
        if (field in sanitizedItem) {
          // Convert empty strings to null
          if (sanitizedItem[field] === '') {
            sanitizedItem[field] = null;
          }
          // Convert string numbers to actual numbers
          else if (typeof sanitizedItem[field] === 'string' && !isNaN(Number(sanitizedItem[field]))) {
            sanitizedItem[field] = Number(sanitizedItem[field]);
          }
        }
      });
      
      return sanitizedItem;
    });
  }
  
  return result;
};

// Save orders to Supabase
const saveOrdersToSupabase = async (orders: Order[]): Promise<void> => {
  try {
    console.log(`Attempting to save ${orders.length} orders to Supabase`);
    
    // Delete existing orders with the same IDs
    const orderIds = orders.map(order => order.id);
    console.log(`Deleting ${orderIds.length} existing orders with IDs: ${orderIds.slice(0, 5).join(', ')}${orderIds.length > 5 ? '...' : ''}`);
    
    // Batch delete existing orders
    for (const batch of chunkArray(orderIds, 100)) {
      console.log(`Deleting batch of ${batch.length} orders`);
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.error('Error deleting existing orders:', error);
        throw error;
      }
    }
    
    // Define allowed fields based on database schema
    const allowedFields = [
      'id',
      'number',
      'date_created',
      'status',
      'total',
      'subtotal',
      'total_tax',
      'shipping_total',
      'discount_total',
      'customer_id',
      'customer_note',
      'payment_method',
      'payment_method_title',
      'line_items',
      'shipping_lines',
      'fee_lines',
      'coupon_lines',
      'created_at',
      'profit',
      'margin'
    ];
    
    // Define JSONB fields
    const jsonbFields = [
      'line_items',
      'shipping_lines',
      'fee_lines',
      'coupon_lines'
    ];
    
    // Filter orders to only include fields that exist in the database schema
    console.log('Filtering and sanitizing orders for database insertion');
    const filteredOrders = orders.map(order => {
      // Sanitize numeric fields first
      const sanitizedOrder = sanitizeNumericFields(order);
      
      // Sanitize JSONB fields
      const jsonbSanitizedOrder = sanitizeJsonbFields(sanitizedOrder, jsonbFields);
      
      // Calculate profit and margin
      if (jsonbSanitizedOrder.line_items && Array.isArray(jsonbSanitizedOrder.line_items)) {
        let totalProfit = 0;
        let totalRevenue = 0;
        
        jsonbSanitizedOrder.line_items.forEach((item: any) => {
          const itemTotal = Number(item.total) || 0;
          const costPrice = Number(item.cost_price) || 0;
          const quantity = Number(item.quantity) || 0;
          const itemCost = costPrice * quantity;
          const itemProfit = itemTotal - itemCost;
          
          // Update the line item with profit and margin
          item.profit = itemProfit;
          item.margin = itemTotal > 0 ? (itemProfit / itemTotal) * 100 : 0;
          
          totalProfit += itemProfit;
          totalRevenue += itemTotal;
        });
        
        // Set order profit and margin
        jsonbSanitizedOrder.profit = totalProfit;
        jsonbSanitizedOrder.margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      }
      
      // Ensure required fields are present
      const filtered = filterObjectToSchema(jsonbSanitizedOrder, allowedFields);
      
      // Make sure required fields are present
      if (!filtered.number) {
        filtered.number = order.number;
        console.warn(`Order ${order.id} was missing 'number' field, added from original order`);
      }
      if (!filtered.date_created && order.date_created) {
        filtered.date_created = order.date_created;
        console.warn(`Order ${order.id} was missing 'date_created' field, added from original order`);
      }
      if (!filtered.status) {
        filtered.status = order.status;
        console.warn(`Order ${order.id} was missing 'status' field, added from original order`);
      }
      
      return filtered as Omit<Order, 'id'>;
    });
    
    console.log(`Prepared ${filteredOrders.length} orders for insertion`);
    
    // Log a sample order for debugging
    if (filteredOrders.length > 0) {
      console.log('Sample order for insertion:', JSON.stringify(filteredOrders[0], null, 2));
    }
    
    // Batch insert new orders
    let insertedCount = 0;
    for (const batch of chunkArray(filteredOrders, 100)) {
      console.log(`Inserting batch of ${batch.length} orders`);
      try {
        const result = await ordersService.bulkAdd(batch);
        insertedCount += result.length;
        console.log(`Successfully inserted ${result.length} orders in this batch`);
      } catch (error) {
        console.error('Error inserting batch of orders:', error);
        throw error;
      }
    }
    
    console.log(`Successfully saved ${insertedCount} orders to Supabase`);
  } catch (error) {
    console.error('Error saving orders to Supabase:', error);
    throw error;
  }
};

// Helper function to safely handle null dates
const isValidDate = (date: Date | null): date is Date => {
  return date !== null && date instanceof Date && !isNaN(date.getTime());
};

// Helper function to safely create a Date from a string or Date object
const createSafeDate = (dateInput: string | Date | null): Date | null => {
  if (!dateInput) return null;
  try {
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Invalid date input:', dateInput);
    return null;
  }
};