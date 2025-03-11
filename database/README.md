# Database Structure

This directory contains SQL files for the database structure and operations.

## Directory Structure

- **schema/**: Contains table definitions and initial schema setup
  - `01_base_tables.sql`: Base table definitions including stock movements, reconciliation summaries, and app settings

- **functions/**: Contains database functions and triggers
  - `01_reconciliation_functions.sql`: All functions related to stock reconciliation, including update, populate, and trigger functions

- **original_files/**: Contains the original fragmented SQL files (for reference only)

## Usage

These SQL files should be executed in the following order:

1. Schema files first
2. Function files next

For a new installation, you can use:

```bash
# Connect to your database
psql -U your_username -d your_database

# Execute schema files
\i database/schema/01_base_tables.sql

# Execute function files
\i database/functions/01_reconciliation_functions.sql

# Initialize reconciliation data (optional)
SELECT populate_all_reconciliation_summaries();
```

## Notes

The SQL files have been consolidated from multiple smaller files into logical units. This makes it easier to understand the database structure and ensures that related components are kept together. 