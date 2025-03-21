import React, { useState } from 'react';
import { CohortData } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CustomerCohortAnalysisProps {
  cohortData: CohortData[];
}

const CustomerCohortAnalysis: React.FC<CustomerCohortAnalysisProps> = ({ cohortData }) => {
  const [viewMode, setViewMode] = useState<'retention' | 'value'>('retention');
  
  if (!cohortData || cohortData.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium mb-2">Customer Cohort Analysis</h3>
        <div className="text-center py-8 text-gray-500">
          No cohort data available
        </div>
      </div>
    );
  }

  // Find the maximum number of months to display
  const maxMonths = Math.max(...cohortData.map(cohort => cohort.retentionRates.length));
  
  // Format retention rate as percentage
  const formatRetention = (value: number) => `${Math.round(value * 100)}%`;
  
  // Format value in dollars
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Get color for retention rate cell
  const getRetentionColor = (rate: number) => {
    if (rate >= 0.8) return 'bg-emerald-600 text-white';
    if (rate >= 0.6) return 'bg-emerald-500 text-white';
    if (rate >= 0.4) return 'bg-emerald-400 text-white';
    if (rate >= 0.3) return 'bg-emerald-300';
    if (rate >= 0.2) return 'bg-emerald-200';
    if (rate >= 0.1) return 'bg-emerald-100';
    return 'bg-gray-100';
  };
  
  // Get color for value cell
  const getValueColor = (value: number, maxValue: number) => {
    const percentage = value / maxValue;
    if (percentage >= 0.8) return 'bg-blue-600 text-white';
    if (percentage >= 0.6) return 'bg-blue-500 text-white';
    if (percentage >= 0.4) return 'bg-blue-400 text-white';
    if (percentage >= 0.3) return 'bg-blue-300';
    if (percentage >= 0.2) return 'bg-blue-200';
    if (percentage >= 0.1) return 'bg-blue-100';
    return 'bg-gray-100';
  };
  
  // Find the maximum value for color scaling
  const maxCohortValue = Math.max(...cohortData.flatMap(c => c.retentionRates.map(r => r.value)));
  
  // Sort cohorts by date (most recent first)
  const sortedCohorts = [...cohortData].sort((a, b) => {
    return new Date(b.month).getTime() - new Date(a.month).getTime();
  });
  
  // Prepare data for the value chart
  const valueChartData = sortedCohorts.map(cohort => ({
    name: cohort.month,
    value: cohort.averageCustomerValue,
    initialCustomers: cohort.initialCustomers
  }));

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Customer Cohort Analysis</h3>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              viewMode === 'retention' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setViewMode('retention')}
          >
            Retention Rates
          </button>
          <button
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              viewMode === 'value' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setViewMode('value')}
          >
            Customer Value
          </button>
        </div>
      </div>
      
      {viewMode === 'retention' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Cohort
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                {Array.from({ length: maxMonths }).map((_, i) => (
                  <th key={i} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedCohorts.map((cohort, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 whitespace-nowrap font-medium">
                    {cohort.month}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {cohort.initialCustomers}
                  </td>
                  {Array.from({ length: maxMonths }).map((_, i) => {
                    const rate = cohort.retentionRates[i]?.rate || 0;
                    return (
                      <td 
                        key={i} 
                        className={`px-3 py-2 text-center ${getRetentionColor(rate)}`}
                        title={`${cohort.retentionRates[i]?.customers || 0} customers`}
                      >
                        {cohort.retentionRates[i] ? formatRetention(rate) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-4 text-xs text-gray-500">
            <p>This heatmap shows customer retention rates by cohort (acquisition month).</p>
            <p>Month 0 is the acquisition month, subsequent months show what percentage of customers remained active.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={valueChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  tick={{ fontSize: 12 }}
                  height={60}
                />
                <YAxis 
                  tickFormatter={(value) => formatValue(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatValue(value), 'Avg. Customer Value']}
                  labelFormatter={(label) => `Cohort: ${label}`}
                />
                <Bar dataKey="value" fill="#6366f1">
                  {valueChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.initialCustomers > 10 ? '#6366f1' : '#d1d5db'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>This chart shows the average customer value by cohort (acquisition month).</p>
            <p>Higher bars indicate cohorts with greater long-term value. Light gray bars represent cohorts with fewer than 10 customers.</p>
            <p className="mt-2 font-medium">Key Insight: {(() => {
              const bestCohort = [...valueChartData].sort((a, b) => b.value - a.value)[0];
              const worstCohort = [...valueChartData].sort((a, b) => a.value - b.value)[0];
              return `Customers acquired in ${bestCohort.name} have ${(bestCohort.value / worstCohort.value).toFixed(1)}x higher value than those from ${worstCohort.name}.`;
            })()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCohortAnalysis; 