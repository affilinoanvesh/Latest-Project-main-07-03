import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../services/reports/utils';

interface SalesReportProps {
  data: any[];
}

const SalesReport: React.FC<SalesReportProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'revenue-chart', 'sales-table']));
  
  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpandedSections = new Set(expandedSections);
    if (newExpandedSections.has(section)) {
      newExpandedSections.delete(section);
    } else {
      newExpandedSections.add(section);
    }
    setExpandedSections(newExpandedSections);
  };

  // Calculate totals
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.orderCount, 0);
  const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  return (
    <>
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('overview')}
        >
          <h2 className="text-lg font-semibold text-gray-800">Sales Overview</h2>
          {expandedSections.has('overview') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('overview') && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-700 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className={`${totalProfit >= 0 ? 'bg-teal-50 border-teal-100' : 'bg-red-50 border-red-100'} p-4 rounded-lg border`}>
                <p className={`text-sm font-medium ${totalProfit >= 0 ? 'text-teal-700' : 'text-red-700'}`}>Total Profit</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-teal-800' : 'text-red-800'}`}>
                  {formatCurrency(totalProfit)}
                </p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <p className="text-sm text-indigo-700 font-medium">Total Orders</p>
                <p className="text-2xl font-bold text-indigo-800">
                  {totalOrders}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <p className="text-sm text-purple-700 font-medium">Average Order Value</p>
                <p className="text-2xl font-bold text-purple-800">
                  {formatCurrency(averageOrderValue)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mt-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('revenue-chart')}
        >
          <h2 className="text-lg font-semibold text-gray-800">Revenue Trend</h2>
          {expandedSections.has('revenue-chart') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('revenue-chart') && (
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#0d9488" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mt-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('orders-chart')}
        >
          <h2 className="text-lg font-semibold text-gray-800">Order Metrics</h2>
          {expandedSections.has('orders-chart') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('orders-chart') && (
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => {
                  if (name === 'averageOrderValue') return formatCurrency(value as number);
                  return value;
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="orderCount" name="Order Count" fill="#4f46e5" />
                <Line yAxisId="right" type="monotone" dataKey="averageOrderValue" name="Avg Order Value" stroke="#8b5cf6" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mt-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('sales-table')}
        >
          <h2 className="text-lg font-semibold text-gray-800">Sales Data</h2>
          {expandedSections.has('sales-table') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('sales-table') && (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Avg Order Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      {item.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {formatCurrency(item.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={item.profit >= 0 ? 'text-teal-600' : 'text-red-600'}>
                        {formatCurrency(item.profit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                      {item.orderCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                      {formatCurrency(item.averageOrderValue)}
                    </td>
                  </tr>
                ))}
                
                {/* Totals row */}
                <tr className="bg-gray-100 font-medium">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                    {formatCurrency(totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <span className={totalProfit >= 0 ? 'text-teal-700' : 'text-red-700'}>
                      {formatCurrency(totalProfit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-700">
                    {totalOrders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-700">
                    {formatCurrency(averageOrderValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default SalesReport;