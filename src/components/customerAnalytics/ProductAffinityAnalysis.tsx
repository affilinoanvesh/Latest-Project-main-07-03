import React, { useState } from 'react';
import { ProductAffinityData } from '../../types';

interface ProductAffinityAnalysisProps {
  affinityData: ProductAffinityData;
}

const ProductAffinityAnalysis: React.FC<ProductAffinityAnalysisProps> = ({ affinityData }) => {
  const [activeTab, setActiveTab] = useState<'frequent-pairs' | 'cross-sell' | 'category'>('frequent-pairs');
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  
  if (!affinityData) {
    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium mb-2">Product Affinity Analysis</h3>
        <div className="text-center py-8 text-gray-500">
          No product affinity data available
        </div>
      </div>
    );
  }

  // Set default selected segment if not set
  if (!selectedSegment && affinityData.crossSellOpportunities.length > 0) {
    setSelectedSegment(affinityData.crossSellOpportunities[0].segment);
  }
  
  // Format percentage for display
  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <h3 className="text-lg font-medium mb-4">Product Affinity Analysis</h3>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('frequent-pairs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'frequent-pairs' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Frequently Bought Together
          </button>
          <button
            onClick={() => setActiveTab('cross-sell')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cross-sell' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cross-Selling Opportunities
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'category' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Category Preferences
          </button>
        </nav>
      </div>
      
      {/* Frequent Pairs Tab */}
      {activeTab === 'frequent-pairs' && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-500">Products most commonly purchased together, ranked by co-occurrence frequency and lift score.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Pair
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Co-occurrence
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Support
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lift Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {affinityData.frequentlyBoughtTogether.map((pair, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{pair.product1Name}</span>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="ml-1">{pair.product2Name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {pair.cooccurrenceCount}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {formatPercentage(pair.supportPercentage / 100)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {formatPercentage(pair.confidencePercentage / 100)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span 
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${pair.liftScore >= 3 ? 'bg-green-100 text-green-800' : 
                            pair.liftScore >= 2 ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'}`}
                      >
                        {pair.liftScore.toFixed(1)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            <p><span className="font-medium">Support:</span> Percentage of orders containing both products</p>
            <p><span className="font-medium">Confidence:</span> Probability of Product 2 being purchased when Product 1 is purchased</p>
            <p><span className="font-medium">Lift Score:</span> How much more likely customers are to buy Product 2 when they buy Product 1, compared to random chance</p>
          </div>
        </>
      )}
      
      {/* Cross-Sell Tab */}
      {activeTab === 'cross-sell' && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Top product recommendations for each customer segment based on purchase patterns.</p>
            
            {/* Segment selector */}
            <div className="flex flex-wrap space-x-2 my-3">
              {affinityData.crossSellOpportunities.map((segment, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedSegment(segment.segment)}
                  className={`px-3 py-1 text-sm font-medium rounded-md my-1 ${
                    selectedSegment === segment.segment
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {segment.segment}
                </button>
              ))}
            </div>
          </div>
          
          {/* Product recommendations for selected segment */}
          {selectedSegment && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {affinityData.crossSellOpportunities
                .find(s => s.segment === selectedSegment)?.recommendations
                .map((rec, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-800">{rec.productName}</h4>
                      <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                        {Math.round(rec.recommendationScore * 100)}% match
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended based on previous purchase patterns of {selectedSegment}
                    </p>
                  </div>
                ))}
            </div>
          )}
          
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mt-4">
            <h4 className="text-sm font-medium text-amber-800 mb-2">Cross-Selling Tips</h4>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
              <li>Add "Frequently Bought Together" sections on product pages</li>
              <li>Create segment-specific bundles based on these recommendations</li>
              <li>Send personalized cross-sell emails with these product suggestions</li>
              <li>Train sales staff to suggest complementary products</li>
            </ul>
          </div>
        </>
      )}
      
      {/* Category Preferences Tab */}
      {activeTab === 'category' && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Product category preferences by customer segment.</p>
            
            {/* Segment selector */}
            <div className="flex flex-wrap space-x-2 my-3">
              {affinityData.categoryPreferences.map((segment, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedSegment(segment.segment)}
                  className={`px-3 py-1 text-sm font-medium rounded-md my-1 ${
                    selectedSegment === segment.segment
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {segment.segment}
                </button>
              ))}
            </div>
          </div>
          
          {/* Category preferences for selected segment */}
          {selectedSegment && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preference
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marketing Focus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {affinityData.categoryPreferences
                      .find(s => s.segment === selectedSegment)?.categories
                      .sort((a, b) => b.percentage - a.percentage)
                      .map((category, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 whitespace-nowrap font-medium">
                            {category.categoryName}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-indigo-600 h-2.5 rounded-full" 
                                  style={{ width: `${category.percentage}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-xs font-medium">{formatPercentage(category.percentage / 100)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {index === 0 ? 
                              'Primary focus - highlight new arrivals' : 
                              index === 1 ? 
                              'Secondary focus - cross-sell with primary' : 
                              category.percentage > 15 ? 
                              'Provide occasional updates' : 
                              'Low priority - introduce only if relevant'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Key Insights for {selectedSegment}</h4>
                <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                  {(() => {
                    const categories = affinityData.categoryPreferences
                      .find(s => s.segment === selectedSegment)?.categories || [];
                    const topCategory = categories.sort((a, b) => b.percentage - a.percentage)[0];
                    const leastCategory = categories.sort((a, b) => a.percentage - b.percentage)[0];
                    
                    return (
                      <>
                        <li>Strong preference for {topCategory?.categoryName} products ({formatPercentage(topCategory?.percentage / 100)})</li>
                        <li>Consider bundling {topCategory?.categoryName} with {categories[1]?.categoryName} products</li>
                        <li>Low interest in {leastCategory?.categoryName} ({formatPercentage(leastCategory?.percentage / 100)})</li>
                        <li>Focus marketing emails primarily on {topCategory?.categoryName} with secondary focus on {categories[1]?.categoryName}</li>
                      </>
                    );
                  })()}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductAffinityAnalysis; 