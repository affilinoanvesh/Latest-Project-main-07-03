import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { RFMData } from '../../types';

interface RFMAnalysisProps {
  rfmData: RFMData;
}

type ActiveTab = 'segments' | 'recency' | 'frequency' | 'monetary';

// RFM score explanations
const scoreExplanations = {
  recency: {
    1: 'Least recent customers - Those who haven\'t purchased in a long time',
    2: 'Somewhat inactive customers',
    3: 'Moderately active customers',
    4: 'Recently active customers',
    5: 'Most recent customers - Those who purchased very recently'
  },
  frequency: {
    1: 'Least frequent customers - Those who rarely make purchases',
    2: 'Occasional shoppers',
    3: 'Regular shoppers',
    4: 'Frequent shoppers',
    5: 'Most frequent customers - Those who purchase very often'
  },
  monetary: {
    1: 'Lowest spending customers',
    2: 'Below average spending customers',
    3: 'Average spending customers',
    4: 'Above average spending customers',
    5: 'Highest spending customers - Those who spend the most'
  }
};

const RFMAnalysis: React.FC<RFMAnalysisProps> = ({ rfmData }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('segments');
  
  // Prepare data for the selected tab
  const getActiveData = () => {
    switch (activeTab) {
      case 'segments':
        return rfmData.rfmDistribution;
      case 'recency':
        return rfmData.recencyDistribution;
      case 'frequency':
        return rfmData.frequencyDistribution;
      case 'monetary':
        return rfmData.monetaryDistribution;
      default:
        return [];
    }
  };
  
  // Get chart title
  const getChartTitle = () => {
    switch (activeTab) {
      case 'segments':
        return 'RFM Segments';
      case 'recency':
        return 'Recency Distribution';
      case 'frequency':
        return 'Frequency Distribution';
      case 'monetary':
        return 'Monetary Distribution';
      default:
        return '';
    }
  };
  
  // Get chart description
  const getChartDescription = () => {
    switch (activeTab) {
      case 'segments':
        return 'Distribution of customers across RFM segments';
      case 'recency':
        return 'Higher scores indicate more recent purchases';
      case 'frequency':
        return 'Higher scores indicate more frequent purchases';
      case 'monetary':
        return 'Higher scores indicate higher spending customers';
      default:
        return '';
    }
  };
  
  // Get active data for current tab
  const activeData = getActiveData();
  
  // Check if we have data
  const hasData = activeData.length > 0;

  // Get explanations for current tab
  const getScoreExplanations = () => {
    if (activeTab === 'segments') return null;
    return scoreExplanations[activeTab as keyof typeof scoreExplanations];
  };

  // Custom tooltip for RFM scores
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const scoreNum = parseInt(label.split(' ')[1]);
    const explanations = getScoreExplanations();
    
    return (
      <div className="bg-white p-2 border shadow-sm rounded-md text-sm">
        <p className="font-medium">{label}</p>
        <p>Count: {payload[0].value}</p>
        {explanations && (
          <p className="text-gray-600 max-w-xs">{explanations[scoreNum as keyof typeof explanations]}</p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <h3 className="text-lg font-medium mb-1">{getChartTitle()}</h3>
      <p className="text-sm text-gray-500 mb-2">{getChartDescription()}</p>
      
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('segments')}
          className={`px-4 py-2 ${activeTab === 'segments' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
        >
          Segments
        </button>
        <button
          onClick={() => setActiveTab('recency')}
          className={`px-4 py-2 ${activeTab === 'recency' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
        >
          Recency
        </button>
        <button
          onClick={() => setActiveTab('frequency')}
          className={`px-4 py-2 ${activeTab === 'frequency' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
        >
          Frequency
        </button>
        <button
          onClick={() => setActiveTab('monetary')}
          className={`px-4 py-2 ${activeTab === 'monetary' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
        >
          Monetary
        </button>
      </div>
      
      {/* Chart */}
      <div className="h-72">
        {!hasData ? (
          <div className="flex justify-center items-center h-full text-gray-500">
            No data available for {activeTab}
          </div>
        ) : activeTab === 'segments' ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="label"
                label={({ label, percent }) => 
                  label && label.length > 10 
                    ? `${label.substring(0, 10)}...: ${(percent * 100).toFixed(0)}%`
                    : `${label || 'Unknown'}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {activeData.map((segment, index) => (
                  <Cell key={`cell-${index}`} fill={segment.color || `#${Math.floor(Math.random()*16777215).toString(16)}`} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), 'Count']}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : activeTab === 'recency' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeData}
              margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="label" 
                angle={-45} 
                textAnchor="end" 
                height={50} 
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        ) : activeTab === 'frequency' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={activeData}
              margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="label" 
                angle={-45} 
                textAnchor="end" 
                height={50} 
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" fill="#10b981" stroke="#059669" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={activeData}
              margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="label" 
                angle={-45} 
                textAnchor="end" 
                height={50} 
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ stroke: '#d97706', strokeWidth: 2, r: 4 }}
                activeDot={{ stroke: '#b45309', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Score explanations for the active tab */}
      {activeTab !== 'segments' && (
        <div className="mt-4 border-t pt-3">
          <h4 className="font-medium text-sm mb-2">What the {activeTab} scores mean:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            {Object.entries(getScoreExplanations() || {}).map(([score, explanation]) => (
              <div key={score} className="border rounded-md p-2">
                <span className="inline-block w-6 h-6 rounded-full mr-2 text-center text-white"
                  style={{ 
                    backgroundColor: 
                      score === '1' ? '#ef4444' : 
                      score === '2' ? '#f59e0b' : 
                      score === '3' ? '#3b82f6' : 
                      score === '4' ? '#10b981' : 
                      '#8b5cf6'
                  }}
                >
                  {score}
                </span>
                <span>{explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* RFM Explanation */}
      <div className="mt-4 text-sm text-gray-600 border-t pt-3">
        <p className="font-medium mb-1">What is RFM Analysis?</p>
        <p>
          RFM (Recency, Frequency, Monetary) analysis segments customers based on their purchasing behavior:
        </p>
        <ul className="list-disc pl-5 mt-1">
          <li><b>Recency</b>: How recently a customer made a purchase</li>
          <li><b>Frequency</b>: How often they purchase</li>
          <li><b>Monetary</b>: How much they spend</li>
        </ul>
      </div>
    </div>
  );
};

export default RFMAnalysis;