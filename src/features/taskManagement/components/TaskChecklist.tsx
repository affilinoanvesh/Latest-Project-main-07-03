import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Square, Trash2, Edit2, PlusCircle, GripVertical, Save, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../services/supabase';

// Checklist item interface
export interface ChecklistItem {
  id: number;
  task_id: number;
  text: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

// API functions
const getChecklistItems = async (taskId: number): Promise<ChecklistItem[]> => {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .select('*')
    .eq('task_id', taskId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
};

const createChecklistItem = async (
  taskId: number,
  text: string,
  position: number
): Promise<ChecklistItem> => {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .insert([
      {
        task_id: taskId,
        text,
        is_completed: false,
        position,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

const updateChecklistItem = async (
  itemId: number,
  updates: Partial<ChecklistItem>
): Promise<ChecklistItem> => {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const deleteChecklistItem = async (itemId: number): Promise<void> => {
  const { error } = await supabase
    .from('task_checklist_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
};

interface TaskChecklistProps {
  taskId: number;
  hideHeader?: boolean;
}

const TaskChecklist: React.FC<TaskChecklistProps> = ({ taskId, hideHeader = false }) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const newItemInputRef = useRef<HTMLInputElement>(null);
  const editItemInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChecklistItems();
  }, [taskId]);

  useEffect(() => {
    if (isAddingItem && newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [isAddingItem]);

  useEffect(() => {
    if (editingItemId !== null && editItemInputRef.current) {
      editItemInputRef.current.focus();
    }
  }, [editingItemId]);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const loadChecklistItems = async () => {
    try {
      setLoading(true);
      const items = await getChecklistItems(taskId);
      setChecklistItems(items);
      setError(null);
    } catch (err) {
      setError('Failed to load checklist items');
      console.error('Error loading checklist items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    try {
      const position = checklistItems.length > 0 
        ? Math.max(...checklistItems.map(item => item.position)) + 1 
        : 0;
      
      const newItem = await createChecklistItem(taskId, newItemText.trim(), position);
      setChecklistItems([...checklistItems, newItem]);
      setNewItemText('');
      setIsAddingItem(false);
      setError(null);
    } catch (err) {
      setError('Failed to add checklist item');
      console.error('Error adding checklist item:', err);
    }
  };

  const handleUpdateItem = async (itemId: number, updates: Partial<ChecklistItem>) => {
    try {
      const updatedItem = await updateChecklistItem(itemId, updates);
      setChecklistItems(
        checklistItems.map(item => (item.id === itemId ? updatedItem : item))
      );
      setError(null);
    } catch (err) {
      setError('Failed to update checklist item');
      console.error('Error updating checklist item:', err);
    }
  };

  const handleToggleComplete = async (itemId: number, currentStatus: boolean) => {
    await handleUpdateItem(itemId, { is_completed: !currentStatus });
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteChecklistItem(itemId);
      setChecklistItems(checklistItems.filter(item => item.id !== itemId));
      setError(null);
    } catch (err) {
      setError('Failed to delete checklist item');
      console.error('Error deleting checklist item:', err);
    }
  };

  const handleEditItem = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = async () => {
    if (!editingItemId || !editingText.trim()) {
      setEditingItemId(null);
      return;
    }

    try {
      await handleUpdateItem(editingItemId, { text: editingText.trim() });
      setEditingItemId(null);
      setEditingText('');
    } catch (err) {
      console.error('Error saving edited item:', err);
    }
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingText('');
  };

  // Calculate items based on active tab
  const activeItems = checklistItems.filter(item => !item.is_completed);
  const completedItems = checklistItems.filter(item => item.is_completed);
  
  // Get the current items to display based on tab
  const currentItems = activeTab === 'active' ? activeItems : completedItems;
  
  // Calculate pagination
  const totalPages = Math.ceil(currentItems.length / itemsPerPage);
  const paginatedItems = currentItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getCompletedPercentage = (): number => {
    if (checklistItems.length === 0) return 0;
    const completedCount = completedItems.length;
    return Math.round((completedCount / checklistItems.length) * 100);
  };

  const getCompletedCount = (): string => {
    return `${completedItems.length}/${checklistItems.length}`;
  };

  if (loading && checklistItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[300px] flex flex-col">
      {!hideHeader && (
        <div className="flex justify-between items-center">
          <h3 
            className="text-sm font-medium text-gray-700 flex items-center cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <CheckSquare className="h-5 w-5 mr-2 text-blue-600" />
            Checklist
            {checklistItems.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                {getCompletedCount()} • {getCompletedPercentage()}% complete
              </span>
            )}
            <span className="text-xs ml-2 text-gray-500">
              {isExpanded ? 'Click to collapse' : 'Click to expand'}
            </span>
          </h3>
          <div className="flex items-center space-x-2">
            {!isAddingItem && (
              <button 
                onClick={() => setIsAddingItem(true)}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
              >
                <PlusCircle className="h-3 w-3" />
                <span>Add item</span>
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 mb-2 p-2 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {/* Quick add item form - Always visible for convenience */}
      {!isAddingItem ? (
        <button
          onClick={() => setIsAddingItem(true)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center p-2 rounded-md hover:bg-blue-50 transition-colors w-full"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add checklist item
        </button>
      ) : (
        <div className="p-3 bg-blue-50 rounded-lg transition-all duration-200 ease-in-out">
          <div className="flex items-start space-x-2">
            <div className="mt-1 flex-shrink-0">
              <Square className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-grow space-y-2">
              <input
                ref={newItemInputRef}
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Add checklist item..."
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newItemText.trim()) {
                    e.preventDefault();
                    handleAddItem();
                  } else if (e.key === 'Escape') {
                    setIsAddingItem(false);
                    setNewItemText('');
                  }
                }}
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsAddingItem(false);
                    setNewItemText('');
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItemText.trim()}
                  className={`px-3 py-1 text-sm rounded-md 
                    ${newItemText.trim() 
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checklist progress bar */}
      {isExpanded && checklistItems.length > 0 && (
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
            style={{ width: `${getCompletedPercentage()}%` }}
          ></div>
        </div>
      )}

      {/* Tabs for Active/Completed */}
      {checklistItems.length > 0 && (
        <div className="flex border-b border-gray-200 mt-1">
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'active'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Active ({activeItems.length})
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'completed'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({completedItems.length})
          </button>
        </div>
      )}

      {/* Checklist items - with pagination */}
      <div className="overflow-y-auto flex-grow max-h-[200px]">
        <div className="space-y-2 mt-2">
          {checklistItems.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <CheckSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No checklist items yet</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">
                {activeTab === 'active' 
                  ? 'No active items. All items are completed.' 
                  : 'No completed items yet.'
                }
              </p>
            </div>
          ) : (
            <>
              {paginatedItems.map(item => (
                <div key={item.id} className="group flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleComplete(item.id, item.is_completed)}
                    className="flex-shrink-0 mt-1"
                  >
                    {item.is_completed ? (
                      <CheckSquare className="h-5 w-5 text-blue-600 transition-colors" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400 hover:text-blue-600 transition-colors" />
                    )}
                  </button>
                  
                  {/* Item content */}
                  <div className="flex-grow">
                    {editingItemId === item.id ? (
                      <div className="space-y-2">
                        <input
                          ref={editItemInputRef}
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editingText.trim()) {
                              e.preventDefault();
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={cancelEdit}
                            className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            disabled={!editingText.trim()}
                            className={`px-2 py-1 text-xs rounded-md ${
                              editingText.trim() 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span 
                        className={`text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-700'}`}
                        onClick={() => handleEditItem(item)}
                      >
                        {item.text}
                      </span>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  {editingItemId !== item.id && (
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                        title="Delete item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Pagination controls - show only if we have enough items */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
          <span className="text-xs text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className={`p-1 rounded ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`p-1 rounded ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskChecklist; 