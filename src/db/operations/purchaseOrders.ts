import { PurchaseOrder, PurchaseOrderItem, ProductExpiry } from '../../types';
import { purchaseOrdersService, purchaseOrderItemsService, productExpiryService, productsService, productVariationsService } from '../../services';
import { deleteProductExpiryByBatchAndSku } from './expiry';

// Create a new purchase order
export const createPurchaseOrder = async (
  purchaseOrder: PurchaseOrder,
  items: PurchaseOrderItem[]
): Promise<number> => {
  try {
    // Add the purchase order
    const newPO = await purchaseOrdersService.add({
      ...purchaseOrder,
      created_at: new Date()
    });
    
    const id = newPO.id!;
    
    // Add all items with the purchase order ID
    for (const item of items) {
      await purchaseOrderItemsService.add({
        ...item,
        purchase_order_id: id
      });
    }
    
    // Add expiry tracking for items with expiry dates
    for (const item of items) {
      if (item.expiry_date && item.batch_number) {
        await createExpiryRecord(item, id);
      }
    }
    
    return id;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    throw error;
  }
};

// Get all purchase orders
export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  return await purchaseOrdersService.getAll();
};

// Get purchase orders with filtering
export const getPurchaseOrdersFiltered = async (
  filters?: {
    startDate?: Date;
    endDate?: Date;
    supplier?: string;
    status?: string;
  }
): Promise<PurchaseOrder[]> => {
  try {
    let purchaseOrders = await purchaseOrdersService.getAll();
    
    // Apply filters
    if (filters) {
      if (filters.startDate) {
        purchaseOrders = purchaseOrders.filter(po => 
          new Date(po.date) >= filters.startDate!
        );
      }
      
      if (filters.endDate) {
        purchaseOrders = purchaseOrders.filter(po => 
          new Date(po.date) <= filters.endDate!
        );
      }
      
      if (filters.supplier) {
        purchaseOrders = purchaseOrders.filter(po => 
          po.supplier_name.toLowerCase().includes(filters.supplier!.toLowerCase())
        );
      }
      
      if (filters.status) {
        purchaseOrders = purchaseOrders.filter(po => 
          po.status === filters.status
        );
      }
    }
    
    return purchaseOrders;
  } catch (error) {
    console.error('Error getting filtered purchase orders:', error);
    throw error;
  }
};

// Get a purchase order with its items
export const getPurchaseOrderWithItems = async (id: number): Promise<{
  purchaseOrder: PurchaseOrder;
  items: PurchaseOrderItem[];
} | null> => {
  try {
    const purchaseOrder = await purchaseOrdersService.getPurchaseOrderWithItemsById(id);
    
    if (!purchaseOrder) {
      return null;
    }
    
    return {
      purchaseOrder,
      items: purchaseOrder.items || []
    };
  } catch (error) {
    console.error('Error getting purchase order with items:', error);
    throw error;
  }
};

// Update a purchase order
export const updatePurchaseOrder = async (
  id: number,
  purchaseOrder: Partial<PurchaseOrder>,
  items?: PurchaseOrderItem[]
): Promise<void> => {
  try {
    // Update the purchase order
    await purchaseOrdersService.update(id, {
      ...purchaseOrder,
      updated_at: new Date()
    });
    
    // If items are provided, update them
    if (items) {
      // Get existing items
      const existingItems = await purchaseOrderItemsService.getItemsByPurchaseOrderId(id);
      
      // Delete existing items
      for (const item of existingItems) {
        await purchaseOrderItemsService.delete(item.id!);
      }
      
      // Add new items
      for (const item of items) {
        await purchaseOrderItemsService.add({
          ...item,
          purchase_order_id: id
        });
        
        // Add expiry tracking for items with expiry dates
        if (item.expiry_date && item.batch_number) {
          await createExpiryRecord(item, id);
        }
      }
    }
  } catch (error) {
    console.error('Error updating purchase order:', error);
    throw error;
  }
};

// Helper function to create expiry records
async function createExpiryRecord(item: PurchaseOrderItem, purchaseOrderId: number): Promise<void> {
  try {
    // Create expiry tracking record
    const expiryData: Omit<ProductExpiry, 'id' | 'created_at' | 'updated_at'> = {
      product_id: 0, // Will be updated if product is found
      sku: item.sku,
      product_name: item.product_name,
      expiry_date: item.expiry_date!,
      batch_number: item.batch_number!,
      quantity: item.quantity,
      notes: `Added from Purchase Order #${purchaseOrderId}`
    };
    
    // Try to find the product ID by SKU
    const product = await productsService.getProductBySku(item.sku);
    if (product) {
      expiryData.product_id = product.id;
    } else {
      // Check if it's a variation
      const variation = await productVariationsService.getVariationBySku(item.sku);
      if (variation) {
        expiryData.product_id = variation.parent_id;
        expiryData.variation_id = variation.id;
      }
    }
    
    // Add the expiry record
    await productExpiryService.add({
      ...expiryData,
      created_at: new Date(),
      updated_at: new Date()
    });
  } catch (error) {
    console.error('Error creating expiry record:', error);
    // Don't throw, just log the error to avoid blocking the purchase order creation
  }
}

// Delete a purchase order
export const deletePurchaseOrder = async (id: number): Promise<void> => {
  try {
    // Get items to delete related expiry records
    const items = await purchaseOrderItemsService.getItemsByPurchaseOrderId(id);
    
    // Delete associated expiry records
    for (const item of items) {
      if (item.batch_number && item.expiry_date) {
        try {
          await deleteProductExpiryByBatchAndSku(item.batch_number, item.sku);
        } catch (error) {
          console.error(`Error deleting expiry records for item ${item.sku}:`, error);
          // Continue with other items even if one fails
        }
      }
    }
    
    // Delete the purchase order (this will cascade delete the items in Supabase)
    await purchaseOrdersService.delete(id);
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    throw error;
  }
};

// Get purchase order items by SKU
export const getPurchaseOrderItemsBySku = async (sku: string): Promise<PurchaseOrderItem[]> => {
  return await purchaseOrderItemsService.getItemsBySku(sku);
};

// Get total purchase amount for a date range
export const getTotalPurchaseAmount = async (startDate: Date, endDate: Date): Promise<number> => {
  try {
    const purchaseOrders = await getPurchaseOrdersFiltered({
      startDate,
      endDate
    });
    
    return purchaseOrders.reduce((total, po) => total + po.total_amount, 0);
  } catch (error) {
    console.error('Error getting total purchase amount:', error);
    throw error;
  }
}; 