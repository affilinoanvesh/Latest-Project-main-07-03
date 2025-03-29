import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Edit2, Trash2, Send, User, PlusCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../../services/supabase';

// Since the commentQueries file might not exist yet, define types and functions here
export interface TaskComment {
  id: number;
  task_id: number;
  content: string;
  author: string | null;
  created_at: string;
  updated_at: string;
}

// API functions
const getTaskComments = async (taskId: number): Promise<TaskComment[]> => {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const createTaskComment = async (
  taskId: number,
  content: string,
  author?: string
): Promise<TaskComment> => {
  const { data, error } = await supabase
    .from('task_comments')
    .insert([
      {
        task_id: taskId,
        content,
        author,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

const updateTaskComment = async (
  commentId: number,
  content: string
): Promise<TaskComment> => {
  const { data, error } = await supabase
    .from('task_comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const deleteTaskComment = async (commentId: number): Promise<void> => {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
};

interface TaskCommentsProps {
  taskId: number;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ taskId }) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<{ id: number; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCommentForm, setShowCommentForm] = useState(false);
  
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const endOfCommentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComments();
  }, [taskId]);

  useEffect(() => {
    if (showCommentForm && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [showCommentForm]);

  useEffect(() => {
    if (endOfCommentsRef.current && comments.length > 0 && !loading) {
      endOfCommentsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length, loading]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const fetchedComments = await getTaskComments(taskId);
      setComments(fetchedComments);
      setError(null);
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const comment = await createTaskComment(taskId, newComment.trim());
      setComments([comment, ...comments]);
      setNewComment('');
      setShowCommentForm(false);
      setError(null);
    } catch (err) {
      setError('Failed to add comment');
      console.error('Error adding comment:', err);
    }
  };

  const handleUpdateComment = async (commentId: number, content: string) => {
    try {
      const updatedComment = await updateTaskComment(commentId, content);
      setComments(comments.map(c => c.id === commentId ? updatedComment : c));
      setEditingComment(null);
      setError(null);
    } catch (err) {
      setError('Failed to update comment');
      console.error('Error updating comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteTaskComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
      setError(null);
    } catch (err) {
      setError('Failed to delete comment');
      console.error('Error deleting comment:', err);
    }
  };

  const toggleCommentForm = () => {
    setShowCommentForm(!showCommentForm);
    if (!showCommentForm) {
      // Set timeout to ensure the DOM element exists after rendering
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 50);
    }
  };

  if (loading && comments.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-white rounded-md shadow p-4">
      <div className="flex justify-between items-center">
        <h3 
          className="text-sm font-medium text-gray-700 flex items-center cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
          Comments ({comments.length})
          <span className="text-xs ml-2 text-gray-500">
            {isExpanded ? 'Click to collapse' : 'Click to expand'}
          </span>
        </h3>
        {!showCommentForm && (
          <button 
            onClick={toggleCommentForm}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
          >
            <PlusCircle className="h-3 w-3" />
            <span>Add comment</span>
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 mb-2 p-2 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {/* Add comment form */}
      {showCommentForm && (
        <div className="p-3 bg-blue-50 rounded-lg transition-all duration-200 ease-in-out">
          <div className="flex items-start space-x-2">
            <div className="mt-1 flex-shrink-0 bg-blue-600 text-white rounded-full p-2">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-grow space-y-2">
              <textarea
                ref={commentInputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your comment..."
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Press Ctrl+Enter to submit
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowCommentForm(false)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-md 
                      ${newComment.trim() 
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    <Send className="h-3 w-3" />
                    <span>Submit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      {isExpanded && (
        <div className="space-y-3 mt-2 max-h-[300px] overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No comments yet</p>
              <button 
                onClick={toggleCommentForm}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Add the first comment
              </button>
            </div>
          ) : (
            <>
              {comments.map(comment => (
                <div key={comment.id} className="relative group">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-all duration-200">
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1 z-10">
                      <button
                        onClick={() => setEditingComment({ id: comment.id, content: comment.content })}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                        title="Edit comment"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    
                    {editingComment?.id === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingComment?.content || ''}
                          onChange={(e) => {
                            if (editingComment) {
                              setEditingComment({
                                id: editingComment.id,
                                content: e.target.value
                              });
                            }
                          }}
                          autoFocus
                          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setEditingComment(null)}
                            className="px-3 py-1 text-xs border rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (editingComment) {
                                handleUpdateComment(comment.id, editingComment.content);
                              }
                            }}
                            disabled={!editingComment?.content.trim()}
                            className={`px-3 py-1 text-xs rounded-md ${
                              editingComment?.content.trim() 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Save changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0 bg-gray-200 text-gray-600 rounded-full p-2">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex-grow">
                            <div className="flex flex-col">
                              <div className="text-xs text-gray-500">
                                {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
                                {comment.updated_at !== comment.created_at && 
                                  <span className="italic ml-1">(edited)</span>
                                }
                              </div>
                            </div>
                            <p 
                              className="text-sm mt-2 text-gray-700 whitespace-pre-wrap break-words cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
                              onClick={() => setEditingComment({ id: comment.id, content: comment.content })}
                              title="Click to edit"
                            >
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endOfCommentsRef} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskComments; 