// components/CommentForm.js
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Send, 
  Smile, 
  Image as ImageIcon, 
  X,
  AlertCircle,
  CircleCheck
} from 'lucide-react';
import { blogAPI } from '../../utils/api';

export default function CommentForm({ 
  postId, 
  onCommentAdded, 
  parentId = null, 
  onCancelReply = null,
  placeholder = "Share your thoughts...",
  autoFocus = false 
}) {
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFocused, setIsFocused] = useState(autoFocus);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('Please log in to comment');
      return;
    }

    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (content.length > 1000) {
      setError('Comment must be less than 1000 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');

      const commentData = {
        content: content.trim(),
        postId,
        parentId
      };

      const newComment = await blogAPI.createComment(commentData);
      
      setContent('');
      setSuccess('Comment posted successfully!');
      
      // Notify parent component
      if (onCommentAdded) {
        onCommentAdded(newComment);
      }

      // Auto-hide success message
      setTimeout(() => setSuccess(''), 3000);
      
      // If this was a reply, close the reply form
      if (parentId && onCancelReply) {
        setTimeout(() => onCancelReply(), 1000);
      }
      
    } catch (error) {
      console.error('Error posting comment:', error);
      setError(error.response?.data?.message || 'Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent('');
    setError('');
    if (onCancelReply) {
      onCancelReply();
    }
  };

  const characterCount = content.length;
  const maxCharacters = 1000;
  const isNearLimit = characterCount > maxCharacters * 0.8;

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 text-center border border-purple-100"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Send className="text-purple-600" size={20} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Join the Conversation</h3>
          <p className="text-gray-600 max-w-md">
            Sign in to share your thoughts and engage with the community
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => window.location.href = '/register'}
              className="border border-purple-600 text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border-2 transition-all duration-300 ${
        isFocused ? 'border-purple-300 shadow-lg' : 'border-gray-200 shadow-sm'
      } ${parentId ? 'ml-4 md:ml-8 border-l-4 border-l-purple-200' : ''}`}
    >
      <form onSubmit={handleSubmit} className="p-1">
        {/* User Info */}
        <div className="flex items-center space-x-3 p-4 pb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">{user?.name}</p>
            <p className="text-sm text-gray-500">Posting as {user?.role || 'member'}</p>
          </div>
        </div>

        {/* Textarea */}
        <div className="relative px-4">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError('');
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            rows={4}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none transition-all duration-300"
            disabled={isSubmitting}
          />
          
          {/* Character Counter */}
          <div className={`absolute bottom-2 right-4 text-xs ${
            characterCount > maxCharacters 
              ? 'text-red-500 font-semibold' 
              : isNearLimit 
                ? 'text-orange-500' 
                : 'text-gray-400'
          }`}>
            {characterCount}/{maxCharacters}
          </div>
        </div>

        {/* Error and Success Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pt-2"
            >
              <div className="flex items-center space-x-2 text-red-500 bg-red-50 rounded-lg p-3">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pt-2"
            >
              <div className="flex items-center space-x-2 text-green-500 bg-green-50 rounded-lg p-3">
                <CircleCheck size={16} />
                <span className="text-sm font-medium">{success}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 pt-3">
          <div className="flex items-center space-x-2">
            {/* Emoji Picker - Simple version */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50"
              title="Add emoji"
            >
              <Smile size={20} />
            </button>
            
            {/* Image Upload - Simple version */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50"
              title="Add image"
            >
              <ImageIcon size={20} />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {parentId && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || !content.trim() || content.length > maxCharacters}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>
                    {parentId ? 'Reply' : 'Comment'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Formatting Tips */}
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-3 border-t border-gray-100 pt-3"
          >
            <p className="text-xs text-gray-500">
              <strong>Formatting tips:</strong> Use **bold** for emphasis and *italic* for subtle emphasis
            </p>
          </motion.div>
        )}
      </form>
    </motion.div>
  );
}