import React from 'react';
import { Customer } from '../../types';

interface CustomerListProps {
  title: string;
  customers: Customer[];
  valueLabel: string;
  valueType: 'currency' | 'number';
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const CustomerList: React.FC<CustomerListProps> = ({
  title,
  customers,
  valueLabel,
  valueType
}) => {
  // Format value based on type
  const formatValue = (value: number): string => {
    if (valueType === 'currency') {
      return formatCurrency(value);
    }
    return value.toLocaleString();
  };

  // Get value based on value label
  const getValue = (customer: Customer): number => {
    if (valueLabel === 'Total Spent') {
      return customer.total_spent;
    }
    if (valueLabel === 'Order Count') {
      return customer.order_count;
    }
    if (valueLabel === 'Average Order Value') {
      return customer.average_order_value;
    }
    return 0;
  };

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      
      {customers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No customer data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {valueLabel}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {customer.first_name} {customer.last_name}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                    {customer.email || 'N/A'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right font-medium">
                    {formatValue(getValue(customer))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
