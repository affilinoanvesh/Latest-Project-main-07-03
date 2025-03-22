import { CustomerBaseService } from './base';
import { Customer, Order, CohortData } from '../../types';
import { format, parse, startOfMonth, endOfMonth, addMonths, differenceInDays } from 'date-fns';

export class CustomerCohortService extends CustomerBaseService {
  constructor() {
    super('customers');
  }

  // Get cohort data for analytics
  async getCohortData(): Promise<CohortData[]> {
    try {
      // Get all customers
      const { data: customers, error: customerError } = await this.supabase
        .from('customers')
        .select('*');
      
      if (customerError) {
        console.error('Error fetching customers for cohort analysis:', customerError);
        return [];
      }
      
      // Get all orders
      const { data: orders, error: ordersError } = await this.supabase
        .from('orders')
        .select('*')
        .order('date_created', { ascending: true });
      
      if (ordersError) {
        console.error('Error fetching orders for cohort analysis:', ordersError);
        return [];
      }
      
      if (!customers || !orders || customers.length === 0 || orders.length === 0) {
        return [];
      }
      
      // Parse dates for customers and orders
      const parsedCustomers: Customer[] = customers.map((c: any) => ({
        ...c,
        first_order_date: c.first_order_date ? new Date(c.first_order_date) : undefined,
        last_order_date: c.last_order_date ? new Date(c.last_order_date) : undefined
      }));
      
      const parsedOrders: Order[] = orders.map((order: any) => ({
        ...order,
        date_created: order.date_created ? new Date(order.date_created) : undefined
      }));
      
      // Group customers by acquisition month (first order date)
      const cohorts: Map<string, number[]> = new Map();
      
      // Filter customers with first order date
      const customersWithFirstOrder = parsedCustomers.filter(c => c.first_order_date);
      
      // Create cohort groups by month
      customersWithFirstOrder.forEach(customer => {
        if (customer.first_order_date) {
          const cohortMonth = format(customer.first_order_date, 'yyyy-MM');
          if (!cohorts.has(cohortMonth)) {
            cohorts.set(cohortMonth, []);
          }
          cohorts.get(cohortMonth)?.push(customer.id);
        }
      });
      
      // Sort cohort months chronologically
      const sortedCohortMonths = Array.from(cohorts.keys()).sort();
      
      // Calculate retention for each cohort
      const cohortData: CohortData[] = [];
      
      sortedCohortMonths.forEach(cohortMonth => {
        const customerIds = cohorts.get(cohortMonth) || [];
        if (customerIds.length === 0) return;
        
        // Calculate retention rates for each month after acquisition
        const retentionRates: CohortData['retentionRates'] = [];
        const cohortDate = parse(cohortMonth, 'yyyy-MM', new Date());
        
        // Calculate up to 12 months of retention
        for (let monthOffset = 0; monthOffset <= 12; monthOffset++) {
          const targetMonth = addMonths(cohortDate, monthOffset);
          const startOfTargetMonth = startOfMonth(targetMonth);
          const endOfTargetMonth = endOfMonth(targetMonth);
          
          // Count customers who ordered in this month
          const activeCustomers = new Set<number>();
          let monthlyValue = 0;
          
          parsedOrders.forEach(order => {
            if (order.date_created && 
                order.date_created >= startOfTargetMonth && 
                order.date_created <= endOfTargetMonth && 
                order.customer_id && 
                customerIds.includes(order.customer_id)) {
              activeCustomers.add(order.customer_id);
              monthlyValue += parseFloat(order.total.toString());
            }
          });
          
          // For month 0 (acquisition month), all customers are active by definition
          let rate: number;
          if (monthOffset === 0) {
            rate = 100; // 100% retention in month 0
            activeCustomers.clear();
            customerIds.forEach(id => activeCustomers.add(id)); // All customers active in month 0
          } else {
            rate = customerIds.length > 0 ? (activeCustomers.size / customerIds.length) * 100 : 0;
          }
          
          retentionRates.push({
            month: monthOffset,
            rate: parseFloat(rate.toFixed(1)),
            customers: activeCustomers.size,
            value: parseFloat(monthlyValue.toFixed(2))
          });
        }
        
        // Calculate total value of cohort
        const totalValue = retentionRates.reduce((sum, month) => sum + month.value, 0);
        const averageCustomerValue = customerIds.length > 0 ? totalValue / customerIds.length : 0;
        
        cohortData.push({
          month: format(cohortDate, 'MMM yyyy'),
          initialCustomers: customerIds.length,
          retentionRates,
          totalValue: parseFloat(totalValue.toFixed(2)),
          averageCustomerValue: parseFloat(averageCustomerValue.toFixed(2))
        });
      });
      
      // Return only the most recent 12 cohorts if we have more
      return cohortData.slice(-12);
    } catch (error) {
      console.error('Error getting cohort data:', error);
      return [];
    }
  }
} 