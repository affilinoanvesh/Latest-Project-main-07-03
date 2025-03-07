import Papa from 'papaparse';
import { addStockMovement } from '../../db/operations/stockReconciliation';

interface StockImportRow {
  sku: string;
  quantity: string;
  notes?: string;
}

/**
 * Process a CSV file for initial stock import
 * Expected CSV format:
 * sku,quantity,notes
 * ABC123,10,Initial stock import
 * XYZ456,5,From warehouse count
 */
export async function processStockImportCsv(file: File): Promise<{
  success: number;
  failed: number;
  errors: Array<{ sku: string; error: string }>;
}> {
  return new Promise((resolve, reject) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ sku: string; error: string }>
    };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          const rows = result.data as StockImportRow[];
          
          // Process each row
          for (const row of rows) {
            try {
              // Validate required fields
              if (!row.sku) {
                results.failed++;
                results.errors.push({ sku: row.sku || 'Unknown', error: 'SKU is required' });
                continue;
              }
              
              const quantity = parseInt(row.quantity);
              if (isNaN(quantity) || quantity <= 0) {
                results.failed++;
                results.errors.push({ sku: row.sku, error: 'Quantity must be a positive number' });
                continue;
              }
              
              // Add stock movement
              await addStockMovement({
                sku: row.sku,
                movement_date: new Date(),
                quantity,
                movement_type: 'initial',
                notes: row.notes || 'Imported from CSV'
              });
              
              results.success++;
            } catch (error: any) {
              results.failed++;
              results.errors.push({ sku: row.sku || 'Unknown', error: error.message || 'Unknown error' });
            }
          }
          
          resolve(results);
        } catch (error: any) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Generate a sample CSV template for stock import
 */
export function generateStockImportTemplate(): string {
  const headers = ['sku', 'quantity', 'notes'];
  const sampleData = [
    ['ABC123', '10', 'Initial stock count'],
    ['XYZ456', '5', 'From warehouse inventory']
  ];
  
  const csv = [
    headers.join(','),
    ...sampleData.map(row => row.join(','))
  ].join('\n');
  
  return csv;
}

/**
 * Download a sample CSV template for stock import
 */
export function downloadStockImportTemplate(): void {
  const csv = generateStockImportTemplate();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stock_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 