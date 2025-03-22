import { CustomerBaseService } from './base';
import { Customer, Order, OrderTimingData } from '../../types';
import { differenceInHours, format } from 'date-fns';

export class CustomerOrderTimingService extends CustomerBaseService {
  constructor() {
    super('customers');
  }

  // Analyze order timing patterns
  analyzeOrderTiming(orders: Order[]): OrderTimingData | undefined {
    try {
      if (!orders || orders.length === 0) {
        return {
          weekdayDistribution: [],
          timeOfDayDistribution: [],
          hourlyDistribution: [],
          bestPerformingDays: [],
          bestPerformingHours: [],
          worstPerformingDays: [],
          worstPerformingHours: []
        };
      }

      // Sort orders by date_created
      const sortedOrders = [...orders].sort((a, b) => {
        const dateA = a.date_created ? new Date(a.date_created) : new Date();
        const dateB = b.date_created ? new Date(b.date_created) : new Date();
        return dateA.getTime() - dateB.getTime();
      });

      const totalOrders = sortedOrders.length;
      
      // Fix revenue calculation to handle string parsing properly
      const totalRevenue = sortedOrders.reduce((sum, order) => {
        let orderTotal = 0;
        if (order.total) {
          if (typeof order.total === 'string') {
            orderTotal = parseFloat(order.total);
          } else if (typeof order.total === 'number') {
            orderTotal = order.total;
          }
        }
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
      }, 0);
      
      console.log('Total revenue calculated:', totalRevenue);

      // Calculate hourly distribution
      const hourCounts = Array(24).fill(0);
      const hourlyRevenue = Array(24).fill(0);
      
      // Debug the first few orders to see the total values
      console.log('Sample of first 3 orders total values:', sortedOrders.slice(0, 3).map(o => ({
        total: o.total,
        type: typeof o.total,
        parsedValue: parseFloat(o.total as string)
      })));
      
      sortedOrders.forEach(order => {
        if (!order.date_created) return;
        const orderDate = new Date(order.date_created);
        const hour = orderDate.getHours();
        hourCounts[hour]++;
        
        // Ensure proper parsing of the total field
        let orderTotal = 0;
        if (order.total) {
          if (typeof order.total === 'string') {
            orderTotal = parseFloat(order.total);
          } else if (typeof order.total === 'number') {
            orderTotal = order.total;
          }
        }
        
        hourlyRevenue[hour] += isNaN(orderTotal) ? 0 : orderTotal;
      });

      const hourlyDistribution = hourCounts.map((count, hour) => {
        const revenue = hourlyRevenue[hour] || 0;
        const percentage = count > 0 ? Math.round((count / totalOrders) * 100) : 0;
        // Prevent division by zero
        const averageOrderValue = count > 0 ? (revenue / count) : 0;
        return {
          hour: format(new Date().setHours(hour, 0, 0, 0), 'h a'),
          count,
          percentage,
          revenue,
          averageOrderValue
        };
      });

      // Calculate day of week distribution
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayCounts = Array(7).fill(0);
      const dayRevenue = Array(7).fill(0);
      sortedOrders.forEach(order => {
        if (!order.date_created) return;
        const orderDate = new Date(order.date_created);
        const day = orderDate.getDay();
        dayCounts[day]++;
        
        // Ensure proper parsing of the total field
        let orderTotal = 0;
        if (order.total) {
          if (typeof order.total === 'string') {
            orderTotal = parseFloat(order.total);
          } else if (typeof order.total === 'number') {
            orderTotal = order.total;
          }
        }
        
        dayRevenue[day] += isNaN(orderTotal) ? 0 : orderTotal;
      });

      const weekdayDistribution = dayCounts.map((count, day) => {
        const revenue = dayRevenue[day] || 0;
        const percentage = count > 0 ? Math.round((count / totalOrders) * 100) : 0;
        // Prevent division by zero
        const averageOrderValue = count > 0 ? (revenue / count) : 0;
        return {
          day: dayNames[day],
          count,
          percentage,
          revenue,
          averageOrderValue
        };
      });

      // Calculate time of day distribution
      const timeOfDayRanges = [
        { name: 'Morning (6-11)', hours: [6, 7, 8, 9, 10, 11] },
        { name: 'Afternoon (12-17)', hours: [12, 13, 14, 15, 16, 17] },
        { name: 'Evening (18-22)', hours: [18, 19, 20, 21, 22] },
        { name: 'Night (23-5)', hours: [23, 0, 1, 2, 3, 4, 5] }
      ];
      
      const timeOfDayCounts = Array(timeOfDayRanges.length).fill(0);
      const timeOfDayRevenue = Array(timeOfDayRanges.length).fill(0);
      
      sortedOrders.forEach(order => {
        if (!order.date_created) return;
        const orderDate = new Date(order.date_created);
        const hour = orderDate.getHours();
        
        // Ensure proper parsing of the total field
        let orderTotal = 0;
        if (order.total) {
          if (typeof order.total === 'string') {
            orderTotal = parseFloat(order.total);
          } else if (typeof order.total === 'number') {
            orderTotal = order.total;
          }
        }
        
        for (let i = 0; i < timeOfDayRanges.length; i++) {
          if (timeOfDayRanges[i].hours.includes(hour)) {
            timeOfDayCounts[i]++;
            timeOfDayRevenue[i] += isNaN(orderTotal) ? 0 : orderTotal;
            break;
          }
        }
      });
      
      const timeOfDayDistribution = timeOfDayRanges.map((range, index) => {
        const count = timeOfDayCounts[index];
        const revenue = timeOfDayRevenue[index] || 0;
        const percentage = Math.round((count / totalOrders) * 100) || 0;
        const averageOrderValue = count > 0 ? (revenue / count) || 0 : 0;
        
        return {
          timeRange: range.name,
          count,
          percentage,
          revenue,
          averageOrderValue
        };
      });

      // Calculate best and worst performing periods
      const sortedWeekdays = [...weekdayDistribution].sort((a, b) => b.count - a.count);
      const bestPerformingDays = sortedWeekdays.slice(0, 3);
      const worstPerformingDays = [...sortedWeekdays].reverse().slice(0, 3);
      
      const sortedHours = [...hourlyDistribution].sort((a, b) => b.count - a.count);
      const bestPerformingHours = sortedHours.slice(0, 5);
      const worstPerformingHours = [...sortedHours].reverse().slice(0, 5);

      // Return the complete order timing data
      return {
        weekdayDistribution,
        timeOfDayDistribution,
        hourlyDistribution,
        bestPerformingDays,
        bestPerformingHours,
        worstPerformingDays,
        worstPerformingHours
      };
    } catch (error) {
      console.error('Error analyzing order timing:', error);
      // Return empty data structure in case of error
      return {
        weekdayDistribution: [],
        timeOfDayDistribution: [],
        hourlyDistribution: [],
        bestPerformingDays: [],
        bestPerformingHours: [],
        worstPerformingDays: [],
        worstPerformingHours: []
      };
    }
  }
} 