#!/bin/bash

# Script to restore remote Supabase database from a backup
# This script will restore your remote Supabase database from a local backup file

# Set variables
BACKUP_DIR="./database_backups"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory does not exist."
    exit 1
fi

# List available backups
echo "Available backups:"
ls -lh "$BACKUP_DIR" | grep -v ".gz$"

# Ask user to select a backup file
echo ""
read -p "Enter the name of the backup file to restore (without path): " BACKUP_FILENAME

# Check if backup file exists
if [ ! -f "$BACKUP_DIR/$BACKUP_FILENAME" ]; then
    # Check if it's a compressed file
    if [ -f "$BACKUP_DIR/$BACKUP_FILENAME.gz" ]; then
        echo "Found compressed backup. Decompressing..."
        gunzip -c "$BACKUP_DIR/$BACKUP_FILENAME.gz" > "$BACKUP_DIR/$BACKUP_FILENAME"
    else
        echo "Error: Backup file does not exist."
        exit 1
    fi
fi

echo "Starting restoration of remote Supabase database..."

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

# Ask for confirmation before proceeding
echo ""
echo "WARNING: This will overwrite your current database with the backup."
echo "Make sure you have a backup of your current data before proceeding."
read -p "Do you want to proceed with the restoration? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

# Restore the backup
echo "Restoring backup..."
export PGPASSWORD="$PGPASSWORD"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$BACKUP_DIR/$BACKUP_FILENAME"

# Check if restoration was successful
if [ $? -eq 0 ]; then
    echo "Restoration completed successfully!"
else
    echo "Error: Restoration failed."
    exit 1
fi 