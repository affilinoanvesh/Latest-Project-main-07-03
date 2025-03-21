export interface Customer {
  id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  date_created?: Date;
  date_modified?: Date;
  role?: string;
  last_order_date?: Date;
  total_spent: number;
  order_count: number;
  average_order_value: number;
  first_order_date?: Date;
  customer_segment?: string;
  last_sync_date?: Date;
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface CustomerRFM {
  id?: number;
  customer_id: number;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  rfm_score: number;
  rfm_segment: string;
  calculation_date: Date;
}

export interface CustomerAcquisition {
  id?: number;
  customer_id: number;
  source?: string;
  medium?: string;
  campaign?: string;
  first_order_id?: number;
  first_order_date?: Date;
  customer_acquisition_cost?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface CustomerSegment {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RFMData {
  rfmDistribution: {
    label: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  recencyDistribution: {
    label: string;
    count: number;
    color?: string;
  }[];
  frequencyDistribution: {
    label: string;
    count: number;
    color?: string;
  }[];
  monetaryDistribution: {
    label: string;
    count: number;
    color?: string;
  }[];
}

// Cohort Analysis Types
export interface CohortData {
  month: string;
  initialCustomers: number;
  retentionRates: {
    month: number; // Months from acquisition (0 = acquisition month)
    rate: number;  // Retention rate as percentage
    customers: number; // Number of retained customers
    value: number; // Value of retained customers
  }[];
  totalValue: number;
  averageCustomerValue: number;
}

// Purchase Frequency Types
export interface PurchaseFrequencyData {
  // Days between purchases distribution
  daysBetweenDistribution: {
    label: string; // Range label (e.g. "0-7 days")
    count: number; // Number of purchases in this range
    percentage: number;
  }[];
  // Average days between purchases by segment
  segmentFrequency: {
    segment: string; // Segment name
    averageDays: number; // Average days between orders
    nextPurchasePrediction: number; // Predicted days until next purchase
  }[];
  // Overall stats
  averageDaysBetween: number;
  medianDaysBetween: number;
  recommendedCampaignDays: number[]; // Optimal days for campaigns
}

// Product Affinity Types
export interface ProductPair {
  product1Id: number;
  product1Name: string;
  product2Id: number;
  product2Name: string;
  cooccurrenceCount: number;
  supportPercentage: number;
  confidencePercentage: number;
  liftScore: number;
}

export interface ProductCategory {
  id: number;
  name: string;
  productCount: number;
}

export interface ProductAffinityData {
  // Product pairs that are frequently purchased together
  frequentlyBoughtTogether: ProductPair[];
  // Cross-selling opportunities by segment
  crossSellOpportunities: {
    segment: string;
    recommendations: {
      productId: number;
      productName: string;
      recommendationScore: number;
    }[];
  }[];
  // Category preferences by segment
  categoryPreferences: {
    segment: string;
    categories: {
      categoryId: number;
      categoryName: string;
      percentage: number;
    }[];
  }[];
}

// Order Timing Analysis Types
export interface OrderTimingData {
  weekdayDistribution: {
    day: string;
    count: number;
    percentage: number;
    revenue: number;
    averageOrderValue: number;
  }[];
  timeOfDayDistribution: {
    timeRange: string;
    count: number;
    percentage: number;
    revenue: number;
    averageOrderValue: number;
  }[];
  hourlyDistribution?: {
    hour: string;
    count: number;
    percentage: number;
    revenue: number;
    averageOrderValue: number;
  }[];
  bestPerformingDays: {
    day: string;
    count: number;
    percentage: number;
    revenue: number;
    averageOrderValue: number;
  }[];
  bestPerformingHours: {
    hour: string;
    count: number;
    percentage: number;
    revenue: number;
    averageOrderValue: number;
  }[];
  worstPerformingDays: {
    day: string;
    count: number;
    percentage: number;
    revenue: number;
    averageOrderValue: number;
  }[];
  worstPerformingHours: {
    hour: string;
    count: number;
    percentage: number;
    revenue: number;
    averageOrderValue: number;
  }[];
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface CustomerAnalyticsData {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  atRiskCustomers: number;
  lostCustomers: number;
  customerSegments: CustomerSegment[];
  rfmData: RFMData;
  averageOrderValue: number;
  customerLifetimeValue: number;
  topSpendingCustomers: Customer[];
  mostFrequentCustomers: Customer[];
  acquisitionSources: {
    source: string;
    count: number;
    percentage: number;
  }[];
  customersBySegment?: Record<string, Customer[]>;
  // New data for enhanced analytics
  cohortAnalysis?: CohortData[];
  purchaseFrequency?: PurchaseFrequencyData;
  productAffinity?: ProductAffinityData;
  orderTiming?: OrderTimingData;
} 