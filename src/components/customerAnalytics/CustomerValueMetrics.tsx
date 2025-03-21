import React from 'react';
import { DollarSign, TrendingUp, ShoppingCart, CreditCard } from 'lucide-react';

interface CustomerValueMetricsProps {
  averageOrderValue: number;
  customerLifetimeValue: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const CustomerValueMetrics: React.FC<CustomerValueMetricsProps> = ({
  averageOrderValue,
  customerLifetimeValue
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <h3 className="text-lg font-medium mb-4">Customer Value Metrics</h3>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="flex items-start">
          <div className="bg-blue-100 p-2 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-gray-600">Average Order Value</h4>
            <p className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</p>
            <p className="text-xs text-gray-500 mt-1">
              The average amount spent per order
            </p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-gray-600">Customer Lifetime Value</h4>
            <p className="text-2xl font-bold">{formatCurrency(customerLifetimeValue)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Predicted revenue from an average customer
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Understanding These Metrics</h4>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start">
            <div className="min-w-4 mr-2">•</div>
            <div>
              <span className="font-medium">Average Order Value (AOV)</span>: Total revenue divided by the number of orders. Increase AOV with upselling, cross-selling, and bundles.
            </div>
          </li>
          <li className="flex items-start">
            <div className="min-w-4 mr-2">•</div>
            <div>
              <span className="font-medium">Customer Lifetime Value (CLV)</span>: The total revenue expected from a customer during their relationship with your business. Increase CLV by improving retention and order frequency.
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CustomerValueMetrics; 