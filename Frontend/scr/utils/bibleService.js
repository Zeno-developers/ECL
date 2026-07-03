import { toast } from 'react-toastify';
import { API_CONFIG, ENDPOINTS } from '../config/api';

class BibleService {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.externalBaseUrl = 'https://bible.helloao.org/api'; // Fallback
    this.versions = [
      { id: 'BSB', name: 'Berean Standard Bible', language: 'en', available: true },
      { id: 'KJV', name: 'King James Version', language: 'en', available: false },
      { id: 'NIV', name: 'New International Version', language: 'en', available: false },
    ];
    this.cache = new Map();
    this.chapterCache = new Map();
    this.offlineVerses = new Map();
    this.maxCacheSize = 50;
    this.initOfflineCache();
    this.initBooksData();
  }

  // Initialize with popular verses for offline access
  initOfflineCache() {
    const popularVerses = {
      'JHN 3:16': {
        BSB: 'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.',
        KJV: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
        NIV: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.'
      },
      'PHP 4:13': {
        BSB: 'I can do all things through Christ who gives me strength.',
        KJV: 'I can do all things through Christ which strengtheneth me.',
        NIV: 'I can do all this through him who gives me strength.'
      },
      'PSA 23:1': {
        BSB: 'The LORD is my shepherd; I shall not want.',
        KJV: 'The LORD is my shepherd; I shall not want.',
        NIV: 'The Lord is my shepherd, I lack nothing.'
      },
      'JER 29:11': {
        BSB: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.',
        KJV: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
        NIV: 'For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, plans to give you hope and a future.'
      },
      'ROM 8:28': {
        BSB: 'And we know that God works all things together for the good of those who love Him, who are called according to His purpose.',
        KJV: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
        NIV: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.'
      }
    };

    Object.entries(popularVerses).forEach(([ref, versions]) => {
      this.offlineVerses.set(ref, versions);
    });
  }

  // Initialize books data locally
  initBooksData() {
    this.booksData = [
      // Old Testament
      { id: 'GEN', name: 'Genesis', order: 1, chapters: 50, testament: 'old' },
      { id: 'EXO', name: 'Exodus', order: 2, chapters: 40, testament: 'old' },
      { id: 'LEV', name: 'Leviticus', order: 3, chapters: 27, testament: 'old' },
      { id: 'NUM', name: 'Numbers', order: 4, chapters: 36, testament: 'old' },
      { id: 'DEU', name: 'Deuteronomy', order: 5, chapters: 34, testament: 'old' },
      { id: 'JOS', name: 'Joshua', order: 6, chapters: 24, testament: 'old' },
      { id: 'JDG', name: 'Judges', order: 7, chapters: 21, testament: 'old' },
      { id: 'RUT', name: 'Ruth', order: 8, chapters: 4, testament: 'old' },
      { id: '1SA', name: '1 Samuel', order: 9, chapters: 31, testament: 'old' },
      { id: '2SA', name: '2 Samuel', order: 10, chapters: 24, testament: 'old' },
      { id: '1KI', name: '1 Kings', order: 11, chapters: 22, testament: 'old' },
      { id: '2KI', name: '2 Kings', order: 12, chapters: 25, testament: 'old' },
      { id: '1CH', name: '1 Chronicles', order: 13, chapters: 29, testament: 'old' },
      { id: '2CH', name: '2 Chronicles', order: 14, chapters: 36, testament: 'old' },
      { id: 'EZR', name: 'Ezra', order: 15, chapters: 10, testament: 'old' },
      { id: 'NEH', name: 'Nehemiah', order: 16, chapters: 13, testament: 'old' },
      { id: 'EST', name: 'Esther', order: 17, chapters: 10, testament: 'old' },
      { id: 'JOB', name: 'Job', order: 18, chapters: 42, testament: 'old' },
      { id: 'PSA', name: 'Psalms', order: 19, chapters: 150, testament: 'old' },
      { id: 'PRO', name: 'Proverbs', order: 20, chapters: 31, testament: 'old' },
      { id: 'ECC', name: 'Ecclesiastes', order: 21, chapters: 12, testament: 'old' },
      { id: 'SNG', name: 'Song of Solomon', order: 22, chapters: 8, testament: 'old' },
      { id: 'ISA', name: 'Isaiah', order: 23, chapters: 66, testament: 'old' },
      { id: 'JER', name: 'Jeremiah', order: 24, chapters: 52, testament: 'old' },
      { id: 'LAM', name: 'Lamentations', order: 25, chapters: 5, testament: 'old' },
      { id: 'EZK', name: 'Ezekiel', order: 26, chapters: 48, testament: 'old' },
      { id: 'DAN', name: 'Daniel', order: 27, chapters: 12, testament: 'old' },
      { id: 'HOS', name: 'Hosea', order: 28, chapters: 14, testament: 'old' },
      { id: 'JOL', name: 'Joel', order: 29, chapters: 3, testament: 'old' },
      { id: 'AMO', name: 'Amos', order: 30, chapters: 9, testament: 'old' },
      { id: 'OBA', name: 'Obadiah', order: 31, chapters: 1, testament: 'old' },
      { id: 'JON', name: 'Jonah', order: 32, chapters: 4, testament: 'old' },
      { id: 'MIC', name: 'Micah', order: 33, chapters: 7, testament: 'old' },
      { id: 'NAH', name: 'Nahum', order: 34, chapters: 3, testament: 'old' },
      { id: 'HAB', name: 'Habakkuk', order: 35, chapters: 3, testament: 'old' },
      { id: 'ZEP', name: 'Zephaniah', order: 36, chapters: 3, testament: 'old' },
      { id: 'HAG', name: 'Haggai', order: 37, chapters: 2, testament: 'old' },
      { id: 'ZEC', name: 'Zechariah', order: 38, chapters: 14, testament: 'old' },
      { id: 'MAL', name: 'Malachi', order: 39, chapters: 4, testament: 'old' },
      
      // New Testament
      { id: 'MAT', name: 'Matthew', order: 40, chapters: 28, testament: 'new' },
      { id: 'MRK', name: 'Mark', order: 41, chapters: 16, testament: 'new' },
      { id: 'LUK', name: 'Luke', order: 42, chapters: 24, testament: 'new' },
      { id: 'JHN', name: 'John', order: 43, chapters: 21, testament: 'new' },
      { id: 'ACT', name: 'Acts', order: 44, chapters: 28, testament: 'new' },
      { id: 'ROM', name: 'Romans', order: 45, chapters: 16, testament: 'new' },
      { id: '1CO', name: '1 Corinthians', order: 46, chapters: 16, testament: 'new' },
      { id: '2CO', name: '2 Corinthians', order: 47, chapters: 13, testament: 'new' },
      { id: 'GAL', name: 'Galatians', order: 48, chapters: 6, testament: 'new' },
      { id: 'EPH', name: 'Ephesians', order: 49, chapters: 6, testament: 'new' },
      { id: 'PHP', name: 'Philippians', order: 50, chapters: 4, testament: 'new' },
      { id: 'COL', name: 'Colossians', order: 51, chapters: 4, testament: 'new' },
      { id: '1TH', name: '1 Thessalonians', order: 52, chapters: 5, testament: 'new' },
      { id: '2TH', name: '2 Thessalonians', order: 53, chapters: 3, testament: 'new' },
      { id: '1TI', name: '1 Timothy', order: 54, chapters: 6, testament: 'new' },
      { id: '2TI', name: '2 Timothy', order: 55, chapters: 4, testament: 'new' },
      { id: 'TIT', name: 'Titus', order: 56, chapters: 3, testament: 'new' },
      { id: 'PHM', name: 'Philemon', order: 57, chapters: 1, testament: 'new' },
      { id: 'HEB', name: 'Hebrews', order: 58, chapters: 13, testament: 'new' },
      { id: 'JAS', name: 'James', order: 59, chapters: 5, testament: 'new' },
      { id: '1PE', name: '1 Peter', order: 60, chapters: 5, testament: 'new' },
      { id: '2PE', name: '2 Peter', order: 61, chapters: 3, testament: 'new' },
      { id: '1JN', name: '1 John', order: 62, chapters: 5, testament: 'new' },
      { id: '2JN', name: '2 John', order: 63, chapters: 1, testament: 'new' },
      { id: '3JN', name: '3 John', order: 64, chapters: 1, testament: 'new' },
      { id: 'JUD', name: 'Jude', order: 65, chapters: 1, testament: 'new' },
      { id: 'REV', name: 'Revelation', order: 66, chapters: 22, testament: 'new' }
    ];
  }

  // Helper method to make API calls with better error handling
  async apiCall(url) {
    try {
      console.log('Fetching from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Check if it's HTML (error page)
        const text = await response.text();
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('API endpoint returned HTML instead of JSON - endpoint may not exist');
        }
        throw new Error('Response is not JSON');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API call failed:', error, 'URL:', url);
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }

  // Get books - call backend API or fallback to external API
  async getBooks(version = 'BSB') {
    try {
      // Try backend API first
      const backendUrl = `${this.baseUrl}${ENDPOINTS.BIBLE.BOOKS}?version=${version}`;
      console.log('Fetching books from backend:', backendUrl);
      const data = await this.apiCall(backendUrl);
      return data.books || data;
    } catch (error) {
      console.warn(`Failed to fetch books from backend, trying external API:`, error.message);
      
      // Try external API as fallback
      try {
        const externalUrl = `${this.externalBaseUrl}/${version}/books.json`;
        console.log('Fetching books from external API:', externalUrl);
        const data = await this.apiCall(externalUrl);
        return data.books;
      } catch (externalError) {
        console.warn(`Failed to fetch books from external API, using local data:`, externalError.message);
        return this.getLocalBooks(version);
      }
    }
  }

  // Get local books data
  getLocalBooks(version) {
    return this.booksData.map(book => ({
      id: book.id,
      name: book.name,
      commonName: book.name,
      order: book.order,
      numberOfChapters: book.chapters,
      firstChapterApiLink: `${this.externalBaseUrl}/${version}/${book.id}/1.json`,
      lastChapterApiLink: `${this.externalBaseUrl}/${version}/${book.id}/${book.chapters}.json`,
      totalNumberOfVerses: this.estimateVerseCount(book.id, book.chapters),
      testament: book.testament
    }));
  }

  // Estimate verse count for local data
  estimateVerseCount(bookId, chapters) {
    const estimates = {
      'PSA': 2461, 'GEN': 1533, 'EXO': 1213, 'NUM': 1288, 'DEU': 959,
      'JOS': 658, 'JDG': 618, 'RUT': 85, '1SA': 810, '2SA': 695,
      '1KI': 816, '2KI': 719, '1CH': 942, '2CH': 822, 'EZR': 280,
      'NEH': 406, 'EST': 167, 'JOB': 1070, 'PRO': 915, 'ECC': 222,
      'SNG': 117, 'ISA': 1292, 'JER': 1364, 'LAM': 154, 'EZK': 1273,
      'DAN': 357, 'HOS': 197, 'JOL': 73, 'AMO': 146, 'OBA': 21,
      'JON': 48, 'MIC': 105, 'NAH': 47, 'HAB': 56, 'ZEP': 53,
      'HAG': 38, 'ZEC': 211, 'MAL': 55, 'MAT': 1071, 'MRK': 678,
      'LUK': 1151, 'JHN': 879, 'ACT': 1007, 'ROM': 433, '1CO': 437,
      '2CO': 257, 'GAL': 149, 'EPH': 155, 'PHP': 104, 'COL': 95,
      '1TH': 89, '2TH': 47, '1TI': 113, '2TI': 83, 'TIT': 46,
      'PHM': 25, 'HEB': 303, 'JAS': 108, '1PE': 105, '2PE': 61,
      '1JN': 105, '2JN': 13, '3JN': 15, 'JUD': 25, 'REV': 404
    };
    
    return estimates[bookId] || chapters * 25;
  }

  // Parse Bible reference
  parseReference(reference) {
    const bookAbbreviations = {
      'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
      'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
      '1 samuel': '1SA', '2 samuel': '2SA', '1 kings': '1KI', '2 kings': '2KI',
      '1 chronicles': '1CH', '2 chronicles': '2CH', 'ezra': 'EZR', 'nehemiah': 'NEH',
      'esther': 'EST', 'job': 'JOB', 'psalms': 'PSA', 'psalm': 'PSA',
      'proverbs': 'PRO', 'ecclesiastes': 'ECC', 'song of solomon': 'SNG',
      'isaiah': 'ISA', 'jeremiah': 'JER', 'lamentations': 'LAM', 'ezekiel': 'EZK',
      'daniel': 'DAN', 'hosea': 'HOS', 'joel': 'JOL', 'amos': 'AMO',
      'obadiah': 'OBA', 'jonah': 'JON', 'micah': 'MIC', 'nahum': 'NAH',
      'habakkuk': 'HAB', 'zephaniah': 'ZEP', 'haggai': 'HAG', 'zechariah': 'ZEC',
      'malachi': 'MAL', 'matthew': 'MAT', 'mark': 'MRK', 'luke': 'LUK',
      'john': 'JHN', 'acts': 'ACT', 'romans': 'ROM', '1 corinthians': '1CO',
      '2 corinthians': '2CO', 'galatians': 'GAL', 'ephesians': 'EPH',
      'philippians': 'PHP', 'colossians': 'COL', '1 thessalonians': '1TH',
      '2 thessalonians': '2TH', '1 timothy': '1TI', '2 timothy': '2TI',
      'titus': 'TIT', 'philemon': 'PHM', 'hebrews': 'HEB', 'james': 'JAS',
      '1 peter': '1PE', '2 peter': '2PE', '1 john': '1JN', '2 john': '2JN',
      '3 john': '3JN', 'jude': 'JUD', 'revelation': 'REV'
    };

    const cleanRef = reference.toLowerCase().trim();
    let book = '';
    let chapterVerse = '';

    for (const [bookName, abbrev] of Object.entries(bookAbbreviations)) {
      if (cleanRef.startsWith(bookName)) {
        book = abbrev;
        chapterVerse = cleanRef.slice(bookName.length).trim();
        break;
      }
    }

    if (!book) {
      const firstWord = cleanRef.split(' ')[0];
      for (const [bookName, abbrev] of Object.entries(bookAbbreviations)) {
        if (bookName.startsWith(firstWord)) {
          book = abbrev;
          chapterVerse = cleanRef.slice(firstWord.length).trim();
          break;
        }
      }
    }

    if (!book || !chapterVerse) {
      return null;
    }

    const [chapter, verse] = chapterVerse.split(':').map(part => part.trim());
    
    if (!chapter || isNaN(parseInt(chapter))) {
      return null;
    }

    return {
      book,
      chapter: parseInt(chapter),
      verse: verse ? parseInt(verse) : null,
      fullRef: `${book} ${chapterVerse}`.toUpperCase()
    };
  }

  // Get a specific verse
  async getVerse(reference, version = 'BSB') {
    const parsedRef = this.parseReference(reference);
    if (!parsedRef) {
      throw new Error('Invalid Bible reference');
    }

    const { book, chapter, verse, fullRef } = parsedRef;
    const cacheKey = `${fullRef}_${version}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check offline verses first
    if (this.offlineVerses.has(fullRef)) {
      const offlineVerse = this.offlineVerses.get(fullRef)[version];
      if (offlineVerse) {
        const result = {
          reference: reference,
          text: offlineVerse,
          version: version,
          fullReference: fullRef,
          offline: true
        };
        this.cache.set(cacheKey, result);
        return result;
      }
    }

    // Only try API for BSB version
    if (version !== 'BSB') {
      const fallbackText = this.offlineVerses.get(fullRef)?.[version] 
        || `"${reference}" - Available in BSB version only.`;
      
      const fallbackResult = {
        reference: reference,
        text: fallbackText,
        version: version,
        fullReference: fullRef,
        error: true,
        offline: true
      };
      
      return fallbackResult;
    }

    try {
      const chapterData = await this.getChapter(book, chapter, version);
      const verseContent = this.extractVerseFromChapter(chapterData, verse);
      
      if (!verseContent) {
        throw new Error(`Verse ${verse} not found in ${book} ${chapter}`);
      }

      const result = {
        reference: reference,
        text: verseContent,
        version: version,
        fullReference: fullRef,
        chapterData: chapterData
      };

      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, result);
      
      return result;

    } catch (error) {
      console.warn('Failed to fetch verse from API:', error);
      
      const fallbackText = this.offlineVerses.get(fullRef)?.[version] 
        || `"${reference}" - Available in offline mode only.`;
      
      const fallbackResult = {
        reference: reference,
        text: fallbackText,
        version: version,
        fullReference: fullRef,
        error: true,
        offline: true
      };
      
      return fallbackResult;
    }
  }

  // Get an entire chapter
  async getChapter(book, chapter, version = 'BSB') {
    const cacheKey = `${version}_${book}_${chapter}`;
    
    if (this.chapterCache.has(cacheKey)) {
      return this.chapterCache.get(cacheKey);
    }

    try {
      // For non-BSB versions, return mock data
      if (version !== 'BSB') {
        const mockChapter = this.createMockChapter(book, chapter, version);
        this.chapterCache.set(cacheKey, mockChapter);
        return mockChapter;
      }

      // Try external API directly (backend endpoint not implemented yet)
      const externalUrl = `${this.externalBaseUrl}/${version}/${book}/${chapter}.json`;
      console.log('📖 Fetching chapter from external API:', externalUrl);
      const chapterData = await this.apiCall(externalUrl);

      if (this.chapterCache.size >= this.maxCacheSize) {
        const firstKey = this.chapterCache.keys().next().value;
        this.chapterCache.delete(firstKey);
      }
      
      this.chapterCache.set(cacheKey, chapterData);
      return chapterData;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch chapter, using offline mode:`, error.message);
      
      // Use mock chapter as fallback
      const mockChapter = this.createMockChapter(book, chapter, version);
      this.chapterCache.set(cacheKey, mockChapter);
      return mockChapter;
    }
  }

  // Create mock chapter data for offline use
  createMockChapter(book, chapter, version) {
    const bookData = this.booksData.find(b => b.id === book);
    const bookName = bookData ? bookData.name : book;
    
    return {
      translation: {
        id: version,
        name: this.getVersionName(version),
        language: 'en'
      },
      book: {
        id: book,
        name: bookName,
        commonName: bookName
      },
      chapter: {
        number: chapter,
        content: [
          {
            type: 'heading',
            content: [`${bookName} ${chapter}`]
          },
          {
            type: 'verse',
            number: 1,
            content: [version === 'BSB' 
              ? `This chapter is temporarily unavailable. Please check your internet connection.`
              : `${bookName} ${chapter} is available in BSB version only. Switch to BSB to read this chapter.`
            ]
          }
        ]
      }
    };
  }

  // Extract specific verse text from chapter data
  extractVerseFromChapter(chapterData, targetVerse) {
    if (!chapterData?.chapter?.content) return null;

    let verseText = '';

    for (const contentItem of chapterData.chapter.content) {
      if (contentItem.type === 'verse' && contentItem.number === targetVerse) {
        verseText = this.processContentArray(contentItem.content);
        break;
      }
    }

    return verseText || null;
  }

  // Process content array to extract text
  processContentArray(contentArray) {
    if (!Array.isArray(contentArray)) return '';

    return contentArray.map(item => {
      if (typeof item === 'string') {
        return item;
      } else if (item.text) {
        return item.text;
      } else if (item.heading) {
        return item.heading;
      }
      return '';
    }).join(' ').trim();
  }

  // Get daily verse — picks a random verse from the external API, stable per calendar day
  async getDailyVerse() {
    const today = new Date().toDateString();
    const version = 'BSB';
    const cacheKey = `daily_${today}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Date-seeded LCG so the verse is consistent within a day but changes each day
    const dateInt = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    let lcgState = dateInt;
    const rand = (max) => {
      lcgState = (Math.imul(lcgState, 1664525) + 1013904223) | 0;
      return Math.abs(lcgState) % max;
    };

    try {
      const book = this.booksData[rand(this.booksData.length)];
      const chapterNum = 1 + rand(book.chapters);

      const url = `${this.externalBaseUrl}/${version}/${book.id}/${chapterNum}.json`;
      const chapterData = await this.apiCall(url);

      const verses = (chapterData?.chapter?.content || []).filter(item => item.type === 'verse');
      if (!verses.length) throw new Error('No verses found in chapter');

      const verseItem = verses[rand(verses.length)];
      const text = this.processContentArray(verseItem.content);
      if (!text) throw new Error('Empty verse text');

      const result = {
        reference: `${book.name} ${chapterNum}:${verseItem.number}`,
        version,
        text,
        date: today,
        fullReference: `${book.id} ${chapterNum}:${verseItem.number}`,
        offline: false,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error getting daily verse:', error);
      return {
        reference: 'John 3:16',
        version: 'BSB',
        text: 'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.',
        date: today,
        fullReference: 'JHN 3:16',
        offline: true,
      };
    }
  }

  // Search verses - only search offline data
  async searchVerses(query, version = 'BSB', limit = 10) {
    if (!query.trim()) {
      return [];
    }

    const queryLower = query.toLowerCase().trim();
    const results = [];
    
    for (const [ref, versions] of this.offlineVerses.entries()) {
      if (results.length >= limit) break;
      
      const text = versions[version] || versions['BSB']; // Fallback to BSB if version not available
      if (text && text.toLowerCase().includes(queryLower)) {
        results.push({
          reference: this.formatReferenceForDisplay(ref),
          text: text,
          version: version,
          fullReference: ref,
          offline: true
        });
      }
    }

    return results.slice(0, limit);
  }

  // Format reference for display
  formatReferenceForDisplay(fullRef) {
    const bookNames = {
      'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers',
      'DEU': 'Deuteronomy', 'JOS': 'Joshua', 'JDG': 'Judges', 'RUT': 'Ruth',
      '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Kings', '2KI': '2 Kings',
      '1CH': '1 Chronicles', '2CH': '2 Chronicles', 'EZR': 'Ezra', 'NEH': 'Nehemiah',
      'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalms', 'PRO': 'Proverbs',
      'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'ISA': 'Isaiah', 'JER': 'Jeremiah',
      'LAM': 'Lamentations', 'EZK': 'Ezekiel', 'DAN': 'Daniel', 'HOS': 'Hosea',
      'JOL': 'Joel', 'AMO': 'Amos', 'OBA': 'Obadiah', 'JON': 'Jonah',
      'MIC': 'Micah', 'NAH': 'Nahum', 'HAB': 'Habakkuk', 'ZEP': 'Zephaniah',
      'HAG': 'Haggai', 'ZEC': 'Zechariah', 'MAL': 'Malachi', 'MAT': 'Matthew',
      'MRK': 'Mark', 'LUK': 'Luke', 'JHN': 'John', 'ACT': 'Acts',
      'ROM': 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians', 'GAL': 'Galatians',
      'EPH': 'Ephesians', 'PHP': 'Philippians', 'COL': 'Colossians', '1TH': '1 Thessalonians',
      '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy', 'TIT': 'Titus',
      'PHM': 'Philemon', 'HEB': 'Hebrews', 'JAS': 'James', '1PE': '1 Peter',
      '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John', '3JN': '3 John',
      'JUD': 'Jude', 'REV': 'Revelation'
    };

    const [bookAbbr, chapterVerse] = fullRef.split(' ');
    const bookName = bookNames[bookAbbr] || bookAbbr;
    return `${bookName} ${chapterVerse}`;
  }

  // Get all available versions
  getAvailableVersions() {
    return this.versions;
  }

  // Check if version is available via API
  isVersionAvailable(versionId) {
    const version = this.versions.find(v => v.id === versionId);
    return version ? version.available : false;
  }

  // Get version name by ID
  getVersionName(versionId) {
    const version = this.versions.find(v => v.id === versionId);
    return version ? version.name : 'Unknown Version';
  }

  // ... rest of the methods (bookmark management, cache management) remain the same
  clearCache() {
    this.cache.clear();
    this.chapterCache.clear();
    toast.success('Bible cache cleared');
  }

  getCacheSize() {
    return this.cache.size + this.chapterCache.size;
  }

  getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem('bibleBookmarks') || '[]');
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      return [];
    }
  }

  saveBookmarks(bookmarks) {
    try {
      localStorage.setItem('bibleBookmarks', JSON.stringify(bookmarks));
      return true;
    } catch (error) {
      console.error('Error saving bookmarks:', error);
      return false;
    }
  }

  addBookmark(verse) {
    const bookmarks = this.getBookmarks();
    const newBookmark = {
      ...verse,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString()
    };
    
    const exists = bookmarks.some(bm => 
      bm.reference === verse.reference && bm.version === verse.version
    );
    
    if (!exists) {
      bookmarks.unshift(newBookmark);
      this.saveBookmarks(bookmarks);
      return true;
    }
    
    return false;
  }

  removeBookmark(reference, version) {
    const bookmarks = this.getBookmarks();
    const filtered = bookmarks.filter(bm => 
      !(bm.reference === reference && bm.version === version)
    );
    
    if (filtered.length !== bookmarks.length) {
      this.saveBookmarks(filtered);
      return true;
    }
    
    return false;
  }

  isBookmarked(reference, version) {
    const bookmarks = this.getBookmarks();
    return bookmarks.some(bm => 
      bm.reference === reference && bm.version === version
    );
  }
}

const bibleService = new BibleService();
export default bibleService;
