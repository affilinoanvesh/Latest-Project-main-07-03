// Main export file for the Task Management feature

// Export the main component
export { default as TaskManager } from './components/TaskManager';

// Export types
export * from './types';

// Export API functions
export * from './api/taskQueries';
export * from './api/projectQueries';
export * from './api/timeEntryQueries';
export * from './api/tagQueries';
export * from './api/statsQueries'; 