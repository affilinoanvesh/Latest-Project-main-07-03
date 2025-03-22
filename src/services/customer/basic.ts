import { CustomerBaseService } from './base';
import { Customer, Order, Product } from '../../types';
import { differenceInDays } from 'date-fns';

export class CustomerBasicService extends CustomerBaseService {
  constructor() {
    super('customers');
  }

  // Get basic customer analytics
  async getBasicAnalytics(startDate?: Date, endDate?: Date) {
    try {
      console.log('getBasicAnalytics called with date range:', {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      });
      
      // Fetch all customers
      const { data: customers, error } = await this.supabase
        .from('customers')
        .select('*');

      if (error) throw error;
      if (!customers || customers.length === 0) {
        return {
          totalCustomers: 0,
          newCustomers: 0,
          activeCustomers: 0,
          atRiskCustomers: 0,
          lostCustomers: 0,
          customerSegments: [],
          rfmData: { rfmDistribution: [], recencyDistribution: [], frequencyDistribution: [], monetaryDistribution: [] },
          averageOrderValue: 0,
          customerLifetimeValue: 0,
          topSpendingCustomers: [],
          mostFrequentCustomers: [],
          acquisitionSources: []
        };
      }

      // Parse customers with proper date handling
      const parsedCustomers: Customer[] = customers.map((c: any) => ({
        ...c,
        date_created: c.date_created ? new Date(c.date_created) : undefined,
        date_modified: c.date_modified ? new Date(c.date_modified) : undefined,
        last_order_date: c.last_order_date ? new Date(c.last_order_date) : undefined,
        first_order_date: c.first_order_date ? new Date(c.first_order_date) : undefined,
        created_at: c.created_at ? new Date(c.created_at) : undefined,
        updated_at: c.updated_at ? new Date(c.updated_at) : undefined,
      }));
      
      // Filter customers by date range if provided
      let filteredCustomers = parsedCustomers;
      
      if (startDate && endDate) {
        // Filter customers by their orders within the date range
        const { data: ordersInRange } = await this.supabase
          .from('orders')
          .select('customer_id, date_created')
          .gte('date_created', startDate.toISOString())
          .lt('date_created', endDate ? new Date(endDate.getTime() + 86400000).toISOString() : undefined);
            
        if (ordersInRange && ordersInRange.length > 0) {
          // Get unique customer IDs from orders in range
          const customerIdsInRange = new Set(ordersInRange.map(order => order.customer_id));
          
          // Filter customers by those IDs
          filteredCustomers = parsedCustomers.filter(customer => 
            customerIdsInRange.has(customer.id)
          );
          
          console.log(`Filtered ${parsedCustomers.length} customers to ${filteredCustomers.length} based on date range orders`);
        } else {
          console.log('No orders found in date range, showing 0 customers');
          filteredCustomers = [];
        }
      }
      
      // Calculate current date for comparisons
      const now = new Date();
      
      // Calculate segments
      const customerSegments = [
        { name: 'loyal', count: 0, percentage: 0, color: '#FF6384' },
        { name: 'active', count: 0, percentage: 0, color: '#36A2EB' },
        { name: 'at-risk', count: 0, percentage: 0, color: '#FFCE56' },
        { name: 'lost', count: 0, percentage: 0, color: '#9966FF' },
        { name: 'new', count: 0, percentage: 0, color: '#4BC0C0' },
        { name: 'one-time', count: 0, percentage: 0, color: '#FF9F40' },
      ];
      
      let newCustomers = 0;
      let activeCustomers = 0;
      let atRiskCustomers = 0;
      let lostCustomers = 0;
      
      let customersBySegment: Record<string, Customer[]> = {
        loyal: [],
        active: [],
        'at-risk': [],
        lost: [],
        new: [],
        'one-time': [],
      };
      
      // Segment customers based on their attributes
      filteredCustomers.forEach(customer => {
        if (!customer.last_order_date) {
          return; // Skip customers with no order history
        }
        
        const lastOrderDate = new Date(customer.last_order_date);
        const daysSinceLastOrder = differenceInDays(now, lastOrderDate);
        
        // New customers (first order in the last 30 days)
        if (customer.first_order_date && differenceInDays(now, new Date(customer.first_order_date)) <= 30) {
          newCustomers++;
          customerSegments.find(s => s.name === 'new')!.count++;
          customersBySegment.new.push(customer);
          return;
        }
        
        // One-time customers (only one order)
        if (customer.order_count === 1 && daysSinceLastOrder > 30) {
          customerSegments.find(s => s.name === 'one-time')!.count++;
          customersBySegment['one-time'].push(customer);
          return;
        }
        
        // Loyal customers (ordered more than 3 times, last order within 60 days)
        if (customer.order_count >= 3 && daysSinceLastOrder <= 60) {
          customerSegments.find(s => s.name === 'loyal')!.count++;
          customersBySegment.loyal.push(customer);
          activeCustomers++;
          return;
        }
        
        // Active customers (ordered in the last 60 days, not loyal)
        if (daysSinceLastOrder <= 60) {
          customerSegments.find(s => s.name === 'active')!.count++;
          customersBySegment.active.push(customer);
          activeCustomers++;
          return;
        }
        
        // At-risk customers (61-120 days since last order)
        if (daysSinceLastOrder > 60 && daysSinceLastOrder <= 120) {
          customerSegments.find(s => s.name === 'at-risk')!.count++;
          customersBySegment['at-risk'].push(customer);
          atRiskCustomers++;
          return;
        }
        
        // Lost customers (no orders in the last 120 days)
        if (daysSinceLastOrder > 120) {
          customerSegments.find(s => s.name === 'lost')!.count++;
          customersBySegment.lost.push(customer);
          lostCustomers++;
          return;
        }
      });
      
      // Calculate percentages
      customerSegments.forEach(segment => {
        segment.percentage = Math.round((segment.count / filteredCustomers.length) * 100) || 0;
      });
      
      // Calculate average order value and customer lifetime value
      const totalOrders = filteredCustomers.reduce((sum, c) => sum + c.order_count, 0);
      const totalSpent = filteredCustomers.reduce((sum, c) => sum + c.total_spent, 0);
      
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const customerLifetimeValue = filteredCustomers.length > 0 ? totalSpent / filteredCustomers.length : 0;
      
      // Get top spending customers
      const topSpendingCustomers = [...filteredCustomers]
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 10);
      
      // Get most frequent customers
      const mostFrequentCustomers = [...filteredCustomers]
        .sort((a, b) => b.order_count - a.order_count)
        .slice(0, 10);
      
      // Calculate acquisition sources (mock data for now)
      const acquisitionSources = [
        { source: 'Direct', count: Math.round(filteredCustomers.length * 0.4), percentage: 40 },
        { source: 'Search', count: Math.round(filteredCustomers.length * 0.25), percentage: 25 },
        { source: 'Social', count: Math.round(filteredCustomers.length * 0.15), percentage: 15 },
        { source: 'Email', count: Math.round(filteredCustomers.length * 0.1), percentage: 10 },
        { source: 'Referral', count: Math.round(filteredCustomers.length * 0.1), percentage: 10 },
      ];
      
      return {
        totalCustomers: filteredCustomers.length,
        newCustomers,
        activeCustomers,
        atRiskCustomers,
        lostCustomers,
        customerSegments,
        averageOrderValue,
        customerLifetimeValue,
        topSpendingCustomers,
        mostFrequentCustomers,
        acquisitionSources,
        customersBySegment
      };
    } catch (error) {
      console.error("Error getting customer analytics:", error);
      throw error;
    }
  }

  // Get orders filtered by date range
  async getFilteredOrders(startDate?: Date, endDate?: Date) {
    try {
      console.log('getFilteredOrders called with:', { 
        startDate: startDate?.toISOString(), 
        endDate: endDate?.toISOString() 
      });
      
      // Start with a base query
      let ordersQuery = this.supabase
        .from('orders')
        .select('*');
      
      // Apply date filters if provided
      if (startDate) {
        const formattedStartDate = startDate.toISOString();
        console.log('Filtering orders >= startDate:', formattedStartDate);
        ordersQuery = ordersQuery.gte('date_created', formattedStartDate);
      }
      
      if (endDate) {
        // Add one day to end date to include the entire end date (up to midnight)
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
        const formattedEndDate = adjustedEndDate.toISOString();
        console.log('Filtering orders < adjusted endDate:', formattedEndDate);
        ordersQuery = ordersQuery.lt('date_created', formattedEndDate);
      }
      
      // Add sorting
      ordersQuery = ordersQuery.order('date_created', { ascending: true });
      
      // Execute the query
      const { data: allOrders, error } = await ordersQuery;
      
      if (error) {
        console.error('Error in getFilteredOrders:', error);
        throw error;
      }
      
      if (!allOrders || allOrders.length === 0) {
        console.log('No orders found for the date range');
        return [];
      }
      
      console.log(`Found ${allOrders.length} orders for the date range`);
      
      // Parse orders and properly handle JSON fields
      const parsedOrders: Order[] = allOrders.map((order: any) => ({
        ...order,
        date_created: order.date_created ? new Date(order.date_created) : undefined,
        line_items: typeof order.line_items === 'string' 
          ? JSON.parse(order.line_items) 
          : order.line_items,
      }));
      
      return parsedOrders;
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
  }

  // Get products for analysis
  async getProducts() {
    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select('*');
      
      if (error) throw error;
      
      return products as Product[];
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  }
} 