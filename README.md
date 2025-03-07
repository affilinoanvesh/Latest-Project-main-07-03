# WooCommerce PnL Tracker

A profit and loss tracking application for WooCommerce stores.

## Database Migration: Dexie.js to Supabase

This project has been migrated from using Dexie.js (IndexedDB) to Supabase for data storage. This provides several benefits:

- **Data Persistence**: Your data is stored in the cloud, not just in your browser
- **Multi-device Access**: Access your data from any device
- **Real-time Updates**: Get real-time updates when data changes
- **Authentication**: Built-in authentication system
- **Row-level Security**: Fine-grained access control

## Database Migrations

### Adding Supplier Price Column

The application now stores supplier prices in the database. To add the necessary column, run the SQL script:

```sql
-- Add supplier_price column to supplier_import_items table if it doesn't exist
ALTER TABLE supplier_import_items 
ADD COLUMN IF NOT EXISTS supplier_price NUMERIC;
```

You can run this SQL in the Supabase dashboard SQL Editor or using the Supabase CLI:

```bash
supabase db execute --file scripts/add_supplier_price_column.sql
```

This will add a `supplier_price` column to the `supplier_import_items` table, allowing supplier prices to be stored and retrieved correctly.

## Getting Started with Supabase

### Local Development

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Start the local Supabase instance:
   ```bash
   supabase start
   ```

3. Copy the environment variables from the output and update your `.env` file:
   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. Run the application:
   ```bash
   npm run dev
   ```

5. Navigate to the Database Migration page to migrate your data from Dexie.js to Supabase.

### Production Deployment

1. Create a Supabase project at [https://supabase.com](https://supabase.com)

2. Get your project URL and API keys from the Supabase dashboard

3. Update your environment variables with the production values

4. Deploy your application

## Database Schema

The database schema is defined in `supabase/migrations/20240306_create_schema.sql`. This file creates all the necessary tables and indexes for the application.

## Services

The application uses a service layer to interact with Supabase. Each entity has its own service file in the `src/services` directory:

- `productsService.ts`: Products and product variations
- `ordersService.ts`: Orders
- `inventoryService.ts`: Inventory
- `expensesService.ts`: Expenses, expense categories, and expense imports
- `credentialsService.ts`: API credentials
- `syncService.ts`: Synchronization records
- `supplierService.ts`: Suppliers, supplier imports, and supplier import items
- `expiryService.ts`: Product expiry
- `purchaseOrdersService.ts`: Purchase orders and purchase order items
- `additionalRevenueService.ts`: Additional revenue and revenue categories
- `overheadService.ts`: Overhead costs

## Migration Tool

The application includes a migration tool to help you migrate your data from Dexie.js to Supabase. To use it:

1. Make sure your Supabase instance is running
2. Navigate to the Database Migration page
3. Click the "Start Migration" button
4. Wait for the migration to complete

## License

MIT