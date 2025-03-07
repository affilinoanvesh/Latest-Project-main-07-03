#!/bin/bash

# Script to schedule automatic backups of remote Supabase database
# This script will set up a cron job to run the backup script at regular intervals

# Get the absolute path of the backup script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup_remote_db.sh"

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "Error: Backup script does not exist at $BACKUP_SCRIPT"
    exit 1
fi

# Make sure the backup script is executable
chmod +x "$BACKUP_SCRIPT"

# Ask user for backup frequency
echo "How often would you like to schedule backups?"
echo "1) Daily"
echo "2) Weekly"
echo "3) Monthly"
read -p "Enter your choice (1-3): " FREQUENCY

# Set up cron expression based on user choice
case $FREQUENCY in
    1)
        # Daily at 2:00 AM
        CRON_EXPR="0 2 * * *"
        FREQUENCY_TEXT="daily at 2:00 AM"
        ;;
    2)
        # Weekly on Sunday at 2:00 AM
        CRON_EXPR="0 2 * * 0"
        FREQUENCY_TEXT="weekly on Sunday at 2:00 AM"
        ;;
    3)
        # Monthly on the 1st at 2:00 AM
        CRON_EXPR="0 2 1 * *"
        FREQUENCY_TEXT="monthly on the 1st at 2:00 AM"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Create a temporary file for the new crontab
TEMP_CRONTAB=$(mktemp)

# Export current crontab to the temporary file
crontab -l > "$TEMP_CRONTAB" 2>/dev/null

# Check if the backup job is already in the crontab
if grep -q "$BACKUP_SCRIPT" "$TEMP_CRONTAB"; then
    echo "A backup job for this script is already scheduled."
    echo "Would you like to replace it with the new schedule?"
    read -p "Enter your choice (y/n): " REPLACE
    if [[ ! $REPLACE =~ ^[Yy]$ ]]; then
        echo "Operation cancelled."
        rm "$TEMP_CRONTAB"
        exit 0
    fi
    # Remove the existing backup job
    grep -v "$BACKUP_SCRIPT" "$TEMP_CRONTAB" > "${TEMP_CRONTAB}.new"
    mv "${TEMP_CRONTAB}.new" "$TEMP_CRONTAB"
fi

# Add the new backup job to the crontab
echo "# Supabase database backup $FREQUENCY_TEXT" >> "$TEMP_CRONTAB"
echo "$CRON_EXPR $BACKUP_SCRIPT >> $SCRIPT_DIR/database_backups/backup.log 2>&1" >> "$TEMP_CRONTAB"

# Install the new crontab
crontab "$TEMP_CRONTAB"
rm "$TEMP_CRONTAB"

echo "Backup job scheduled $FREQUENCY_TEXT."
echo "Logs will be written to $SCRIPT_DIR/database_backups/backup.log"

# Create a script to manage backup retention
RETENTION_SCRIPT="$SCRIPT_DIR/manage_backup_retention.sh"
cat > "$RETENTION_SCRIPT" << 'EOF'
#!/bin/bash

# Script to manage backup retention
# This script will delete old backups to save disk space

# Set variables
BACKUP_DIR="./database_backups"
MAX_BACKUPS=10  # Keep the 10 most recent backups

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory does not exist."
    exit 1
fi

# Count the number of backups
NUM_BACKUPS=$(ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l)

# If we have more than MAX_BACKUPS, delete the oldest ones
if [ "$NUM_BACKUPS" -gt "$MAX_BACKUPS" ]; then
    NUM_TO_DELETE=$((NUM_BACKUPS - MAX_BACKUPS))
    echo "Deleting $NUM_TO_DELETE old backups..."
    
    # Get the list of backup files sorted by modification time (oldest first)
    BACKUP_FILES=$(ls -t "$BACKUP_DIR"/*.sql | tail -n "$NUM_TO_DELETE")
    
    # Delete the oldest backups and their compressed versions
    for BACKUP_FILE in $BACKUP_FILES; do
        echo "Deleting $BACKUP_FILE"
        rm -f "$BACKUP_FILE"
        rm -f "${BACKUP_FILE}.gz"
    done
    
    echo "Old backups deleted successfully."
else
    echo "No need to delete backups. Current count: $NUM_BACKUPS, Maximum: $MAX_BACKUPS"
fi
EOF

# Make the retention script executable
chmod +x "$RETENTION_SCRIPT"

# Add the retention script to the crontab
TEMP_CRONTAB=$(mktemp)
crontab -l > "$TEMP_CRONTAB"
echo "# Manage backup retention after each backup" >> "$TEMP_CRONTAB"
echo "$CRON_EXPR $RETENTION_SCRIPT >> $SCRIPT_DIR/database_backups/retention.log 2>&1" >> "$TEMP_CRONTAB"
crontab "$TEMP_CRONTAB"
rm "$TEMP_CRONTAB"

echo "Backup retention management scheduled. Old backups will be automatically deleted."
echo "By default, the 10 most recent backups will be kept."
echo "You can modify this by editing the MAX_BACKUPS variable in $RETENTION_SCRIPT" 