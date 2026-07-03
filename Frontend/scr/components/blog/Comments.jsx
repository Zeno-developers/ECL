// components/blog/CommentForm.js
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Send } from 'lucide-react';
import { API_CONFIG } from '../../config/api';

const CommentForm = ({ postId, onCommentAdded }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      alert('Please enter your comment');
      return;
    }

    if (!authorName.trim() && !user) {
      alert('Please enter your name');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const commentData = {
        content: content.trim(),
        author_name: user ? user.name : authorName.trim(),
        author_email: authorEmail.trim()
      };

      const response = await fetch(`${API_CONFIG.BASE_URL}/blog/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData)
      });

      if (response.ok) {
        const result = await response.json();
        setContent('');
        setAuthorName('');
        setAuthorEmail('');
        onCommentAdded(result.data || null);
      } else {
        throw new Error('Failed to post comment');
      }
    } catch (error) {
      console.error('Comment submission error:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {user ? 'Add a Comment' : 'Join the Conversation'}
      </h3>
      
      <form onSubmit={handleSubmit}>
        {!user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                id="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label htmlFor="authorEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Your Email (optional)
              </label>
              <input
                type="email"
                id="authorEmail"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Your Comment *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            placeholder="Share your thoughts..."
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {user 
              ? `Commenting as ${user.name}` 
              : 'Your name will be displayed with your comment'
            }
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            <span>{isLoading ? 'Posting...' : 'Post Comment'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentForm;
