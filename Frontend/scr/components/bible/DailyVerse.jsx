import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, RefreshCw, Share2, Bookmark, Volume2 } from 'lucide-react';
import bibleService from '../../utils/bibleService';
import LoadingSpinner from '../common/LoadingSpinner';
import Card from '../common/Card';
import { toast } from 'react-toastify';

export default function DailyVerse() {
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    loadDailyVerse();
  }, []);

  useEffect(() => {
    if (verse) {
      checkIfBookmarked();
    }
  }, [verse]);

  const loadDailyVerse = async () => {
    try {
      setLoading(true);
      const dailyVerse = await bibleService.getDailyVerse();
      setVerse(dailyVerse);
    } catch (error) {
      console.error('Error loading daily verse:', error);
      toast.error('Failed to load daily verse');
      // Fallback verse
      setVerse({
        reference: 'John 3:16',
        version: 'KJV',
        text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
        date: new Date().toDateString()
      });
    } finally {
      setLoading(false);
    }
  };

  const checkIfBookmarked = () => {
    if (!verse) return;
    
    const bookmarks = bibleService.getBookmarks();
    const bookmarked = bookmarks.some(bm => 
      bm.reference === verse.reference && bm.version === verse.version
    );
    setIsBookmarked(bookmarked);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDailyVerse();
    setRefreshing(false);
  };

  const handleBookmark = () => {
    if (!verse) return;

    if (isBookmarked) {
      bibleService.removeBookmark(verse.reference, verse.version);
      setIsBookmarked(false);
      toast.success('Bookmark removed');
    } else {
      const success = bibleService.addBookmark(verse);
      if (success) {
        setIsBookmarked(true);
        toast.success('Verse bookmarked');
      }
    }
  };

  const handleShare = () => {
    if (!verse) return;

    if (navigator.share) {
      navigator.share({
        title: `Daily Bible Verse - ${verse.reference}`,
        text: `${verse.text} - ${verse.reference} (${verse.version})`,
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        copyToClipboard();
      });
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    const text = `"${verse.text}" - ${verse.reference} (${verse.version})`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Verse copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy verse');
    });
  };

  const handleSpeak = () => {
    if (!verse || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance();
    utterance.text = `${verse.reference}. ${verse.text}`;
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Speak the verse
    speechSynthesis.speak(utterance);

    utterance.onend = () => {
      toast.info('Finished reading verse');
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      toast.error('Error reading verse aloud');
    };
  };

  const getVersionColor = (version) => {
    switch (version) {
      case 'KJV': return 'bg-purple-100 text-purple-800';
      case 'NIV': return 'bg-blue-100 text-blue-800';
      case 'ZULU': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="medium" />
        </div>
      </Card>
    );
  }

  if (!verse) {
    return (
      <Card className="p-6 text-center">
        <BookOpen size={32} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600">Unable to load daily verse</p>
        <button
          onClick={loadDailyVerse}
          className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BookOpen size={20} className="text-purple-600" />
          <h3 className="font-semibold text-gray-800">Verse of the Day</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1 text-gray-400 hover:text-purple-600 transition-colors disabled:opacity-50"
            title="Refresh verse"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={verse.date}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <motion.p 
            className="text-lg font-serif text-gray-800 mb-4 leading-relaxed"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            "{verse.text}"
          </motion.p>
          
          <motion.div 
            className="flex items-center justify-center space-x-3 text-sm text-gray-600 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="font-semibold">{verse.reference}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVersionColor(verse.version)}`}>
              {verse.version}
            </span>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            className="flex justify-center space-x-4 pt-4 border-t border-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={handleBookmark}
              className={`flex items-center space-x-1 text-sm transition-colors ${
                isBookmarked 
                  ? 'text-purple-600' 
                  : 'text-gray-500 hover:text-purple-600'
              }`}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark verse'}
            >
              <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
              <span>Save</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-purple-600 transition-colors"
              title="Share verse"
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>

            {'speechSynthesis' in window && (
              <button
                onClick={handleSpeak}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-purple-600 transition-colors"
                title="Listen to verse"
              >
                <Volume2 size={16} />
                <span>Listen</span>
              </button>
            )}
          </motion.div>

          {/* Verse Info */}
          <motion.div 
            className="mt-3 text-xs text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Updated {new Date(verse.date).toLocaleDateString()}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}