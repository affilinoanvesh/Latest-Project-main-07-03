import React from 'react';

interface ExpenseSummaryProps {
  totalExpenses: number;
  expenseCount: number;
}

const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({
  totalExpenses,
  expenseCount
}) => {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(value);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Expenses Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Number of Expenses</p>
          <p className="text-2xl font-bold">{expenseCount}</p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseSummary;