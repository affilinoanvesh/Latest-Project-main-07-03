import { parse, isValid } from 'date-fns';
import { ProductExpiry } from '../../types';
import { getTotalQuantityBySku } from '../../db/operations/expiry';
import { productsService, productVariationsService } from '../../services';

interface ExpiryImportRow {
  SKU: string;
  'Expiry Date': string;
  Quantity: string;
  'Batch Number'?: string;
  Notes?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: Array<Omit<ProductExpiry, 'id' | 'created_at' | 'updated_at'>>;
}

/**
 * Parse a CSV file containing product expiry data
 */
export const parseExpiryCSV = async (file: File): Promise<ExpiryImportRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        if (!csv) {
          reject(new Error('Failed to read CSV file'));
          return;
        }
        
        // Split the CSV into lines
        const lines = csv.split('\n');
        if (lines.length < 2) {
          reject(new Error('CSV file is empty or invalid'));
          return;
        }
        
        // Get the header row
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Check for required headers
        const requiredHeaders = ['SKU', 'Expiry Date', 'Quantity'];
        for (const header of requiredHeaders) {
          if (!headers.includes(header)) {
            reject(new Error(`CSV file is missing required header: ${header}`));
            return;
          }
        }
        
        // Parse each data row
        const data: ExpiryImportRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines
          
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          
          // Map values to headers
          headers.forEach((header, index) => {
            if (index < values.length) {
              row[header] = values[index];
            }
          });
          
          data.push(row as ExpiryImportRow);
        }
        
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Validate expiry data from a CSV import
 */
export const validateExpiryData = async (data: ExpiryImportRow[]): Promise<ValidationResult> => {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    data: []
  };
  
  if (data.length === 0) {
    result.errors.push('No data to validate. Please check your CSV file.');
    result.valid = false;
    return result;
  }
  
  // Get all products and variations for validation
  try {
    const products = await productsService.getAll();
    const variations = await productVariationsService.getAll();
    
    // Create maps for quick lookups
    const productMap = new Map(products.map(p => [p.sku, p]));
    const variationMap = new Map(variations.map(v => [v.sku, v]));
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because of 0-indexing and header row
      
      // Validate SKU
      if (!row.SKU) {
        result.errors.push(`Row ${rowNum}: SKU is required`);
        result.valid = false;
        continue;
      }
      
      // Check if SKU exists in products or variations
      const product = productMap.get(row.SKU);
      const variation = variationMap.get(row.SKU);
      
      if (!product && !variation) {
        result.errors.push(`Row ${rowNum}: SKU "${row.SKU}" not found in products or variations`);
        result.valid = false;
        continue;
      }
      
      // Validate expiry date
      if (!row['Expiry Date']) {
        result.errors.push(`Row ${rowNum}: Expiry Date is required`);
        result.valid = false;
        continue;
      }
      
      // Try to parse the date in various formats
      let expiryDate: Date | null = null;
      
      // Try DD/MM/YYYY format
      expiryDate = parse(row['Expiry Date'], 'dd/MM/yyyy', new Date());
      if (!isValid(expiryDate)) {
        // Try MM/DD/YYYY format
        expiryDate = parse(row['Expiry Date'], 'MM/dd/yyyy', new Date());
      }
      if (!isValid(expiryDate)) {
        // Try YYYY-MM-DD format
        expiryDate = parse(row['Expiry Date'], 'yyyy-MM-dd', new Date());
      }
      
      if (!isValid(expiryDate)) {
        result.errors.push(`Row ${rowNum}: Invalid Expiry Date format. Use DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD`);
        result.valid = false;
        continue;
      }
      
      // Validate quantity
      if (!row.Quantity) {
        result.errors.push(`Row ${rowNum}: Quantity is required`);
        result.valid = false;
        continue;
      }
      
      const quantity = parseFloat(row.Quantity);
      if (isNaN(quantity) || quantity <= 0) {
        result.errors.push(`Row ${rowNum}: Quantity must be a positive number`);
        result.valid = false;
        continue;
      }
      
      // Check if quantity exceeds available stock
      const totalStock = product ? (product.stock_quantity || 0) : (variation ? (variation.stock_quantity || 0) : 0);
      const totalExpiry = await getTotalQuantityBySku(row.SKU);
      
      if (quantity > (totalStock - totalExpiry)) {
        result.warnings.push(`Row ${rowNum}: Quantity (${quantity}) exceeds available stock (${totalStock - totalExpiry})`);
      }
      
      // Create expiry record
      const expiryRecord: Omit<ProductExpiry, 'id' | 'created_at' | 'updated_at'> = {
        product_id: product ? product.id : (variation ? variation.parent_id : 0),
        variation_id: variation ? variation.id : undefined,
        sku: row.SKU,
        expiry_date: expiryDate,
        quantity: quantity,
        batch_number: row['Batch Number'] || undefined,
        notes: row.Notes || undefined
      };
      
      result.data.push(expiryRecord);
    }
    
    return result;
  } catch (error: any) {
    console.error('Error during validation:', error);
    result.errors.push(`Validation error: ${error.message || 'Unknown error'}`);
    result.valid = false;
    return result;
  }
};

/**
 * Generate a template CSV for expiry imports
 */
export const generateExpiryTemplate = (): string => {
  const headers = ['SKU', 'Expiry Date', 'Quantity', 'Batch Number', 'Notes'];
  const example = ['SKU123', '31/12/2023', '10', 'BATCH001', 'Example note'];
  
  return [
    headers.join(','),
    example.join(',')
  ].join('\n');
};

/**
 * Download a template CSV for expiry imports
 */
export const downloadExpiryTemplate = (): void => {
  const template = generateExpiryTemplate();
  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'expiry_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}; 