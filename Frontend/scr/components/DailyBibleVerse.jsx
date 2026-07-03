import React, { useState, useEffect } from 'react';
import { BookOpen, RefreshCw, Share2, Copy } from 'lucide-react';
import { toast } from 'react-toastify';
import bibleService from '../utils/bibleService';

const DailyBibleVerse = ({ showTitle = true }) => {
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDailyVerse();
  }, []);

  const fetchDailyVerse = async () => {
    setLoading(true);
    try {
      // Use bibleService getDailyVerse which returns a daily verse
      const dailyVerse = await bibleService.getDailyVerse();
      setVerse(dailyVerse);
    } catch (error) {
      console.error('Error fetching daily verse:', error);
      toast.error('Failed to load daily verse');
      // Fallback to an offline verse
      setVerse({
        reference: 'John 3:16',
        text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
        book: 'John',
        offline: true
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (verse) {
      const text = `${verse.text}\n\n- ${verse.reference}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Verse copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareVerse = () => {
    if (verse && navigator.share) {
      navigator.share({
        title: 'Daily Bible Verse',
        text: `${verse.text}\n\n- ${verse.reference}`,
      }).catch(err => console.log('Error sharing:', err));
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200 animate-pulse">
        <div className="h-8 bg-purple-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-purple-100 rounded mb-2"></div>
        <div className="h-4 bg-purple-100 rounded mb-2 w-5/6"></div>
        <div className="h-4 bg-purple-100 rounded w-4/6"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 md:p-8 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
      {showTitle && (
        <div className="flex items-center space-x-2 mb-4 md:mb-6">
          <BookOpen size={20} className="text-purple-600 flex-shrink-0" />
          <h3 className="font-bold text-purple-900 text-xl sm:text-2xl">
            Daily Bible Verse
          </h3>
        </div>
      )}
      
      {verse && (
        <>
          <blockquote className="font-medium text-purple-900 mb-4 md:mb-6 italic leading-relaxed text-lg sm:text-xl">
            "{verse.text}"
          </blockquote>
          
          <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
            <p className="text-xs sm:text-sm md:text-base font-semibold text-purple-700 bg-white px-3 py-1 rounded-full border border-purple-200 whitespace-nowrap">
              📖 {verse.reference}
            </p>
            <p className="text-xs text-purple-600 hidden sm:block">{verse.book}</p>
            {verse.offline && (
              <p className="text-xs text-orange-600">Offline Mode</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchDailyVerse}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              title="Load another verse"
            >
              <RefreshCw size={16} />
              <span>New Verse</span>
            </button>

            <button
              onClick={copyToClipboard}
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                copied ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Copy size={16} />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            {navigator.share && (
              <button
                onClick={shareVerse}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Share2 size={16} />
                <span>Share</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DailyBibleVerse;
