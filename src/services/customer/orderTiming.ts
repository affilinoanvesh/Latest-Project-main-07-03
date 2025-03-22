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
      const totalRevenue = sortedOrders.reduce((sum, order) => 
        sum + (typeof order.total === 'string' ? parseFloat(order.total) : 0), 0);

      // Calculate hourly distribution
      const hourCounts = Array(24).fill(0);
      const hourlyRevenue = Array(24).fill(0);
      sortedOrders.forEach(order => {
        if (!order.date_created) return;
        const orderDate = new Date(order.date_created);
        const hour = orderDate.getHours();
        hourCounts[hour]++;
        hourlyRevenue[hour] += (typeof order.total === 'string' ? parseFloat(order.total) : 0);
      });

      const hourlyDistribution = hourCounts.map((count, hour) => {
        const revenue = hourlyRevenue[hour];
        const percentage = Math.round((count / totalOrders) * 100);
        const averageOrderValue = count > 0 ? revenue / count : 0;
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
        dayRevenue[day] += (typeof order.total === 'string' ? parseFloat(order.total) : 0);
      });

      const weekdayDistribution = dayCounts.map((count, day) => {
        const revenue = dayRevenue[day];
        const percentage = Math.round((count / totalOrders) * 100);
        const averageOrderValue = count > 0 ? revenue / count : 0;
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
        const orderTotal = typeof order.total === 'string' ? parseFloat(order.total) : 0;
        
        for (let i = 0; i < timeOfDayRanges.length; i++) {
          if (timeOfDayRanges[i].hours.includes(hour)) {
            timeOfDayCounts[i]++;
            timeOfDayRevenue[i] += orderTotal;
            break;
          }
        }
      });
      
      const timeOfDayDistribution = timeOfDayRanges.map((range, index) => {
        const count = timeOfDayCounts[index];
        const revenue = timeOfDayRevenue[index];
        const percentage = Math.round((count / totalOrders) * 100);
        const averageOrderValue = count > 0 ? revenue / count : 0;
        
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