import { CustomerBaseService } from './base';
import { Customer, Order, PurchaseFrequencyData } from '../../types';
import { differenceInDays } from 'date-fns';

export class CustomerPurchaseFrequencyService extends CustomerBaseService {
  constructor() {
    super('customers');
  }

  // Analyze purchase frequency patterns
  analyzePurchaseFrequency(orders: Order[]): PurchaseFrequencyData | undefined {
    try {
      if (!orders || orders.length === 0) {
        return {
          daysBetweenDistribution: [],
          segmentFrequency: [],
          averageDaysBetween: 0,
          medianDaysBetween: 0,
          recommendedCampaignDays: []
        };
      }
      
      // Group orders by customer
      const ordersByCustomer: Record<number, Order[]> = {};
      
      orders.forEach(order => {
        if (order.customer_id && order.date_created) {
          if (!ordersByCustomer[order.customer_id]) {
            ordersByCustomer[order.customer_id] = [];
          }
          ordersByCustomer[order.customer_id].push(order);
        }
      });
      
      // Calculate days between purchases for each customer
      const daysBetweenPurchases: number[] = [];
      const customerDaysAverage: Record<number, number> = {};
      const customerDaysBetween: Record<number, number[]> = {};
      
      Object.entries(ordersByCustomer).forEach(([customerId, customerOrders]) => {
        if (customerOrders.length < 2) return;
        
        // Sort orders by date
        const sortedOrders = customerOrders
          .filter(order => order.date_created)
          .sort((a, b) => {
            return (a.date_created as Date).getTime() - (b.date_created as Date).getTime();
          });
        
        if (!customerDaysBetween[parseInt(customerId)]) {
          customerDaysBetween[parseInt(customerId)] = [];
        }
        
        // Calculate days between consecutive orders
        for (let i = 1; i < sortedOrders.length; i++) {
          const prevOrderDate = sortedOrders[i-1].date_created as Date;
          const currentOrderDate = sortedOrders[i].date_created as Date;
          const daysBetween = differenceInDays(currentOrderDate, prevOrderDate);
          
          // Only count reasonable values (1-365 days)
          if (daysBetween >= 1 && daysBetween <= 365) {
            daysBetweenPurchases.push(daysBetween);
            customerDaysBetween[parseInt(customerId)].push(daysBetween);
          }
        }
        
        // Calculate average for this customer
        if (customerDaysBetween[parseInt(customerId)].length > 0) {
          const sum = customerDaysBetween[parseInt(customerId)].reduce((a, b) => a + b, 0);
          customerDaysAverage[parseInt(customerId)] = sum / customerDaysBetween[parseInt(customerId)].length;
        }
      });
      
      // If no purchase frequency data, return default values
      if (daysBetweenPurchases.length === 0) {
        return {
          daysBetweenDistribution: [
            { label: '0-7 days', count: 0, percentage: 0 },
            { label: '8-14 days', count: 0, percentage: 0 },
            { label: '15-30 days', count: 0, percentage: 0 }
          ],
          segmentFrequency: [],
          averageDaysBetween: 0,
          medianDaysBetween: 0,
          recommendedCampaignDays: [7, 14, 30] // Default recommended days
        };
      }
      
      // Calculate overall stats
      const averageDaysBetween = daysBetweenPurchases.length > 0 
        ? daysBetweenPurchases.reduce((a, b) => a + b, 0) / daysBetweenPurchases.length 
        : 0;
      
      // Calculate median
      let medianDaysBetween = 0;
      if (daysBetweenPurchases.length > 0) {
        const sorted = [...daysBetweenPurchases].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        medianDaysBetween = sorted.length % 2 === 0 
          ? (sorted[mid - 1] + sorted[mid]) / 2 
          : sorted[mid];
      }
      
      // Create distribution buckets
      const dayRanges = [
        { min: 0, max: 7, label: '0-7 days' },
        { min: 8, max: 14, label: '8-14 days' },
        { min: 15, max: 30, label: '15-30 days' },
        { min: 31, max: 60, label: '31-60 days' },
        { min: 61, max: 90, label: '61-90 days' },
        { min: 91, max: 180, label: '91-180 days' },
        { min: 181, max: 365, label: '181-365 days' }
      ];
      
      const distribution: Record<string, number> = {};
      dayRanges.forEach(range => {
        distribution[range.label] = 0;
      });
      
      // Count purchases in each range
      daysBetweenPurchases.forEach(days => {
        for (const range of dayRanges) {
          if (days >= range.min && days <= range.max) {
            distribution[range.label]++;
            break;
          }
        }
      });
      
      // Calculate distribution percentages
      const totalPurchases = daysBetweenPurchases.length;
      const daysBetweenDistribution = Object.entries(distribution).map(([label, count]) => ({
        label,
        count,
        percentage: totalPurchases > 0 ? Math.round((count / totalPurchases) * 100) : 0
      }));
      
      // Calculate segment frequency (mock data for demo)
      const segmentFrequency = [
        {
          segment: 'loyal',
          averageDays: 14.2,
          nextPurchasePrediction: 14
        },
        {
          segment: 'active',
          averageDays: 25.7,
          nextPurchasePrediction: 26
        },
        {
          segment: 'at-risk',
          averageDays: 67.3,
          nextPurchasePrediction: 67
        },
        {
          segment: 'one-time',
          averageDays: 0,
          nextPurchasePrediction: 90
        }
      ];
      
      // Calculate recommended campaign days
      const recommendedCampaignDays: number[] = [];
      
      // Add median as a recommendation
      if (medianDaysBetween > 0) {
        recommendedCampaignDays.push(Math.round(medianDaysBetween));
      }
      
      // Add average as a recommendation if different enough from median
      if (Math.abs(averageDaysBetween - medianDaysBetween) > 5) {
        recommendedCampaignDays.push(Math.round(averageDaysBetween));
      }
      
      // Find peaks in distribution
      let maxCount = 0;
      let peakLabel = '';
      
      daysBetweenDistribution.forEach(item => {
        if (item.count > maxCount) {
          maxCount = item.count;
          peakLabel = item.label;
        }
      });
      
      // Extract numeric range from peak label and use midpoint
      if (peakLabel) {
        const match = peakLabel.match(/(\d+)-(\d+)/);
        if (match) {
          const min = parseInt(match[1]);
          const max = parseInt(match[2]);
          const midpoint = Math.round((min + max) / 2);
          if (!recommendedCampaignDays.includes(midpoint)) {
            recommendedCampaignDays.push(midpoint);
          }
        }
      }
      
      // Add segment-specific recommendations
      segmentFrequency.forEach(segment => {
        const days = Math.round(segment.nextPurchasePrediction);
        if (days > 0 && !recommendedCampaignDays.includes(days)) {
          recommendedCampaignDays.push(days);
        }
      });
      
      // Sort recommendations
      recommendedCampaignDays.sort((a, b) => a - b);
      
      return {
        daysBetweenDistribution,
        segmentFrequency,
        averageDaysBetween: parseFloat(averageDaysBetween.toFixed(1)),
        medianDaysBetween: parseFloat(medianDaysBetween.toFixed(1)),
        recommendedCampaignDays: recommendedCampaignDays.slice(0, 5) // Limit to 5 recommendations
      };
    } catch (error) {
      console.error('Error analyzing purchase frequency:', error);
      return {
        daysBetweenDistribution: [],
        segmentFrequency: [],
        averageDaysBetween: 0,
        medianDaysBetween: 0,
        recommendedCampaignDays: []
      };
    }
  }
} 