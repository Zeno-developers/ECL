// components/blog/CommentList.js
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, Reply, ThumbsUp, Calendar, MessageCircle } from 'lucide-react';
import { blogAPI } from '../../utils/api';

const CommentList = ({ comments, postId, onCommentsUpdate }) => {
  const { user } = useAuth();
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const handleLikeComment = async (commentId) => {
    if (!user) {
      alert('Please login to like comments');
      return;
    }
    try {
      const res = await blogAPI.likeComment(commentId);
      const liked = res?.liked ?? res?.data?.liked ?? null;

      const applyLikeUpdate = (items) => {
        return items.map((it) => {
          const id = it._id || it.id;
          if (id === commentId) {
            const currentLikes = Array.isArray(it.likes) ? [...it.likes] : [];
            let newLikes = currentLikes;
            if (liked !== null) {
              if (liked && !newLikes.includes(user.id)) newLikes.push(user.id);
              if (!liked) newLikes = newLikes.filter(x => x !== user.id);
            } else {
              // toggle fallback
              if (newLikes.includes(user.id)) newLikes = newLikes.filter(x => x !== user.id);
              else newLikes.push(user.id);
            }

            return { ...it, likes: newLikes };
          }

          if (it.replies && it.replies.length) {
            return { ...it, replies: applyLikeUpdate(it.replies) };
          }

          return it;
        });
      };

      const updated = applyLikeUpdate(comments || []);
      onCommentsUpdate(updated);
    } catch (error) {
      console.error('Error toggling comment like:', error);
      alert('Failed to like comment. Please try again.');
    }
  };

  const handleReply = async (commentId) => {
    if (!replyContent.trim()) {
      alert('Please enter your reply');
      return;
    }

    try {
      const payload = {
        content: replyContent.trim(),
        parent_id: commentId,
      };

      const result = await blogAPI.createComment({ postId, ...payload });
      let createdReply = result?.data ?? result?.comment ?? result;

      // Normalize created reply shape for UI
      createdReply = {
        _id: createdReply._id || createdReply.id || `r-${Date.now()}`,
        authorName: createdReply.author_name || createdReply.author?.name || user?.name || 'Guest',
        content: createdReply.content || createdReply.message || replyContent.trim(),
        createdAt: createdReply.created_at || createdReply.createdAt || new Date().toISOString(),
        likes: Array.isArray(createdReply.likes) ? createdReply.likes : [],
        replies: Array.isArray(createdReply.replies) ? createdReply.replies : [],
      };

      // Add the reply to the comment
      const updatedComments = comments.map((comment) => {
        if ((comment._id || comment.id) === commentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), createdReply],
          };
        }
        return comment;
      });

      onCommentsUpdate(updatedComments);
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('Failed to post reply. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment, idx) => (
        <div key={comment._id || comment.id || `comment-${postId || 'p'}-${idx}`} className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Main Comment */}
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-semibold text-sm">
                {comment.authorName?.charAt(0).toUpperCase()}
              </span>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-800">{comment.authorName}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Calendar size={12} />
                    <span>{formatDate(comment.createdAt || comment.created_at)}</span>
                    {comment.isEdited && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleLikeComment(comment._id || comment.id)}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${
                      comment.likes?.includes(user?.id)
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ThumbsUp size={14} />
                    <span>{comment.likes?.length || 0}</span>
                  </button>
                  
                  <button
                    onClick={() => setReplyingTo(replyingTo === (comment._id || comment.id) ? null : (comment._id || comment.id))}
                    className="flex items-center space-x-1 px-2 py-1 rounded text-sm text-gray-500 hover:text-gray-700"
                  >
                    <Reply size={14} />
                    <span>Reply</span>
                  </button>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{comment.content}</p>
              
              {/* Reply Form */}
              {replyingTo === (comment._id || comment.id) && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write your reply..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                  />
                  <div className="flex items-center justify-end space-x-2 mt-2">
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReply(comment._id || comment.id)}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                    >
                      Post Reply
                    </button>
                  </div>
                </div>
              )}
              
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-4 border-l-2 border-gray-200 pl-4 space-y-4">
                  {comment.replies.map((reply, ridx) => (
                    <div key={reply._id || reply.id || `reply-${comment._id || idx}-${ridx}`} className="pt-4 first:pt-0">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-xs">
                            {reply.authorName?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <h5 className="font-medium text-gray-800 text-sm">{reply.authorName}</h5>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <Calendar size={10} />
                                <span>{formatDate(reply.createdAt || reply.created_at)}</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleLikeComment(reply._id || reply.id)}
                              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                                reply.likes?.includes(user?.id)
                                  ? 'text-red-600 bg-red-50'
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              <ThumbsUp size={12} />
                              <span>{reply.likes?.length || 0}</span>
                            </button>
                          </div>
                          
                          <p className="text-gray-700 text-sm">{reply.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;
