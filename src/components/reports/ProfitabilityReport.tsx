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
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('profitability-overview')}
        >
          <h2 className="text-lg font-semibold text-gray-800">Profitability Overview</h2>
          {expandedSections.has('profitability-overview') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {expandedSections.has('profitability-overview') && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-700 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-100">
                <p className="text-sm text-teal-700 font-medium">Total Net Profit</p>
                <p className={`text-2xl font-bold ${totalNetProfit >= 0 ? 'text-teal-800' : 'text-red-600'}`}>
                  {formatCurrency(totalNetProfit)}
                </p>
              </div>
              <div className={`${averageProfitMargin >= 0 ? 'bg-teal-50 border-teal-100' : 'bg-red-50 border-red-100'} p-4 rounded-lg border`}>
                <p className={`text-sm font-medium ${averageProfitMargin >= 0 ? 'text-teal-700' : 'text-red-700'}`}>Average Profit Margin</p>
                <p className={`text-2xl font-bold ${averageProfitMargin >= 0 ? 'text-teal-800' : 'text-red-800'}`}>
                  {formatPercentage(averageProfitMargin)}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700 font-medium">Total Cost of Goods</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(totalCost)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700 font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mt-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('profitability-chart')}
        >
          <h2 className="text-lg font-semibold text-gray-800">Profitability Trend</h2>
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
                <Bar dataKey="cost" name="Cost" stackId="a" fill="#64748b" />
                <Bar dataKey="expenses" name="Expenses" stackId="a" fill="#94a3b8" />
                <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#0d9488" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mt-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('profit-margin-chart')}
        >
          <h2 className="text-lg font-semibold text-gray-800">Profit Margin Trend</h2>
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
                <Line type="monotone" dataKey="profitMargin" name="Profit Margin %" stroke="#0d9488" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mt-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('profitability-table')}
        >
          <h2 className="text-lg font-semibold text-gray-800">Profitability Data</h2>
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
                    Gross Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Expenses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Net Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Margin
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
                      {formatCurrency(item.revenue !== undefined ? item.revenue : 
                                     (item.totalRevenue !== undefined ? item.totalRevenue : 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {formatCurrency(item.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={item.grossProfit >= 0 ? 'text-teal-600' : 'text-red-600'}>
                        {formatCurrency(item.grossProfit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {formatCurrency(item.expenses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={item.netProfit >= 0 ? 'text-teal-600' : 'text-red-600'}>
                        {formatCurrency(item.netProfit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.profitMargin < 0 ? 'bg-red-100 text-red-800' :
                        item.profitMargin >= 20 ? 'bg-teal-100 text-teal-800' : 
                        item.profitMargin >= 10 ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {formatPercentage(item.profitMargin)}
                      </span>
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
                    <span className={totalGrossProfit >= 0 ? 'text-teal-700' : 'text-red-700'}>
                      {formatCurrency(totalGrossProfit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                    {formatCurrency(totalExpenses)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <span className={totalNetProfit >= 0 ? 'text-teal-700' : 'text-red-700'}>
                      {formatCurrency(totalNetProfit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <span className={averageProfitMargin >= 0 ? 'text-teal-700' : 'text-red-700'}>
                      {formatPercentage(averageProfitMargin)}
                    </span>
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