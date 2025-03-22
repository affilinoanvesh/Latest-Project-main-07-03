import { Customer } from '../../types';
import { createWooCommerceClient } from './credentials';
import { customerBasicService, customerRFMService } from '../../services/customer';
import { supabase } from '../../services/supabase';
import { updateLastSync } from './sync';
import { 
  safeUpdateProgress, 
  formatDateForAPI, 
  chunkArray,
  processBatches,
  filterObjectToSchema
} from './utils';

// Extract information from order metadata
const extractAcquisitionData = (customer: any, firstOrder: any) => {
  const acquisitionData = {
    customer_id: customer.id,
    source: 'direct', // Default source
    medium: 'website', // Default medium
    campaign: '',
    first_order_id: firstOrder?.id || null,
    first_order_date: firstOrder?.date_created || null
  };
  
  // Try to extract UTM parameters from order metadata
  if (firstOrder?.meta_data && Array.isArray(firstOrder.meta_data)) {
    const utmSource = firstOrder.meta_data.find((meta: any) => meta.key === '_utm_source');
    const utmMedium = firstOrder.meta_data.find((meta: any) => meta.key === '_utm_medium');
    const utmCampaign = firstOrder.meta_data.find((meta: any) => meta.key === '_utm_campaign');
    
    if (utmSource && utmSource.value) {
      acquisitionData.source = utmSource.value;
    }
    
    if (utmMedium && utmMedium.value) {
      acquisitionData.medium = utmMedium.value;
    }
    
    if (utmCampaign && utmCampaign.value) {
      acquisitionData.campaign = utmCampaign.value;
    }
  }
  
  return acquisitionData;
};

// Fetch all customers with pagination
const fetchAllCustomers = async (progressCallback?: (progress: number) => void): Promise<any[]> => {
  const client = await createWooCommerceClient();
  let allCustomers: any[] = [];
  
  try {
    // Initial progress update
    safeUpdateProgress(progressCallback, 10);
    
    // First request to get total count
    const initialResponse = await client.get('/customers', {
      params: {
        per_page: 100, // Max allowed per page
        page: 1
      }
    });
    
    // Get total pages from response headers
    const totalPages = parseInt(initialResponse.headers['x-wp-totalpages'] || '1', 10);
    const totalCustomers = parseInt(initialResponse.headers['x-wp-total'] || '0', 10);
    
    console.log(`Found ${totalCustomers} customers across ${totalPages} pages`);
    
    // Add first page results
    allCustomers = allCustomers.concat(initialResponse.data);
    
    // Create an array of page numbers to fetch
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    
    // Process pages in chunks to avoid overwhelming the API
    const pageChunks = chunkArray(remainingPages, 5);
    
    let currentProgress = 20;
    const progressStep = 60 / pageChunks.length;
    
    // Process each chunk of pages
    for (const chunk of pageChunks) {
      const chunkPromises = chunk.map(page => 
        client.get('/customers', {
          params: {
            per_page: 100,
            page
          }
        })
      );
      
      // Wait for all requests in this chunk to complete
      const responses = await Promise.all(chunkPromises);
      
      // Add results to allCustomers
      responses.forEach(response => {
        allCustomers = allCustomers.concat(response.data);
      });
      
      // Update progress
      currentProgress += progressStep;
      safeUpdateProgress(progressCallback, currentProgress);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return allCustomers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

// Fetch all orders for a customer
const fetchCustomerOrders = async (customerId: number): Promise<any[]> => {
  const client = await createWooCommerceClient();
  let allOrders: any[] = [];
  
  try {
    // First request to get total count
    const initialResponse = await client.get('/orders', {
      params: {
        customer: customerId,
        per_page: 100,
        page: 1
      }
    });
    
    // Get total pages from response headers
    const totalPages = parseInt(initialResponse.headers['x-wp-totalpages'] || '1', 10);
    
    // Add first page results
    allOrders = allOrders.concat(initialResponse.data);
    
    // Fetch remaining pages
    for (let page = 2; page <= totalPages; page++) {
      const response = await client.get('/orders', {
        params: {
          customer: customerId,
          per_page: 100,
          page
        }
      });
      
      allOrders = allOrders.concat(response.data);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    return allOrders;
  } catch (error) {
    console.error(`Error fetching orders for customer ${customerId}:`, error);
    return [];
  }
};

// Process customer data before saving
const processCustomerData = async (customer: any): Promise<Customer> => {
  try {
    // Get customer orders
    const orders = await fetchCustomerOrders(customer.id);
    
    // Calculate metrics
    const orderCount = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
    const averageOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
    
    // Find first and last order dates
    let firstOrderDate: Date | undefined;
    let lastOrderDate: Date | undefined;
    
    if (orders.length > 0) {
      // Sort orders by date
      const sortedOrders = [...orders].sort((a, b) => {
        const aDate = new Date(a.date_created);
        const bDate = new Date(b.date_created);
        return aDate.getTime() - bDate.getTime();
      });
      
      firstOrderDate = new Date(sortedOrders[0].date_created);
      lastOrderDate = new Date(sortedOrders[sortedOrders.length - 1].date_created);
    }
    
    // Calculate customer segment
    // Default to 'new' if they have fewer than 2 orders
    // Otherwise 'active' if ordered in the last 90 days
    // 'at-risk' if last order was 91-180 days ago
    // 'lost' if last order was more than 180 days ago
    let customerSegment = 'new';
    
    if (lastOrderDate) {
      const now = new Date();
      const daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (orderCount >= 4 && daysSinceLastOrder <= 180) {
        customerSegment = 'loyal';
      } else if (daysSinceLastOrder <= 90) {
        customerSegment = 'active';
      } else if (daysSinceLastOrder <= 180) {
        customerSegment = 'at-risk';
      } else {
        customerSegment = 'lost';
      }
    }
    
    // Prepare processed customer data
    const processedCustomer: Customer = {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      username: customer.username,
      date_created: customer.date_created ? new Date(customer.date_created) : undefined,
      date_modified: customer.date_modified ? new Date(customer.date_modified) : undefined,
      role: customer.role,
      last_order_date: lastOrderDate,
      first_order_date: firstOrderDate,
      total_spent: totalSpent,
      order_count: orderCount,
      average_order_value: averageOrderValue,
      customer_segment: customerSegment,
      last_sync_date: new Date()
    };
    
    return processedCustomer;
  } catch (error) {
    console.error(`Error processing customer ${customer.id}:`, error);
    
    // Return basic customer data even if there was an error
    return {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      total_spent: 0,
      order_count: 0,
      average_order_value: 0,
      customer_segment: 'new',
      last_sync_date: new Date()
    };
  }
};

// Sync customers from WooCommerce API
export const syncCustomers = async (progressCallback?: (progress: number) => void): Promise<Customer[]> => {
  try {
    // Fetch all customers from WooCommerce API
    const rawCustomers = await fetchAllCustomers(progressCallback);
    
    // Get existing customers from database
    const { data: existingCustomers = [] } = await customerBasicService.supabase
      .from('customers')
      .select('*');
    
    // Create map of existing customers by ID for quick lookup
    const existingCustomersMap = new Map();
    existingCustomers.forEach((c: Customer) => {
      existingCustomersMap.set(c.id, c);
    });
    
    // Process customers in batches
    const processedCustomers = await processBatches<any, Customer>(
      rawCustomers,
      async (batch) => {
        const results: Customer[] = [];
        for (const customer of batch) {
          const processed = await processCustomerData(customer);
          results.push(processed);
        }
        return results;
      },
      20,
      50, // Add 50ms delay between batches
      (progress: number) => safeUpdateProgress(progressCallback, Math.floor(progress * 0.8))
    );
    
    // Save processed customers to database
    const allowedFields = [
      'id', 'email', 'first_name', 'last_name', 'username', 'date_created', 'date_modified',
      'role', 'last_order_date', 'total_spent', 'order_count', 'average_order_value',
      'first_order_date', 'customer_segment', 'metadata', 'last_sync_date'
    ];
    
    // Insert or update customers in batches
    const batchSize = 100;
    for (let i = 0; i < processedCustomers.length; i += batchSize) {
      const batch = processedCustomers.slice(i, i + batchSize)
        .map(customer => filterObjectToSchema(customer, allowedFields));
      
      const { error } = await supabase
        .from('customers')
        .upsert(batch, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error upserting customers batch ${i}:`, error);
      }
    }
    
    // Now process acquisition data after customers are saved
    safeUpdateProgress(progressCallback, 85);
    console.log("Processing acquisition data...");
    
    // Get first orders for each customer
    const processAcquisitionData = async () => {
      for (const customer of processedCustomers) {
        // Get customer's first order
        const { data: orders, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', customer.id)
          .order('date_created', { ascending: true })
          .limit(1);
        
        if (orderError) {
          console.error(`Error fetching orders for customer ${customer.id}:`, orderError);
          continue;
        }
        
        const firstOrder = orders && orders.length > 0 ? orders[0] : null;
        
        if (firstOrder) {
          const acquisitionData = extractAcquisitionData(customer as any, firstOrder);
          
          // Save acquisition data to database
          const { error: acquisitionError } = await supabase
            .from('customer_acquisition')
            .upsert([acquisitionData], { onConflict: 'customer_id' });
          
          if (acquisitionError) {
            console.error(`Error saving acquisition data for customer ${customer.id}:`, acquisitionError);
          }
        }
      }
    };
    
    await processAcquisitionData();
    
    // Update last sync timestamp
    await updateLastSync('customers');
    
    // Final progress update
    safeUpdateProgress(progressCallback, 100);
    
    // Calculate RFM scores
    await customerRFMService.calculateRFMScores();
    
    // Update customer segments based on RFM
    await customerRFMService.updateCustomerSegments();
    
    return processedCustomers;
  } catch (error) {
    console.error('Error in syncCustomers:', error);
    throw error;
  }
}; 