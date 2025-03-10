# Supabase Database Backup Scripts

This directory contains scripts for backing up and restoring your remote Supabase database.

## Prerequisites

Before using these scripts, make sure you have:

1. Installed the Supabase CLI:
   ```
   npm install -g supabase
   ```

2. Logged in to your Supabase account:
   ```
   npx supabase login
   ```

3. Linked your Supabase project:
   ```
   npx supabase link --project-ref your-project-ref
   ```

4. Installed PostgreSQL client tools (psql, pg_dump):
   - On macOS: `brew install postgresql`
   - On Ubuntu/Debian: `sudo apt-get install postgresql-client`
   - On Windows: Install from https://www.postgresql.org/download/windows/

## Available Scripts

### 1. Backup Remote Database (`backup_remote_db.sh`)

This script creates a backup of your remote Supabase database and saves it locally.

**Usage:**
```
./backup_remote_db.sh
```

The script will:
- Create a `database_backups` directory if it doesn't exist
- Connect to your remote Supabase database
- Create a SQL dump file with a timestamp in the filename
- Create a compressed version of the backup (.gz)
- List all available backups

### 2. Restore Remote Database (`restore_remote_db.sh`)

This script restores your remote Supabase database from a local backup file.

**Usage:**
```
./restore_remote_db.sh
```

The script will:
- List all available backups
- Ask you to select a backup file
- Connect to your remote Supabase database
- Restore the selected backup
- Provide confirmation of successful restoration

**Warning:** This will overwrite your current database with the backup. Make sure you have a backup of your current data before proceeding.

### 3. Schedule Automatic Backups (`schedule_backups.sh`)

This script sets up a cron job to run the backup script at regular intervals.

**Usage:**
```
./schedule_backups.sh
```

The script will:
- Ask you to choose a backup frequency (daily, weekly, or monthly)
- Set up a cron job to run the backup script at the specified frequency
- Create a script to manage backup retention (keeping only the 10 most recent backups)
- Set up a cron job to run the retention script after each backup

## Backup Retention

By default, the system will keep the 10 most recent backups and delete older ones to save disk space. You can modify this by editing the `MAX_BACKUPS` variable in the `manage_backup_retention.sh` script.

## Manual Backup

If you prefer to run backups manually, simply run the `backup_remote_db.sh` script whenever you want to create a backup.

## Troubleshooting

If you encounter any issues:

1. Make sure you're logged in to the Supabase CLI
2. Verify that your project is linked correctly
3. Check that PostgreSQL client tools are installed and in your PATH
4. Check the log files in the `database_backups` directory for error messages 