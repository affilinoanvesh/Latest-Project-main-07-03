#!/bin/bash

# Script to backup remote Supabase database
# This script will create a backup of your remote Supabase database and save it locally

# Set variables
BACKUP_DIR="./database_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="supabase_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting backup of remote Supabase database..."

# Get the connection details for the remote database
echo "Retrieving connection details from Supabase..."
REMOTE_DB_INFO=$(npx supabase db dump --linked --data-only --dry-run | grep -A 5 "export PG")

# Extract the connection details
PGHOST=$(echo "$REMOTE_DB_INFO" | grep "PGHOST" | cut -d'"' -f2)
PGPORT=$(echo "$REMOTE_DB_INFO" | grep "PGPORT" | cut -d'"' -f2)
PGUSER=$(echo "$REMOTE_DB_INFO" | grep "PGUSER" | cut -d'"' -f2)
PGPASSWORD=$(echo "$REMOTE_DB_INFO" | grep "PGPASSWORD" | cut -d'"' -f2)
PGDATABASE=$(echo "$REMOTE_DB_INFO" | grep "PGDATABASE" | cut -d'"' -f2)

if [ -z "$PGHOST" ] || [ -z "$PGPORT" ] || [ -z "$PGUSER" ] || [ -z "$PGPASSWORD" ] || [ -z "$PGDATABASE" ]; then
    echo "Error: Could not retrieve all database connection details."
    echo "Make sure you're logged in to Supabase CLI and have linked your project."
    exit 1
fi

echo "Remote database connection details:"
echo "Host: $PGHOST"
echo "Port: $PGPORT"
echo "User: $PGUSER"
echo "Database: $PGDATABASE"

# Create the backup
echo "Creating backup..."
export PGPASSWORD="$PGPASSWORD"
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -F p > "$BACKUP_DIR/$BACKUP_FILENAME"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully!"
    echo "Backup saved to: $BACKUP_DIR/$BACKUP_FILENAME"
    
    # Create a compressed version
    echo "Creating compressed backup..."
    gzip -c "$BACKUP_DIR/$BACKUP_FILENAME" > "$BACKUP_DIR/${BACKUP_FILENAME}.gz"
    echo "Compressed backup saved to: $BACKUP_DIR/${BACKUP_FILENAME}.gz"
else
    echo "Error: Backup failed."
    exit 1
fi

# List all backups
echo "Available backups:"
ls -lh "$BACKUP_DIR" 