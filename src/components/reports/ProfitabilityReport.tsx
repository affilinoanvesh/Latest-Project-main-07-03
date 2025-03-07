import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../services/reports/utils';

interface ProfitabilityReportProps {
  data: any[];
}

const ProfitabilityReport: React.FC<ProfitabilityReportProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['profitability-overview', 'profitability-chart', 'profitability-table']));
  
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
  const totalRevenue = data.reduce((sum, item) => {
    // Check for both revenue and totalRevenue properties for backward compatibility
    const itemRevenue = typeof item.revenue !== 'undefined' ? item.revenue : 
                        (typeof item.totalRevenue !== 'undefined' ? item.totalRevenue : 0);
    return sum + (isNaN(itemRevenue) ? 0 : itemRevenue);
  }, 0);
  
  const totalCost = data.reduce((sum, item) => {
    const cost = item.cost || 0;
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);
  
  const totalExpenses = data.reduce((sum, item) => {
    const expenses = item.expenses || 0;
    return sum + (isNaN(expenses) ? 0 : expenses);
  }, 0);
  
  const totalGrossProfit = data.reduce((sum, item) => {
    const grossProfit = item.grossProfit || 0;
    return sum + (isNaN(grossProfit) ? 0 : grossProfit);
  }, 0);
  
  const totalNetProfit = data.reduce((sum, item) => {
    const netProfit = item.netProfit || 0;
    return sum + (isNaN(netProfit) ? 0 : netProfit);
  }, 0);
  
  const averageProfitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
  
  return (
    <>
      <div className="bg-white shadow rounded-lg p-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('profitability-overview')}
        >
          <h2 className="text-lg font-semibold">Profitability Overview</h2>
          {expandedSections.has('profitability-overview') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('profitability-overview') && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total Net Profit</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalNetProfit)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Average Profit Margin</p>
                <p className="text-2xl font-bold">
                  {formatPercentage(averageProfitMargin)}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total Cost of Goods</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalCost)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('profitability-chart')}
        >
          <h2 className="text-lg font-semibold">Profitability Trend</h2>
          {expandedSections.has('profitability-chart') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('profitability-chart') && (
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
                <Bar dataKey="cost" name="Cost" stackId="a" fill="#10b981" />
                <Bar dataKey="expenses" name="Expenses" stackId="a" fill="#f59e0b" />
                <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#8b5cf6" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('profit-margin-chart')}
        >
          <h2 className="text-lg font-semibold">Profit Margin Trend</h2>
          {expandedSections.has('profit-margin-chart') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('profit-margin-chart') && (
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value, name) => {
                  if (name === 'profitMargin') return formatPercentage(value as number);
                  return formatCurrency(value as number);
                }} />
                <Legend />
                <Line type="monotone" dataKey="profitMargin" name="Profit Margin %" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('profitability-table')}
        >
          <h2 className="text-lg font-semibold">Profitability Data</h2>
          {expandedSections.has('profitability-table') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('profitability-table') && (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expenses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.revenue !== undefined ? item.revenue : 
                                     (item.totalRevenue !== undefined ? item.totalRevenue : 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.grossProfit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.expenses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.netProfit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPercentage(item.profitMargin)}
                    </td>
                  </tr>
                ))}
                
                {/* Totals row */}
                <tr className="bg-gray-50 font-medium">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(totalGrossProfit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(totalExpenses)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(totalNetProfit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPercentage(averageProfitMargin)}
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

export default ProfitabilityReport;