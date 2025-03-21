import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AcquisitionSource {
  source: string;
  count: number;
  percentage: number;
}

interface AcquisitionSourceChartProps {
  sources: AcquisitionSource[];
}

const AcquisitionSourceChart: React.FC<AcquisitionSourceChartProps> = ({ sources }) => {
  // Capitalize source names and limit to top 6 for better display
  const formattedSources = sources
    .slice(0, 6)
    .map(source => ({
      ...source,
      source: source.source.charAt(0).toUpperCase() + source.source.slice(1)
    }));

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <h3 className="text-lg font-medium mb-4">Acquisition Sources</h3>
      
      {formattedSources.length === 0 ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          No acquisition data available
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedSources}
              margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="source" 
                angle={-45} 
                textAnchor="end" 
                height={60}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), 'Customers']}
              />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium mb-1">Acquisition Sources</p>
        <p>
          These sources show where your customers are coming from. Use this data to
          optimize your marketing spend and focus on channels that bring in the most
          customers.
        </p>
        
        {formattedSources.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {formattedSources.map(source => (
              <div key={source.source} className="flex justify-between">
                <span>{source.source}:</span>
                <span className="font-medium">{source.percentage}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AcquisitionSourceChart; 