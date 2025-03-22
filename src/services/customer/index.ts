import { CustomerBaseService } from './base';
import { CustomerBasicService } from './basic';
import { CustomerRFMService } from './rfm';
import { CustomerCohortService } from './cohort';
import { CustomerPurchaseFrequencyService } from './purchaseFrequency';
import { CustomerProductAffinityService } from './productAffinity';
import { CustomerOrderTimingService } from './orderTiming';

// Create instances of all customer services
const customerBaseService = new CustomerBaseService('customers');
const customerBasicService = new CustomerBasicService();
const customerRFMService = new CustomerRFMService();
const customerCohortService = new CustomerCohortService();
const customerPurchaseFrequencyService = new CustomerPurchaseFrequencyService();
const customerProductAffinityService = new CustomerProductAffinityService();
const customerOrderTimingService = new CustomerOrderTimingService();

// Export the services
export {
  customerBaseService,
  customerBasicService,
  customerRFMService,
  customerCohortService,
  customerPurchaseFrequencyService,
  customerProductAffinityService,
  customerOrderTimingService
};

// Export the service classes
export {
  CustomerBaseService,
  CustomerBasicService,
  CustomerRFMService,
  CustomerCohortService,
  CustomerPurchaseFrequencyService,
  CustomerProductAffinityService,
  CustomerOrderTimingService
};

class CustomersService {
  basic: CustomerBasicService;
  rfm: CustomerRFMService;
  orderTiming: CustomerOrderTimingService;
  cohort: CustomerCohortService;
  productAffinity: CustomerProductAffinityService;
  purchaseFrequency: CustomerPurchaseFrequencyService;

  constructor() {
    this.basic = new CustomerBasicService();
    this.rfm = new CustomerRFMService();
    this.orderTiming = new CustomerOrderTimingService();
    this.cohort = new CustomerCohortService();
    this.productAffinity = new CustomerProductAffinityService();
    this.purchaseFrequency = new CustomerPurchaseFrequencyService();
  }

  // Main API method used by components
  async getCustomerAnalytics(startDate?: Date, endDate?: Date) {
    try {
      // Get basic customer data
      const basicData = await this.basic.getBasicAnalytics();
      
      // Get orders filtered by date range if provided
      const orders = await this.basic.getFilteredOrders(startDate, endDate);
      
      // Get products for product-related analysis
      const products = await this.basic.getProducts();
      
      // Get RFM data
      const rfmData = await this.rfm.getRFMData();
      
      // Get cohort analysis data
      const cohortData = await this.cohort.getCohortData();
      
      // Analyze purchase frequency patterns
      const purchaseFrequency = this.purchaseFrequency.analyzePurchaseFrequency(orders);
      
      // Analyze product affinity patterns
      const productAffinity = this.productAffinity.analyzeProductAffinity(orders, products);
      
      // Analyze order timing patterns
      const orderTiming = this.orderTiming.analyzeOrderTiming(orders);
      
      // Combine all data
      return {
        ...basicData,
        rfmData,
        cohortAnalysis: cohortData,
        purchaseFrequency,
        productAffinity,
        orderTiming
      };
    } catch (error) {
      console.error('Error in getCustomerAnalytics:', error);
      // Return a default structure with empty values
      return {
        totalCustomers: 0,
        newCustomers: 0,
        activeCustomers: 0,
        atRiskCustomers: 0,
        lostCustomers: 0,
        customerSegments: [],
        rfmData: {
          recencyDistribution: [],
          frequencyDistribution: [],
          monetaryDistribution: [],
          segments: []
        },
        averageOrderValue: 0,
        customerLifetimeValue: 0,
        topSpendingCustomers: [],
        mostFrequentCustomers: [],
        acquisitionSources: []
      };
    }
  }

  // Methods to support backward compatibility
  async calculateRFMScores(): Promise<void> {
    return this.rfm.calculateRFMScores();
  }

  async updateCustomerSegments(): Promise<void> {
    // Forward to the appropriate service when implemented
    // For now, we'll throw an error
    throw new Error("Method not yet implemented in modular services");
  }

  async forceUpdateZeroOrderCustomers(): Promise<void> {
    // Forward to the appropriate service when implemented
    // For now, we'll throw an error
    throw new Error("Method not yet implemented in modular services");
  }

  async getCustomerOrders(customerId: number): Promise<any[]> {
    // Forward to the appropriate service when implemented
    // For now, return legacy service
    const { data: orders, error } = await this.basic.supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('date_created', { ascending: false });
    
    if (error) {
      console.error('Error fetching customer orders:', error);
      return [];
    }
    
    // Parse orders and properly handle JSON fields
    return orders.map((order: any) => ({
      ...order,
      date_created: order.date_created ? new Date(order.date_created) : undefined,
      line_items: typeof order.line_items === 'string' 
        ? JSON.parse(order.line_items) 
        : order.line_items,
    }));
  }
}

// Export the customersService instance for backward compatibility
export const customersService = new CustomersService(); 