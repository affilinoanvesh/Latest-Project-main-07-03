import { SupplierPriceImport, SupplierPriceItem } from '../../types';
import { updateSupplierPrice } from './inventory';
import { supplierImportsService, supplierImportItemsService } from '../../services';

export async function saveSupplierImport(importData: SupplierPriceImport): Promise<number> {
  try {
    // Only include fields that exist in the actual database schema
    const dbData = {
      date: importData.date,
      supplier_name: importData.supplier_name
      // Note: filename, items_updated, and items_skipped don't exist in the database
    };
    
    const result = await supplierImportsService.add(dbData as any);
    return result.id!;
  } catch (error) {
    console.error('Error saving supplier import:', error);
    throw error;
  }
}

export async function getSupplierImports(): Promise<SupplierPriceImport[]> {
  try {
    const imports = await supplierImportsService.getAll();
    
    // Transform the data to match the expected interface
    return imports.map(imp => ({
      id: imp.id,
      date: imp.date,
      supplier_name: imp.supplier_name,
      // Add default values for fields that don't exist in the database
      filename: '',
      items_updated: 0,
      items_skipped: 0
    }));
  } catch (error) {
    console.error('Error getting supplier imports:', error);
    throw error;
  }
}

export async function saveSupplierImportItems(importId: number, items: SupplierPriceItem[]): Promise<void> {
  try {
    // Only include fields that exist in the actual database schema
    const itemsWithImportId = items.map(item => ({
      import_id: importId,
      sku: item.sku,
      supplier_price: item.supplier_price
      // Note: supplier_name and name don't exist in the database
    }));
    
    // Use batch insert for better performance
    for (const item of itemsWithImportId) {
      await supplierImportItemsService.add(item as any);
    }
  } catch (error) {
    console.error('Error saving supplier import items:', error);
    throw error;
  }
}

export async function getSupplierImportItems(importId: number): Promise<SupplierPriceItem[]> {
  try {
    const items = await supplierImportItemsService.getItemsByImportId(importId);
    
    // Transform the data to match the expected interface
    return items.map(item => ({
      id: item.id,
      import_id: item.import_id,
      sku: item.sku,
      // Use the supplier_price from the database if available, otherwise default to 0
      supplier_price: item.supplier_price || 0,
      // Add default values for fields that don't exist in the database
      name: '',
      supplier_name: ''
    }));
  } catch (error) {
    console.error('Error getting supplier import items:', error);
    throw error;
  }
}

export async function processSupplierPriceData(
  items: SupplierPriceItem[],
  supplierName: string,
  filename: string
): Promise<SupplierPriceImport> {
  try {
    // Create import record with only the fields that exist in the database
    const importRecord: SupplierPriceImport = {
      date: new Date(),
      supplier_name: supplierName,
      filename, // This is kept in memory but not saved to DB
      items_updated: 0, // This is kept in memory but not saved to DB
      items_skipped: 0 // This is kept in memory but not saved to DB
    };
    
    // Save import record
    let importId;
    try {
      importId = await saveSupplierImport(importRecord);
      console.log(`Created supplier import record with ID: ${importId}`);
    } catch (error) {
      console.error('Error saving supplier import record:', error);
      throw new Error(`Failed to save supplier import: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
    
    // Save import items
    try {
      await saveSupplierImportItems(importId, items);
      console.log(`Saved ${items.length} supplier import items for import ID: ${importId}`);
    } catch (error) {
      console.error('Error saving supplier import items:', error);
      throw new Error(`Failed to save supplier import items: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
    
    // Update supplier prices in inventory
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const item of items) {
      try {
        const updated = await updateSupplierPrice(item.sku, item.supplier_price, supplierName);
        if (updated) {
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error updating supplier price for SKU ${item.sku}:`, error);
        skippedCount++;
      }
    }
    
    // Update the counts (in memory only)
    importRecord.items_updated = updatedCount;
    importRecord.items_skipped = skippedCount;
    
    return {
      ...importRecord,
      id: importId
    };
  } catch (error) {
    console.error('Error processing supplier price data:', error);
    throw new Error(`Error processing supplier data: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  }
}