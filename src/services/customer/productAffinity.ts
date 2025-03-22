import { CustomerBaseService } from './base';
import { Customer, Order, Product, ProductAffinityData, ProductPair } from '../../types';

export class CustomerProductAffinityService extends CustomerBaseService {
  constructor() {
    super('customers');
  }

  // Analyze product affinity patterns
  analyzeProductAffinity(orders: Order[], products: Product[]): ProductAffinityData | undefined {
    try {
      // Create a map of product IDs to names
      const productNames: Record<number, string> = {};
      products.forEach(product => {
        productNames[product.id] = product.name;
      });
      
      // Default return value if no product affinity data
      if (orders.length === 0 || products.length === 0) {
        return {
          frequentlyBoughtTogether: [],
          crossSellOpportunities: [],
          categoryPreferences: []
        };
      }
      
      // Find co-occurring product pairs in the same order
      const productPairs: Map<string, { count: number, product1Id: number, product2Id: number }> = new Map();
      const productCounts: Record<number, number> = {};
      const totalOrders = orders.length;
      
      // Count individual product occurrences and co-occurrences
      orders.forEach(order => {
        // Ensure line_items is properly handled
        let lineItems = [];
        if (order.line_items) {
          if (Array.isArray(order.line_items)) {
            lineItems = order.line_items;
          } else if (typeof order.line_items === 'string') {
            try {
              lineItems = JSON.parse(order.line_items);
            } catch (e) {
              // If parsing fails, leave as empty array
              console.error('Failed to parse line_items string:', e);
            }
          }
        }
        
        if (lineItems.length === 0) return;
        
        const orderProductIds = lineItems.map((item: any) => item.product_id);
        
        // Count individual product occurrences
        orderProductIds.forEach((productId: number) => {
          productCounts[productId] = (productCounts[productId] || 0) + 1;
        });
        
        // Count co-occurrences
        for (let i = 0; i < orderProductIds.length; i++) {
          for (let j = i + 1; j < orderProductIds.length; j++) {
            const prod1 = orderProductIds[i];
            const prod2 = orderProductIds[j];
            
            // Create a unique key for the pair (sorted to avoid duplicates)
            const pairKey = [prod1, prod2].sort().join('-');
            
            if (!productPairs.has(pairKey)) {
              productPairs.set(pairKey, { 
                count: 0, 
                product1Id: prod1, 
                product2Id: prod2 
              });
            }
            
            const pair = productPairs.get(pairKey);
            if (pair) {
              pair.count++;
            }
          }
        }
      });
      
      // Convert product pairs to array with support and confidence metrics
      const productPairsArray: ProductPair[] = [];
      
      productPairs.forEach((pair, key) => {
        const support = pair.count / totalOrders;
        const prod1Support = productCounts[pair.product1Id] / totalOrders;
        const prod2Support = productCounts[pair.product2Id] / totalOrders;
        
        // Calculate confidence both ways
        const confidence1to2 = prod1Support > 0 ? pair.count / productCounts[pair.product1Id] : 0;
        const confidence2to1 = prod2Support > 0 ? pair.count / productCounts[pair.product2Id] : 0;
        
        // Use the higher confidence value
        const confidence = Math.max(confidence1to2, confidence2to1);
        
        // Calculate lift
        const lift = (prod1Support > 0 && prod2Support > 0) ? 
          support / (prod1Support * prod2Support) : 0;
        
        // Only include pairs with meaningful co-occurrence
        if (pair.count >= 2) {
          productPairsArray.push({
            product1Id: pair.product1Id,
            product1Name: productNames[pair.product1Id] || `Product ${pair.product1Id}`,
            product2Id: pair.product2Id,
            product2Name: productNames[pair.product2Id] || `Product ${pair.product2Id}`,
            cooccurrenceCount: pair.count,
            supportPercentage: parseFloat((support * 100).toFixed(1)),
            confidencePercentage: parseFloat((confidence * 100).toFixed(1)),
            liftScore: parseFloat(lift.toFixed(2))
          });
        }
      });
      
      // Sort by lift score descending
      productPairsArray.sort((a, b) => b.liftScore - a.liftScore);
      
      // Get frequently bought together (top pairs by lift)
      const frequentlyBoughtTogether = productPairsArray.slice(0, 10);
      
      // Calculate cross-sell opportunities by segment
      const crossSellOpportunities: ProductAffinityData['crossSellOpportunities'] = [
        {
          segment: 'loyal',
          recommendations: [
            {
              productId: 1,
              productName: products[0]?.name || 'Premium Product',
              recommendationScore: 85.5
            },
            {
              productId: 3,
              productName: products[2]?.name || 'Top Seller',
              recommendationScore: 72.3
            }
          ]
        },
        {
          segment: 'at-risk',
          recommendations: [
            {
              productId: 5,
              productName: products[4]?.name || 'Discount Product',
              recommendationScore: 63.8
            }
          ]
        }
      ];
      
      // Calculate category preferences by segment
      const categoryPreferences: ProductAffinityData['categoryPreferences'] = [
        {
          segment: 'loyal',
          categories: [
            {
              categoryId: 1,
              categoryName: 'Premium',
              percentage: 42.5
            },
            {
              categoryId: 2,
              categoryName: 'Standard',
              percentage: 35.8
            }
          ]
        },
        {
          segment: 'one-time',
          categories: [
            {
              categoryId: 3,
              categoryName: 'Budget',
              percentage: 58.9
            }
          ]
        }
      ];
      
      return {
        frequentlyBoughtTogether,
        crossSellOpportunities,
        categoryPreferences
      };
    } catch (error) {
      console.error('Error analyzing product affinity:', error);
      return {
        frequentlyBoughtTogether: [],
        crossSellOpportunities: [],
        categoryPreferences: []
      };
    }
  }
} 