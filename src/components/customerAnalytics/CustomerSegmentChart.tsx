import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CustomerSegment } from '../../types';

interface CustomerSegmentChartProps {
  segments: CustomerSegment[];
}

const CustomerSegmentChart: React.FC<CustomerSegmentChartProps> = ({ segments }) => {
  // Sort segments by count (descending)
  const sortedSegments = [...segments].sort((a, b) => b.count - a.count);

  // Format segment names for better display
  const formattedSegments = sortedSegments.map(segment => ({
    ...segment,
    name: segment.name.charAt(0).toUpperCase() + segment.name.slice(1)
  }));

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <h3 className="text-lg font-medium mb-4">Customer Segments</h3>
      
      {formattedSegments.length === 0 ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          No segment data available
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={formattedSegments}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {formattedSegments.map((segment, index) => (
                  <Cell key={`cell-${index}`} fill={segment.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), 'Count']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {formattedSegments.map(segment => (
          <div key={segment.name} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: segment.color }}
            ></div>
            <div className="flex justify-between w-full">
              <span>{segment.name}:</span>
              <span className="font-medium">{segment.count.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerSegmentChart;