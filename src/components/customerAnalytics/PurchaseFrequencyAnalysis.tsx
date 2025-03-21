import React, { useState } from 'react';
import { PurchaseFrequencyData } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend
} from 'recharts';

interface PurchaseFrequencyAnalysisProps {
  frequencyData: PurchaseFrequencyData;
}

const PurchaseFrequencyAnalysis: React.FC<PurchaseFrequencyAnalysisProps> = ({ frequencyData }) => {
  const [viewMode, setViewMode] = useState<'distribution' | 'segments'>('distribution');
  
  if (!frequencyData) {
    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium mb-2">Purchase Frequency Analysis</h3>
        <div className="text-center py-8 text-gray-500">
          No purchase frequency data available
        </div>
      </div>
    );
  }

  // Format numbers for display
  const formatDays = (days: number) => {
    if (days === 1) return '1 day';
    return `${days} days`;
  };
  
  const formatPercentage = (value: number) => `${Math.round(value)}%`;
  
  // Prepare segment data for chart
  const segmentChartData = frequencyData.segmentFrequency.map(segment => ({
    name: segment.segment,
    averageDays: segment.averageDays,
    nextPurchase: segment.nextPurchasePrediction
  }));
  
  // Find the optimal engagement times
  const campaignRecommendations = frequencyData.recommendedCampaignDays.map(days => ({
    days,
    label: formatDays(days)
  }));

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Purchase Frequency Analysis</h3>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              viewMode === 'distribution' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setViewMode('distribution')}
          >
            Time Between Purchases
          </button>
          <button
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              viewMode === 'segments' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setViewMode('segments')}
          >
            Segment Comparison
          </button>
        </div>
      </div>
      
      {viewMode === 'distribution' ? (
        <div className="space-y-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={frequencyData.daysBetweenDistribution}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="label" 
                  angle={-45} 
                  textAnchor="end"
                  tick={{ fontSize: 12 }}
                  height={60}
                />
                <YAxis 
                  tickFormatter={formatPercentage}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Percentage of Orders', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Percentage']}
                  labelFormatter={(label) => `Time between purchases: ${label}`}
                />
                <Bar dataKey="percentage" fill="#6366f1" />
                
                {/* Add markers for recommended campaign days */}
                {frequencyData.recommendedCampaignDays.map((days, index) => (
                  <ReferenceLine 
                    key={index}
                    x={frequencyData.daysBetweenDistribution.findIndex(d => d.label.includes(days.toString()))}
                    stroke="#ef4444" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    isFront={true}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-800 mb-2">Recommended Re-engagement Timing</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {campaignRecommendations.map((rec, index) => (
                <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-amber-200">
                  <span className="text-amber-600 text-lg font-bold">{rec.label}</span>
                  <p className="text-xs text-gray-600 mt-1">
                    {index === 0 ? 'First reminder for recent customers' : 
                     index === 1 ? 'Follow-up for moderate inactivity' : 
                     'Re-engagement for dormant customers'}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Based on your customers' purchasing patterns, these are the optimal times to send re-engagement campaigns.
              Red dashed lines on the chart show these recommended timings.
            </p>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Average time between purchases: <span className="font-medium">{formatDays(frequencyData.averageDaysBetween)}</span></p>
            <p>Median time between purchases: <span className="font-medium">{formatDays(frequencyData.medianDaysBetween)}</span></p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={segmentChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis 
                  label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatDays(value), '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="averageDays" 
                  name="Avg. Days Between Purchases" 
                  stroke="#6366f1" 
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="nextPurchase" 
                  name="Predicted Next Purchase" 
                  stroke="#10b981" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Segment
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg. Days Between Purchases
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Predicted Next Purchase
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Re-engagement Strategy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {frequencyData.segmentFrequency.map((segment, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 whitespace-nowrap font-medium">
                      {segment.segment}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {formatDays(segment.averageDays)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {segment.nextPurchasePrediction > 0 ? 
                        (segment.nextPurchasePrediction < 2 ? 'Within 24 hours' : `In ~${formatDays(segment.nextPurchasePrediction)}`) : 
                        'Unpredictable'}
                    </td>
                    <td className="px-3 py-2">
                      {segment.averageDays < 14 ? 
                        'Frequent buyer - focus on cross-selling and increasing basket size' : 
                        segment.averageDays < 45 ? 
                        'Regular customer - send personalized product recommendations' : 
                        'Infrequent buyer - offer incentives to increase purchase frequency'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseFrequencyAnalysis; 