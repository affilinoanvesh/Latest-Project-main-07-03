import React from 'react';
import { AdditionalRevenue, AdditionalRevenueCategory } from '../../types';

interface RevenueSummaryProps {
  totalRevenue: number;
  revenueCount: number;
  categories: AdditionalRevenueCategory[];
  revenues: AdditionalRevenue[];
}

const RevenueSummary: React.FC<RevenueSummaryProps> = ({
  totalRevenue,
  revenueCount,
  categories,
  revenues
}) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  };
  
  // Calculate revenue by category
  const revenueByCategory = categories.map(category => {
    const categoryRevenues = revenues.filter(revenue => revenue.category === category.name);
    const total = categoryRevenues.reduce((sum, revenue) => sum + revenue.amount, 0);
    const percentage = totalRevenue > 0 ? (total / totalRevenue) * 100 : 0;
    
    return {
      name: category.name,
      color: category.color || '#64748b',
      amount: total,
      percentage
    };
  }).filter(item => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  
  // Calculate revenue by period type
  const oneTimeRevenue = revenues.filter(revenue => !revenue.period)
    .reduce((sum, revenue) => sum + revenue.amount, 0);
  
  const dailyRevenue = revenues.filter(revenue => revenue.period === 'daily')
    .reduce((sum, revenue) => sum + revenue.amount, 0);
  
  const weeklyRevenue = revenues.filter(revenue => revenue.period === 'weekly')
    .reduce((sum, revenue) => sum + revenue.amount, 0);
  
  const monthlyRevenue = revenues.filter(revenue => revenue.period === 'monthly')
    .reduce((sum, revenue) => sum + revenue.amount, 0);
  
  const yearlyRevenue = revenues.filter(revenue => revenue.period === 'yearly')
    .reduce((sum, revenue) => sum + revenue.amount, 0);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-lg font-semibold mb-4">Revenue Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Number of Entries</p>
          <p className="text-2xl font-bold">{revenueCount}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Average per Entry</p>
          <p className="text-2xl font-bold">
            {formatCurrency(revenueCount > 0 ? totalRevenue / revenueCount : 0)}
          </p>
        </div>
      </div>
      
      {revenueByCategory.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3">Revenue by Category</h3>
          <div className="space-y-2">
            {revenueByCategory.map((category, index) => (
              <div key={index} className="flex items-center">
                <span 
                  className="inline-block w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm font-medium flex-grow">{category.name}</span>
                <span className="text-sm text-gray-500 mr-2">{formatCurrency(category.amount)}</span>
                <span className="text-sm text-gray-500 w-16 text-right">
                  {category.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <h3 className="text-md font-medium mb-3">Revenue by Period Type</h3>
        <div className="space-y-2">
          {oneTimeRevenue > 0 && (
            <div className="flex items-center">
              <span className="text-sm font-medium flex-grow">One-time</span>
              <span className="text-sm text-gray-500 mr-2">{formatCurrency(oneTimeRevenue)}</span>
              <span className="text-sm text-gray-500 w-16 text-right">
                {totalRevenue > 0 ? ((oneTimeRevenue / totalRevenue) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          )}
          
          {dailyRevenue > 0 && (
            <div className="flex items-center">
              <span className="text-sm font-medium flex-grow">Daily</span>
              <span className="text-sm text-gray-500 mr-2">{formatCurrency(dailyRevenue)}</span>
              <span className="text-sm text-gray-500 w-16 text-right">
                {totalRevenue > 0 ? ((dailyRevenue / totalRevenue) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          )}
          
          {weeklyRevenue > 0 && (
            <div className="flex items-center">
              <span className="text-sm font-medium flex-grow">Weekly</span>
              <span className="text-sm text-gray-500 mr-2">{formatCurrency(weeklyRevenue)}</span>
              <span className="text-sm text-gray-500 w-16 text-right">
                {totalRevenue > 0 ? ((weeklyRevenue / totalRevenue) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          )}
          
          {monthlyRevenue > 0 && (
            <div className="flex items-center">
              <span className="text-sm font-medium flex-grow">Monthly</span>
              <span className="text-sm text-gray-500 mr-2">{formatCurrency(monthlyRevenue)}</span>
              <span className="text-sm text-gray-500 w-16 text-right">
                {totalRevenue > 0 ? ((monthlyRevenue / totalRevenue) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          )}
          
          {yearlyRevenue > 0 && (
            <div className="flex items-center">
              <span className="text-sm font-medium flex-grow">Yearly</span>
              <span className="text-sm text-gray-500 mr-2">{formatCurrency(yearlyRevenue)}</span>
              <span className="text-sm text-gray-500 w-16 text-right">
                {totalRevenue > 0 ? ((yearlyRevenue / totalRevenue) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          )}
          
          {oneTimeRevenue === 0 && dailyRevenue === 0 && weeklyRevenue === 0 && 
           monthlyRevenue === 0 && yearlyRevenue === 0 && (
            <div className="text-sm text-gray-500">No revenue data available.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueSummary; 