import { CustomerBaseService } from './base';
import { Customer, CustomerRFM } from '../../types';
import { differenceInDays } from 'date-fns';

export class CustomerRFMService extends CustomerBaseService {
  constructor() {
    super('customer_rfm');
  }

  // Get RFM data for analytics dashboard
  async getRFMData() {
    try {
      // Get latest RFM data
      const { data: rfmData, error: rfmError } = await this.supabase
        .from('customer_rfm')
        .select('*')
        .order('calculation_date', { ascending: false });
      
      // Default empty RFM data structure
      const defaultRfmData = {
        rfmDistribution: [],
        recencyDistribution: [],
        frequencyDistribution: [],
        monetaryDistribution: []
      };
      
      if (rfmError) {
        console.error('Error fetching RFM data:', rfmError);
        return defaultRfmData;
      }
      
      if (!rfmData || rfmData.length === 0) {
        return defaultRfmData;
      }
      
      // Get all customers to match with RFM data
      const { data: customers, error: customerError } = await this.supabase
        .from('customers')
        .select('*');
        
      if (customerError) {
        console.error('Error fetching customers for RFM analysis:', customerError);
        return defaultRfmData;
      }
      
      // Group by most recent calculation date to get latest RFM scores
      const latestRfmDate = rfmData[0].calculation_date;
      const latestRfm = rfmData.filter(r => r.calculation_date === latestRfmDate);
      
      // Calculate RFM distribution
      const rfmSegments: Record<string, number> = {};
      latestRfm.forEach(rfm => {
        rfmSegments[rfm.rfm_segment] = (rfmSegments[rfm.rfm_segment] || 0) + 1;
      });
      
      // RFM segment colors
      const rfmColors: Record<string, string> = {
        'Champions': '#10b981',       // Emerald
        'Loyal Customers': '#8b5cf6', // Purple
        'Potential Loyalists': '#3b82f6', // Blue
        'At Risk': '#f59e0b',         // Amber
        'Cant Lose Them': '#ef4444',  // Red
        'New Customers': '#4f46e5',   // Indigo
        'Promising': '#06b6d4',       // Cyan
        'Needs Attention': '#f97316', // Orange
        'About To Sleep': '#fb7185',  // Pink
        'Hibernating': '#64748b'      // Slate gray
      };
      
      const rfmDistribution = Object.entries(rfmSegments)
        .map(([segment, count]) => ({
          label: segment,
          count,
          percentage: Math.round((count / latestRfm.length) * 100),
          color: rfmColors[segment] || '#64748b' // Default slate
        }));
      
      // Colors for scores
      const scoreColors = {
        1: '#ef4444', // Red
        2: '#f59e0b', // Amber
        3: '#3b82f6', // Blue
        4: '#10b981', // Emerald
        5: '#8b5cf6'  // Purple
      };
      
      // Calculate actual distributions based on real data
      const recencyScores: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
      const frequencyScores: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
      const monetaryScores: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
      
      latestRfm.forEach(rfm => {
        recencyScores[rfm.recency_score] = (recencyScores[rfm.recency_score] || 0) + 1;
        frequencyScores[rfm.frequency_score] = (frequencyScores[rfm.frequency_score] || 0) + 1;
        monetaryScores[rfm.monetary_score] = (monetaryScores[rfm.monetary_score] || 0) + 1;
      });
      
      const recencyDistribution = Array.from({ length: 5 }, (_, i) => i + 1)
        .map(score => ({
          label: `Score ${score}`,
          count: recencyScores[score] || 0,
          color: scoreColors[score as keyof typeof scoreColors]
        }));
      
      const frequencyDistribution = Array.from({ length: 5 }, (_, i) => i + 1)
        .map(score => ({
          label: `Score ${score}`,
          count: frequencyScores[score] || 0,
          color: scoreColors[score as keyof typeof scoreColors]
        }));
      
      const monetaryDistribution = Array.from({ length: 5 }, (_, i) => i + 1)
        .map(score => ({
          label: `Score ${score}`,
          count: monetaryScores[score] || 0,
          color: scoreColors[score as keyof typeof scoreColors]
        }));
      
      return {
        rfmDistribution,
        recencyDistribution,
        frequencyDistribution,
        monetaryDistribution
      };
    } catch (error) {
      console.error('Error getting RFM data:', error);
      return {
        rfmDistribution: [],
        recencyDistribution: [],
        frequencyDistribution: [],
        monetaryDistribution: []
      };
    }
  }

  // Calculate RFM scores for all customers
  async calculateRFMScores(): Promise<void> {
    try {
      // Get all customers
      const { data: customers, error } = await this.supabase
        .from('customers')
        .select('*');
      
      if (error) {
        console.error('Error fetching customers for RFM calculation:', error);
        throw error;
      }
      
      if (!customers || customers.length === 0) {
        console.log('No customers found for RFM calculation');
        return;
      }
      
      // Parse dates from string to Date objects
      const parsedCustomers: Customer[] = customers.map((c: any) => ({
        ...c,
        last_order_date: c.last_order_date ? new Date(c.last_order_date) : undefined
      }));
      
      // Calculate RFM scores
      const now = new Date();
      const calculationDate = now;
      
      // Sort customers by recency, frequency, and monetary value
      const sortedByRecency = [...parsedCustomers]
        .filter(c => c.last_order_date) // Only consider customers with a last order date
        .sort((a, b) => {
          const aDays = a.last_order_date ? differenceInDays(now, a.last_order_date) : Infinity;
          const bDays = b.last_order_date ? differenceInDays(now, b.last_order_date) : Infinity;
          return aDays - bDays; // Lower days (more recent) comes first
        });
      
      const sortedByFrequency = [...parsedCustomers]
        .sort((a, b) => b.order_count - a.order_count);
      
      const sortedByMonetary = [...parsedCustomers]
        .sort((a, b) => b.total_spent - a.total_spent);
      
      // Calculate quintiles for each metric
      const quintileSize = Math.ceil(parsedCustomers.length / 5);
      
      // RFM scores for each customer
      const rfmScores: CustomerRFM[] = [];
      
      parsedCustomers.forEach(customer => {
        // Skip customers with no orders
        if (!customer.last_order_date || customer.order_count === 0) {
          return;
        }
        
        // Calculate recency score (5 = most recent, 1 = least recent)
        const recencyIndex = sortedByRecency.findIndex(c => c.id === customer.id);
        const recencyScore = recencyIndex !== -1 
          ? 5 - Math.floor(recencyIndex / quintileSize) 
          : 1;
        
        // Calculate frequency score (5 = most frequent, 1 = least frequent)
        const frequencyIndex = sortedByFrequency.findIndex(c => c.id === customer.id);
        const frequencyScore = frequencyIndex !== -1 
          ? 5 - Math.floor(frequencyIndex / quintileSize) 
          : 1;
        
        // Calculate monetary score (5 = highest value, 1 = lowest value)
        const monetaryIndex = sortedByMonetary.findIndex(c => c.id === customer.id);
        const monetaryScore = monetaryIndex !== -1 
          ? 5 - Math.floor(monetaryIndex / quintileSize) 
          : 1;
        
        // Combined RFM score
        const rfmScore = recencyScore * 100 + frequencyScore * 10 + monetaryScore;
        
        // Determine RFM segment based on scores
        let rfmSegment = '';
        
        if (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) {
          rfmSegment = 'Champions';
        } else if (recencyScore >= 3 && frequencyScore >= 3 && monetaryScore >= 3) {
          rfmSegment = 'Loyal Customers';
        } else if (recencyScore >= 3 && frequencyScore >= 1 && monetaryScore >= 2) {
          rfmSegment = 'Potential Loyalists';
        } else if (recencyScore <= 2 && frequencyScore >= 2 && monetaryScore >= 2) {
          rfmSegment = 'At Risk';
        } else if (recencyScore <= 1 && frequencyScore >= 4 && monetaryScore >= 4) {
          rfmSegment = 'Cant Lose Them';
        } else if (recencyScore >= 4 && frequencyScore <= 1 && monetaryScore >= 1) {
          rfmSegment = 'New Customers';
        } else if (recencyScore >= 3 && frequencyScore <= 1 && monetaryScore <= 1) {
          rfmSegment = 'Promising';
        } else if (recencyScore >= 2 && frequencyScore >= 2 && monetaryScore >= 2) {
          rfmSegment = 'Needs Attention';
        } else if (recencyScore >= 2 && frequencyScore <= 1 && monetaryScore <= 2) {
          rfmSegment = 'About To Sleep';
        } else {
          rfmSegment = 'Hibernating';
        }
        
        // Add to RFM scores array
        rfmScores.push({
          customer_id: customer.id,
          recency_score: recencyScore,
          frequency_score: frequencyScore,
          monetary_score: monetaryScore,
          rfm_score: rfmScore,
          rfm_segment: rfmSegment,
          calculation_date: calculationDate
        });
      });
      
      // Save RFM scores to database
      if (rfmScores.length > 0) {
        // Insert in batches to avoid too many rows at once
        const batchSize = 100;
        for (let i = 0; i < rfmScores.length; i += batchSize) {
          const batch = rfmScores.slice(i, i + batchSize);
          const { error: insertError } = await this.supabase
            .from('customer_rfm')
            .insert(batch);
          
          if (insertError) {
            console.error(`Error inserting RFM scores batch ${i}:`, insertError);
          }
        }
        
        console.log(`Calculated RFM scores for ${rfmScores.length} customers`);
      }
    } catch (error) {
      console.error('Error in calculateRFMScores:', error);
      throw error;
    }
  }
} 