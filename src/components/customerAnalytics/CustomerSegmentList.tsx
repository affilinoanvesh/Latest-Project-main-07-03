import React, { useState } from 'react';
import { Customer } from '../../types';

interface CustomerSegmentListProps {
  customersBySegment: Record<string, Customer[]>;
  segmentLabels: Record<string, string>;
  segmentColors: Record<string, string>;
  onSelectCustomer?: (customer: Customer) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Enhanced segment descriptions for the tooltip
const segmentDescriptions: Record<string, string> = {
  'new': 'Customers who created an account within the last 30 days. May or may not have placed orders.',
  'active': 'Customers who have ordered recently and show ongoing engagement.',
  'at-risk': 'Previously active customers who haven\'t ordered recently and may need attention.',
  'lost': 'Customers who haven\'t ordered in a long time or registered over 30 days ago with no orders.',
  'loyal': 'Customers who order frequently and have recent purchases.',
  'high-value': 'Big spenders who have higher than average order values.',
  'one-time': 'Made a single purchase but haven\'t returned yet.',
  'occasional': 'Order infrequently but tend to return eventually.',
  'dormant': 'Previously active customers who haven\'t ordered in 6+ months.',
  'vip': 'Top 10% of customers by total spend and frequency.'
};

const CustomerSegmentList: React.FC<CustomerSegmentListProps> = ({
  customersBySegment,
  segmentLabels,
  segmentColors,
  onSelectCustomer
}) => {
  const [activeSegment, setActiveSegment] = useState<string>(Object.keys(customersBySegment)[0] || 'loyal');
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  
  const segments = Object.keys(customersBySegment).filter(segment => 
    customersBySegment[segment] && customersBySegment[segment].length > 0
  );

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }
  };

  // Helper function to get color for segment
  const getSegmentColor = (segment: string): string => {
    return segmentColors[segment] || 'gray';
  };

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold">Customers by Segment</h3>
        <button 
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {showExplanation ? 'Hide Explanation' : 'What do these segments mean?'}
        </button>
      </div>
      
      {/* Segment Explanation */}
      {showExplanation && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4 text-sm">
          <h4 className="font-medium text-indigo-800 mb-2">Customer Segments Explained</h4>
          <p className="mb-2">Customers are grouped into segments based on their purchasing behavior and account activity:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(segmentDescriptions)
              .filter(([segment]) => segments.includes(segment) || ['loyal', 'active', 'at-risk', 'lost', 'new'].includes(segment))
              .map(([segment, description]) => (
                <div key={segment} className="flex items-start">
                  <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-medium mr-2 mt-0.5`} style={{backgroundColor: `${segmentColors[segment] || '#64748b'}20`, color: segmentColors[segment] || '#64748b'}}>
                    {segment[0].toUpperCase()}
                  </span>
                  <div>
                    <span className="font-medium">{segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')}:</span> {description}
                  </div>
                </div>
            ))}
          </div>
          <p className="mt-3 text-indigo-800 font-medium">Notes:</p>
          <ul className="list-disc pl-5 mt-1">
            <li>Customers with 0 orders who registered more than 30 days ago are classified as "Lost"</li>
            <li>New signups with no orders yet are still in the "New" segment for their first 30 days</li>
            <li>Segmentation is based on purchase history, frequency, recency, and spending patterns</li>
          </ul>
        </div>
      )}
      
      {/* Segment Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {segments.map(segment => (
            <button
              key={segment}
              onClick={() => setActiveSegment(segment)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeSegment === segment 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={activeSegment === segment ? {borderBottomColor: segmentColors[segment], color: segmentColors[segment]} : {}}
            >
              {segmentLabels[segment]} ({customersBySegment[segment].length})
            </button>
          ))}
        </nav>
      </div>
      
      {/* Customer Table */}
      {customersBySegment[activeSegment]?.length > 0 ? (
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
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Order
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Order
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customersBySegment[activeSegment].map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {customer.first_name} {customer.last_name}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                    {customer.email}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-medium">
                    {formatCurrency(customer.total_spent)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    {customer.order_count}
                    {customer.order_count === 0 && (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        No orders
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    {customer.order_count > 0 
                      ? formatCurrency(customer.total_spent / customer.order_count)
                      : formatCurrency(0)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {customer.last_order_date 
                      ? new Date(customer.last_order_date).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {customer.order_count > 0 && (
                      <button
                        onClick={() => handleSelectCustomer(customer)}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        View Orders
                      </button>
                    )}
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

export default CustomerSegmentList; 