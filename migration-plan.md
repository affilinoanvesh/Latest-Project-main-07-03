# Task Management Feature Migration Plan

## Overview
We've reorganized the task management feature into a more maintainable feature-based structure. The new structure follows a feature-based approach with clear separation of concerns.

## Current Status
- New structure has been created in `src/features/taskManagement/`
- Files have been copied (not moved) to preserve the existing functionality
- Main `TaskManager` component has been updated to use the new imports
- App.tsx has been updated to import from the new location

## Remaining Steps

### 1. Test the application with new file structure
- Run the application and verify the Task Manager still works
- Test all Task Manager functionality (create tasks, move tasks, view details, etc.)

### 2. Update remaining component imports
- Update all task management components to use the new file structure
- Fix any import paths in:
  - src/features/taskManagement/components/TaskDetails.tsx
  - src/features/taskManagement/components/TaskForm.tsx
  - src/features/taskManagement/components/ProjectForm.tsx
  - src/features/taskManagement/components/TaskStats.tsx
  - src/features/taskManagement/components/TaskManagerHeader.tsx
  - src/features/taskManagement/components/TaskList.tsx
  - src/features/taskManagement/components/TaskTimer.tsx

### 3. Update API files
- Make sure all API files use the correct import paths
- Check imports in:
  - src/features/taskManagement/api/projectQueries.ts
  - src/features/taskManagement/api/taskQueries.ts
  - src/features/taskManagement/api/timeEntryQueries.ts
  - src/features/taskManagement/api/tagQueries.ts
  - src/features/taskManagement/api/statsQueries.ts

### 4. Remove old files
Once everything is working, remove the old files:
```bash
# Remove old components
rm -r src/components/tasks
rm -r src/components/dnd

# Remove old types
rm src/types/taskManagement.ts

# Remove old database queries
rm -r src/db/taskManagement
```

### 5. Update Documentation (if any)
- Update any documentation that references the old file structure

### 6. Commit Changes
```bash
git add src/features
git add src/App.tsx
git add src/components/layout/Navbar.tsx
git rm -r src/components/tasks
git rm -r src/components/dnd
git rm -r src/db/taskManagement
git rm src/types/taskManagement.ts
git commit -m "Refactor: Reorganize task management into feature-based structure"
``` 