import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Define props interface
interface AdditionalRevenueReportProps {
  categoryData: {
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  timeData: {
    period: string;
    value: number;
  }[];
}

// Define colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const AdditionalRevenueReport: React.FC<AdditionalRevenueReportProps> = ({ categoryData, timeData }) => {
  const [showCategoryDetails, setShowCategoryDetails] = useState(true);
  const [showTimeDetails, setShowTimeDetails] = useState(true);
  
  // Calculate totals
  const totalAmount = categoryData.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = categoryData.reduce((sum, item) => sum + item.count, 0);
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border rounded shadow">
          <p className="font-bold">{data.category}</p>
          <p>Amount: {formatCurrency(data.amount)}</p>
          <p>Count: {data.count}</p>
          <p>Percentage: {data.percentage.toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Additional Revenue Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <h3 className="text-sm font-medium text-gray-500">Total Entries</h3>
            <p className="text-2xl font-bold">{totalCount}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <h3 className="text-sm font-medium text-gray-500">Categories</h3>
            <p className="text-2xl font-bold">{categoryData.length}</p>
          </div>
        </div>
      </div>
      
      {/* Category Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div 
          className="flex justify-between items-center mb-4 cursor-pointer"
          onClick={() => setShowCategoryDetails(!showCategoryDetails)}
        >
          <h2 className="text-xl font-bold">Revenue by Category</h2>
          {showCategoryDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {showCategoryDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                    label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Category Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryData.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.percentage.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Time Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div 
          className="flex justify-between items-center mb-4 cursor-pointer"
          onClick={() => setShowTimeDetails(!showTimeDetails)}
        >
          <h2 className="text-xl font-bold">Revenue Over Time</h2>
          {showTimeDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {showTimeDetails && (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timeData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="value" name="Revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdditionalRevenueReport; 