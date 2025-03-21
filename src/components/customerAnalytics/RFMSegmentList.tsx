import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Customer } from '../../types';

interface RFMSegmentListProps {
  segmentColors: Record<string, string>;
}

interface CustomerWithRFM extends Customer {
  rfm_segment?: string;
  recency_score?: number;
  frequency_score?: number;
  monetary_score?: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// RFM segment descriptions for the tooltip
const rfmSegmentDescriptions: Record<string, string> = {
  'Champions': 'Customers who bought recently, buy often, and spend the most.',
  'Loyal Customers': 'Customers who bought recently, buy often, and spend above average.',
  'Potential Loyalists': 'Recent customers with average frequency and monetary values.',
  'New Customers': 'Bought most recently, but not often.',
  'Promising': 'Recent shoppers who haven\'t spent much.',
  'Needs Attention': 'Above average recency, frequency and monetary values.',
  'About To Sleep': 'Below average recency, frequency, and monetary values.',
  'At Risk': 'Customers who purchased often but haven\'t returned for a long time.',
  'Cant Lose Them': 'Made big purchases and purchased often but haven\'t returned lately.',
  'Hibernating': 'Customers who last purchased long time ago and have made few purchases.'
};

const RFMSegmentList: React.FC<RFMSegmentListProps> = ({
  segmentColors
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rfmSegments, setRfmSegments] = useState<string[]>([]);
  const [activeSegment, setActiveSegment] = useState<string>('');
  const [customersByRFM, setCustomersByRFM] = useState<Record<string, CustomerWithRFM[]>>({});
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Load RFM data on component mount
  useEffect(() => {
    const loadRFMData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get RFM data and join with customers directly
        const { data: rfmData, error: rfmError } = await supabase
          .from('customer_rfm')
          .select('*')
          .order('calculation_date', { ascending: false });
          
        if (rfmError) {
          throw rfmError;
        }

        // Get the most recent calculation date
        if (!rfmData || rfmData.length === 0) {
          setError('No RFM data available');
          setLoading(false);
          return;
        }

        const latestDate = rfmData[0].calculation_date;
        const latestRFMData = rfmData.filter(r => r.calculation_date === latestDate);
        
        // Get all customers
        const { data: customers, error: customersError } = await supabase
          .from('customers')
          .select('*');
          
        if (customersError) {
          throw customersError;
        }

        if (!customers || customers.length === 0) {
          setError('No customer data available');
          setLoading(false);
          return;
        }

        // Create a map of customers by ID for easier lookup
        const customersMap = customers.reduce((map, customer) => {
          map[customer.id] = customer;
          return map;
        }, {} as Record<number, Customer>);
        
        // Combine RFM data with customer data
        const combinedData: CustomerWithRFM[] = latestRFMData.map(rfm => {
          const customer = customersMap[rfm.customer_id];
          if (!customer) return null;
          
          return {
            ...customer,
            rfm_segment: rfm.rfm_segment,
            recency_score: rfm.recency_score,
            frequency_score: rfm.frequency_score,
            monetary_score: rfm.monetary_score
          };
        }).filter(Boolean) as CustomerWithRFM[];
        
        // Group by RFM segment
        const segmentedData: Record<string, CustomerWithRFM[]> = {};
        const uniqueSegments: string[] = [];
        
        combinedData.forEach(customer => {
          if (!customer.rfm_segment) return;
          
          if (!segmentedData[customer.rfm_segment]) {
            segmentedData[customer.rfm_segment] = [];
            uniqueSegments.push(customer.rfm_segment);
          }
          
          segmentedData[customer.rfm_segment].push(customer);
        });
        
        // Sort customers by total_spent within each segment
        Object.keys(segmentedData).forEach(segment => {
          segmentedData[segment].sort((a, b) => b.total_spent - a.total_spent);
        });
        
        setRfmSegments(uniqueSegments);
        setCustomersByRFM(segmentedData);
        
        if (uniqueSegments.length > 0) {
          setActiveSegment(uniqueSegments[0]);
        }
      } catch (err) {
        console.error('Error loading RFM data:', err);
        setError('Failed to load RFM data');
      } finally {
        setLoading(false);
      }
    };
    
    loadRFMData();
  }, []);

  // Get color for segment
  const getSegmentColor = (segment: string): string => {
    const colors: Record<string, string> = {
      'Champions': 'emerald',
      'Loyal Customers': 'indigo',
      'Potential Loyalists': 'blue',
      'At Risk': 'amber',
      'Cant Lose Them': 'red',
      'New Customers': 'green',
      'Promising': 'cyan',
      'Needs Attention': 'orange',
      'About To Sleep': 'pink',
      'Hibernating': 'gray'
    };
    
    return colors[segment] || 'gray';
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium mb-4">Customers by RFM Segment</h3>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium mb-4">Customers by RFM Segment</h3>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Customers by RFM Segment</h3>
        <button 
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {showExplanation ? 'Hide Explanation' : 'What is RFM?'}
        </button>
      </div>
      
      {/* RFM Explanation */}
      {showExplanation && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4 text-sm">
          <h4 className="font-medium text-indigo-800 mb-2">RFM Analysis Explained</h4>
          <p className="mb-2">RFM analysis segments customers based on three key metrics:</p>
          <ul className="list-disc pl-5 mb-3 space-y-1">
            <li><span className="font-medium">Recency (R)</span>: How recently a customer made a purchase. Higher scores mean more recent purchases.</li>
            <li><span className="font-medium">Frequency (F)</span>: How often a customer makes purchases. Higher scores mean more frequent purchases.</li>
            <li><span className="font-medium">Monetary (M)</span>: How much money a customer spends. Higher scores mean higher average order values.</li>
          </ul>
          <p>Each customer receives a score from 1-5 for each metric, with 5 being the best. These scores are combined to categorize customers into meaningful segments for targeted marketing.</p>
          
          <h4 className="font-medium text-indigo-800 mt-3 mb-2">Segment Descriptions:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(rfmSegmentDescriptions).map(([segment, description]) => (
              <div key={segment} className="flex items-start">
                <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full bg-${getSegmentColor(segment)}-100 text-${getSegmentColor(segment)}-800 text-xs font-medium mr-2 mt-0.5`}>
                  {segment[0]}
                </span>
                <div>
                  <span className="font-medium">{segment}:</span> {description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Segment Tabs */}
      <div className="flex flex-wrap border-b mb-4 gap-1">
        {rfmSegments.map(segment => (
          <button
            key={segment}
            onClick={() => setActiveSegment(segment)}
            className={`px-3 py-1 text-sm font-medium rounded-t-lg -mb-px ${
              activeSegment === segment 
                ? `border-b-2 border-${getSegmentColor(segment)}-500 text-${getSegmentColor(segment)}-700`
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {segment} ({customersByRFM[segment]?.length || 0})
          </button>
        ))}
      </div>
      
      {/* Customer Table */}
      {customersByRFM[activeSegment]?.length > 0 ? (
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  R
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  F
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  M
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Order
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customersByRFM[activeSegment].map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {customer.first_name} {customer.last_name}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                    {customer.email || 'N/A'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-${getScoreColor(customer.recency_score || 0)}-100 text-${getScoreColor(customer.recency_score || 0)}-800 text-xs font-medium`}>
                      {customer.recency_score || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-${getScoreColor(customer.frequency_score || 0)}-100 text-${getScoreColor(customer.frequency_score || 0)}-800 text-xs font-medium`}>
                      {customer.frequency_score || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-${getScoreColor(customer.monetary_score || 0)}-100 text-${getScoreColor(customer.monetary_score || 0)}-800 text-xs font-medium`}>
                      {customer.monetary_score || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-medium">
                    {formatCurrency(customer.total_spent)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    {customer.order_count}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No customers in this segment
        </div>
      )}
    </div>
  );
};

// Helper function to get color for score
const getScoreColor = (score: number): string => {
  switch (score) {
    case 5: return 'emerald';
    case 4: return 'blue';
    case 3: return 'indigo';
    case 2: return 'amber';
    case 1: return 'red';
    default: return 'gray';
  }
};

export default RFMSegmentList;