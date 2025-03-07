import React, { useState, useEffect } from 'react';
import { StockReconciliationSummary, StockMovement } from '../../types';
import { formatNZDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatters';
import { Download, Printer, X } from 'lucide-react';

interface ReconciliationReportProps {
  data: StockReconciliationSummary[];
  onClose: () => void;
}

const ReconciliationReport: React.FC<ReconciliationReportProps> = ({
  data,
  onClose
}) => {
  const [reportDate] = useState<Date>(new Date());
  
  // Calculate summary statistics
  const totalItems = data.length;
  const itemsWithDiscrepancy = data.filter(item => item.discrepancy !== 0).length;
  const discrepancyPercentage = totalItems > 0 
    ? Math.round((itemsWithDiscrepancy / totalItems) * 100) 
    : 0;
  
  // Calculate total values
  const totalExpectedStock = data.reduce((sum, item) => sum + item.expected_stock, 0);
  const totalActualStock = data.reduce((sum, item) => sum + item.actual_stock, 0);
  const totalDiscrepancy = data.reduce((sum, item) => sum + item.discrepancy, 0);
  
  // Sort data by discrepancy (largest absolute value first)
  const sortedData = [...data].sort((a, b) => 
    Math.abs(b.discrepancy) - Math.abs(a.discrepancy)
  );
  
  // Get top 10 items with largest discrepancies
  const topDiscrepancies = sortedData.slice(0, 10);
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleDownloadCSV = () => {
    // Create CSV content
    const headers = [
      'SKU',
      'Product Name',
      'Initial Stock',
      'Sales',
      'Adjustments',
      'Purchases',
      'Expected Stock',
      'Actual Stock',
      'Discrepancy',
      'Last Reconciled'
    ];
    
    const rows = data.map(item => [
      item.sku,
      item.product_name,
      item.initial_stock.toString(),
      item.total_sales.toString(),
      item.total_adjustments.toString(),
      item.total_purchases.toString(),
      item.expected_stock.toString(),
      item.actual_stock.toString(),
      item.discrepancy.toString(),
      item.last_reconciled ? formatNZDate(item.last_reconciled) : 'Never'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_reconciliation_report_${formatNZDate(reportDate).replace(/\//g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b print:border-b-black">
          <h2 className="text-xl font-semibold">Stock Reconciliation Report</h2>
          <div className="flex space-x-2 print:hidden">
            <button
              onClick={handlePrint}
              className="text-blue-600 hover:text-blue-800"
              title="Print Report"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={handleDownloadCSV}
              className="text-green-600 hover:text-green-800"
              title="Download CSV"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-grow p-4">
          <div className="mb-6 print:mb-4">
            <div className="text-sm text-gray-500 mb-1">Report Date</div>
            <div className="text-lg font-medium">{formatNZDate(reportDate)}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:grid-cols-3">
            <div className="bg-blue-50 p-4 rounded-lg print:border print:border-gray-300">
              <div className="text-sm text-gray-500 mb-1">Total Items</div>
              <div className="text-2xl font-bold">{totalItems}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg print:border print:border-gray-300">
              <div className="text-sm text-gray-500 mb-1">Items with Discrepancy</div>
              <div className="text-2xl font-bold">{itemsWithDiscrepancy} ({discrepancyPercentage}%)</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg print:border print:border-gray-300">
              <div className="text-sm text-gray-500 mb-1">Total Discrepancy</div>
              <div className="text-2xl font-bold">{totalDiscrepancy > 0 ? '+' : ''}{totalDiscrepancy}</div>
            </div>
          </div>
          
          <div className="mb-6 print:mb-4">
            <h3 className="text-lg font-semibold mb-2 print:text-base">Summary</h3>
            <table className="min-w-full border print:border-black">
              <thead className="bg-gray-100 print:bg-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b print:border-black">
                    Metric
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b print:border-black">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-b print:border-black">
                    Total Expected Stock
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right border-b print:border-black">
                    {totalExpectedStock}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-b print:border-black">
                    Total Actual Stock
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right border-b print:border-black">
                    {totalActualStock}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-b print:border-black">
                    Total Discrepancy
                  </td>
                  <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium text-right border-b print:border-black ${
                    totalDiscrepancy === 0 
                      ? 'text-green-600' 
                      : totalDiscrepancy > 0 
                        ? 'text-blue-600' 
                        : 'text-red-600'
                  }`}>
                    {totalDiscrepancy > 0 ? '+' : ''}{totalDiscrepancy}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mb-6 print:mb-4">
            <h3 className="text-lg font-semibold mb-2 print:text-base">Top Discrepancies</h3>
            <table className="min-w-full border print:border-black">
              <thead className="bg-gray-100 print:bg-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b print:border-black">
                    SKU
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b print:border-black">
                    Product
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b print:border-black">
                    Expected
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b print:border-black">
                    Actual
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b print:border-black">
                    Discrepancy
                  </th>
                </tr>
              </thead>
              <tbody>
                {topDiscrepancies.map((item) => (
                  <tr key={item.sku} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-b print:border-black">
                      {item.sku}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 border-b print:border-black">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right border-b print:border-black">
                      {item.expected_stock}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right border-b print:border-black">
                      {item.actual_stock}
                    </td>
                    <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium text-right border-b print:border-black ${
                      item.discrepancy === 0 
                        ? 'text-green-600' 
                        : item.discrepancy > 0 
                          ? 'text-blue-600' 
                          : 'text-red-600'
                    }`}>
                      {item.discrepancy > 0 ? '+' : ''}{item.discrepancy}
                    </td>
                  </tr>
                ))}
                {topDiscrepancies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500 border-b print:border-black">
                      No discrepancies found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="text-xs text-gray-500 mt-8 print:mt-4">
            <p>This report provides a snapshot of the current stock reconciliation status. It compares the expected stock levels (based on recorded stock movements) with the actual stock levels in the system.</p>
            <p className="mt-1">A positive discrepancy means there is more stock than expected, while a negative discrepancy means there is less stock than expected.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationReport; 