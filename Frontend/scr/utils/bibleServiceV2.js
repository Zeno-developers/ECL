import { toast } from 'react-toastify';

class UnifiedBibleService {
  constructor() {
    // Both APIs available
    this.primaryBaseUrl = 'https://www.abibliadigital.com.br/api';
    this.fallbackBaseUrl = 'https://bible.helloao.org/api';
    
    this.token = localStorage.getItem('bibleApiToken');
    this.cache = new Map();
    this.chapterCache = new Map();
    this.maxCacheSize = 100;
    
    // English versions only from both APIs
    this.versions = [
      // A Bíblia Digital API - English versions
      { id: 'kjv', name: 'King James Version', language: 'en', api: 'primary' },
      { id: 'bbe', name: 'Bible in Basic English', language: 'en', api: 'primary' },
      { id: 'asv', name: 'American Standard Version', language: 'en', api: 'primary' },
      
      // BSB API versions
      { id: 'BSB', name: 'Berean Standard Bible', language: 'en', api: 'fallback' },
      { id: 'KJV', name: 'King James Version', language: 'en', api: 'fallback' },
      { id: 'NIV', name: 'New International Version', language: 'en', api: 'fallback' },
    ];

    this.defaultVersion = 'BSB'; // Default to BSB since it's your original
    this.initBooksData();
    this.initOfflineCache();
  }

  // Initialize books data for both APIs
  initBooksData() {
    // Primary API books (Portuguese abbreviations but English names)
    this.primaryBooksData = [
      // Old Testament
      { id: 'gn', name: 'Genesis', order: 1, chapters: 50, testament: 'VT' },
      { id: 'ex', name: 'Exodus', order: 2, chapters: 40, testament: 'VT' },
      { id: 'lv', name: 'Leviticus', order: 3, chapters: 27, testament: 'VT' },
      { id: 'nm', name: 'Numbers', order: 4, chapters: 36, testament: 'VT' },
      { id: 'dt', name: 'Deuteronomy', order: 5, chapters: 34, testament: 'VT' },
      { id: 'js', name: 'Joshua', order: 6, chapters: 24, testament: 'VT' },
      { id: 'jz', name: 'Judges', order: 7, chapters: 21, testament: 'VT' },
      { id: 'rt', name: 'Ruth', order: 8, chapters: 4, testament: 'VT' },
      { id: '1sm', name: '1 Samuel', order: 9, chapters: 31, testament: 'VT' },
      { id: '2sm', name: '2 Samuel', order: 10, chapters: 24, testament: 'VT' },
      { id: '1rs', name: '1 Kings', order: 11, chapters: 22, testament: 'VT' },
      { id: '2rs', name: '2 Kings', order: 12, chapters: 25, testament: 'VT' },
      { id: '1cr', name: '1 Chronicles', order: 13, chapters: 29, testament: 'VT' },
      { id: '2cr', name: '2 Chronicles', order: 14, chapters: 36, testament: 'VT' },
      { id: 'ed', name: 'Ezra', order: 15, chapters: 10, testament: 'VT' },
      { id: 'ne', name: 'Nehemiah', order: 16, chapters: 13, testament: 'VT' },
      { id: 'et', name: 'Esther', order: 17, chapters: 10, testament: 'VT' },
      { id: 'job', name: 'Job', order: 18, chapters: 42, testament: 'VT' },
      { id: 'sl', name: 'Psalms', order: 19, chapters: 150, testament: 'VT' },
      { id: 'pv', name: 'Proverbs', order: 20, chapters: 31, testament: 'VT' },
      { id: 'ec', name: 'Ecclesiastes', order: 21, chapters: 12, testament: 'VT' },
      { id: 'ct', name: 'Song of Solomon', order: 22, chapters: 8, testament: 'VT' },
      { id: 'is', name: 'Isaiah', order: 23, chapters: 66, testament: 'VT' },
      { id: 'jr', name: 'Jeremiah', order: 24, chapters: 52, testament: 'VT' },
      { id: 'lm', name: 'Lamentations', order: 25, chapters: 5, testament: 'VT' },
      { id: 'ez', name: 'Ezekiel', order: 26, chapters: 48, testament: 'VT' },
      { id: 'dn', name: 'Daniel', order: 27, chapters: 12, testament: 'VT' },
      { id: 'os', name: 'Hosea', order: 28, chapters: 14, testament: 'VT' },
      { id: 'jl', name: 'Joel', order: 29, chapters: 3, testament: 'VT' },
      { id: 'am', name: 'Amos', order: 30, chapters: 9, testament: 'VT' },
      { id: 'ob', name: 'Obadiah', order: 31, chapters: 1, testament: 'VT' },
      { id: 'jn', name: 'Jonah', order: 32, chapters: 4, testament: 'VT' },
      { id: 'mq', name: 'Micah', order: 33, chapters: 7, testament: 'VT' },
      { id: 'na', name: 'Nahum', order: 34, chapters: 3, testament: 'VT' },
      { id: 'hc', name: 'Habakkuk', order: 35, chapters: 3, testament: 'VT' },
      { id: 'sf', name: 'Zephaniah', order: 36, chapters: 3, testament: 'VT' },
      { id: 'ag', name: 'Haggai', order: 37, chapters: 2, testament: 'VT' },
      { id: 'zc', name: 'Zechariah', order: 38, chapters: 14, testament: 'VT' },
      { id: 'ml', name: 'Malachi', order: 39, chapters: 4, testament: 'VT' },
      
      // New Testament
      { id: 'mt', name: 'Matthew', order: 40, chapters: 28, testament: 'NT' },
      { id: 'mc', name: 'Mark', order: 41, chapters: 16, testament: 'NT' },
      { id: 'lc', name: 'Luke', order: 42, chapters: 24, testament: 'NT' },
      { id: 'jo', name: 'John', order: 43, chapters: 21, testament: 'NT' },
      { id: 'at', name: 'Acts', order: 44, chapters: 28, testament: 'NT' },
      { id: 'rm', name: 'Romans', order: 45, chapters: 16, testament: 'NT' },
      { id: '1co', name: '1 Corinthians', order: 46, chapters: 16, testament: 'NT' },
      { id: '2co', name: '2 Corinthians', order: 47, chapters: 13, testament: 'NT' },
      { id: 'gl', name: 'Galatians', order: 48, chapters: 6, testament: 'NT' },
      { id: 'ef', name: 'Ephesians', order: 49, chapters: 6, testament: 'NT' },
      { id: 'fp', name: 'Philippians', order: 50, chapters: 4, testament: 'NT' },
      { id: 'cl', name: 'Colossians', order: 51, chapters: 4, testament: 'NT' },
      { id: '1ts', name: '1 Thessalonians', order: 52, chapters: 5, testament: 'NT' },
      { id: '2ts', name: '2 Thessalonians', order: 53, chapters: 3, testament: 'NT' },
      { id: '1tm', name: '1 Timothy', order: 54, chapters: 6, testament: 'NT' },
      { id: '2tm', name: '2 Timothy', order: 55, chapters: 4, testament: 'NT' },
      { id: 'tt', name: 'Titus', order: 56, chapters: 3, testament: 'NT' },
      { id: 'fm', name: 'Philemon', order: 57, chapters: 1, testament: 'NT' },
      { id: 'hb', name: 'Hebrews', order: 58, chapters: 13, testament: 'NT' },
      { id: 'tg', name: 'James', order: 59, chapters: 5, testament: 'NT' },
      { id: '1pe', name: '1 Peter', order: 60, chapters: 5, testament: 'NT' },
      { id: '2pe', name: '2 Peter', order: 61, chapters: 3, testament: 'NT' },
      { id: '1jo', name: '1 John', order: 62, chapters: 5, testament: 'NT' },
      { id: '2jo', name: '2 John', order: 63, chapters: 1, testament: 'NT' },
      { id: '3jo', name: '3 John', order: 64, chapters: 1, testament: 'NT' },
      { id: 'jd', name: 'Jude', order: 65, chapters: 1, testament: 'NT' },
      { id: 'ap', name: 'Revelation', order: 66, chapters: 22, testament: 'NT' }
    ];

    // Fallback API books (English abbreviations)
    this.fallbackBooksData = [
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

  // Initialize popular verses for offline access
  initOfflineCache() {
    this.offlineVerses = new Map([
      ['JHN 3:16', {
        BSB: 'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.',
        KJV: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
        NIV: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
        kjv: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
        bbe: 'For God had such love for the world that he gave his only Son, so that whoever has faith in him may not come to destruction but have eternal life.',
        asv: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth on him should not perish, but have eternal life.'
      }],
      ['PHP 4:13', {
        BSB: 'I can do all things through Christ who gives me strength.',
        KJV: 'I can do all things through Christ which strengtheneth me.',
        NIV: 'I can do all this through him who gives me strength.',
        kjv: 'I can do all things through Christ which strengtheneth me.',
        bbe: 'I have strength for all things in Christ who gives me power.',
        asv: 'I can do all things in him that strengtheneth me.'
      }]
    ]);
  }

  // Helper method to determine which API to use based on version
  getApiForVersion(version) {
    const versionInfo = this.versions.find(v => v.id === version);
    return versionInfo ? versionInfo.api : 'fallback';
  }

  // FIXED: Helper method to make API calls
  async apiCall(url, apiType = 'primary') {
    try {
      const baseUrl = apiType === 'primary' ? this.primaryBaseUrl : this.fallbackBaseUrl;
      
      // FIX: Only prepend baseUrl if the url doesn't already include it
      let fullUrl;
      if (url.startsWith('http')) {
        fullUrl = url; // Already a full URL
      } else {
        fullUrl = `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
      }

      const headers = {
        'Accept': 'application/json'
      };

      // Only include Content-Type for POST requests
      if (url.includes('/search') || url.includes('/users')) {
        headers['Content-Type'] = 'application/json';
      }

      if (this.token && apiType === 'primary') {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      console.log('API Call:', { fullUrl, apiType, method: url.includes('/search') ? 'POST' : 'GET' });

      const options = {
        headers,
        method: url.includes('/search') ? 'POST' : 'GET'
      };

      // Add body for POST requests
      if (url.includes('/search') && options.method === 'POST') {
        const searchBody = url.split('?')[1]; // Extract search params if any
        if (searchBody) {
          options.body = searchBody;
        }
      }

      const response = await fetch(fullUrl, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  // FIXED: Get books - uses appropriate API based on version
  async getBooks(version = this.defaultVersion) {
    const apiType = this.getApiForVersion(version);
    
    if (apiType === 'primary') {
      try {
        const data = await this.apiCall(`/books`, 'primary');
        return data.map(book => ({
          id: book.abbrev.pt,
          name: book.name,
          commonName: book.name,
          order: this.primaryBooksData.find(b => b.id === book.abbrev.pt)?.order || 0,
          numberOfChapters: book.chapters,
          testament: book.testament,
          author: book.author,
          group: book.group
        }));
      } catch (error) {
        console.warn('Failed to fetch books from primary API, using local data:', error);
        return this.primaryBooksData;
      }
    } else {
      // Fallback API - FIX: Use relative path
      if (version !== 'BSB') {
        console.log(`Using local books data for ${version} (API not available)`);
        return this.fallbackBooksData.map(book => this.formatFallbackBook(book, version));
      }

      try {
        // FIX: Use relative path for fallback API
        const data = await this.apiCall(`/${version}/books.json`, 'fallback');
        return data.books;
      } catch (error) {
        console.warn(`Failed to fetch books for ${version}, using local data:`, error);
        return this.fallbackBooksData.map(book => this.formatFallbackBook(book, version));
      }
    }
  }

  formatFallbackBook(book, version) {
    return {
      id: book.id,
      name: book.name,
      commonName: book.name,
      order: book.order,
      numberOfChapters: book.chapters,
      firstChapterApiLink: `${this.fallbackBaseUrl}/${version}/${book.id}/1.json`,
      lastChapterApiLink: `${this.fallbackBaseUrl}/${version}/${book.id}/${book.chapters}.json`,
      totalNumberOfVerses: this.estimateVerseCount(book.id, book.chapters),
      testament: book.testament
    };
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

  // Parse Bible reference - handles both API formats
  parseReference(reference, version = this.defaultVersion) {
    const apiType = this.getApiForVersion(version);
    
    if (apiType === 'primary') {
      // Primary API book mappings (Portuguese abbreviations)
      const bookMappings = {
        // Old Testament
        'genesis': 'gn', 'exodus': 'ex', 'leviticus': 'lv', 'numbers': 'nm',
        'deuteronomy': 'dt', 'joshua': 'js', 'judges': 'jz', 'ruth': 'rt',
        '1 samuel': '1sm', '2 samuel': '2sm', '1 kings': '1rs', '2 kings': '2rs',
        '1 chronicles': '1cr', '2 chronicles': '2cr', 'ezra': 'ed', 'nehemiah': 'ne',
        'esther': 'et', 'job': 'job', 'psalms': 'sl', 'psalm': 'sl',
        'proverbs': 'pv', 'ecclesiastes': 'ec', 'song of solomon': 'ct',
        'isaiah': 'is', 'jeremiah': 'jr', 'lamentations': 'lm', 'ezekiel': 'ez',
        'daniel': 'dn', 'hosea': 'os', 'joel': 'jl', 'amos': 'am',
        'obadiah': 'ob', 'jonah': 'jn', 'micah': 'mq', 'nahum': 'na',
        'habakkuk': 'hc', 'zephaniah': 'sf', 'haggai': 'ag', 'zechariah': 'zc',
        'malachi': 'ml',
        
        // New Testament
        'matthew': 'mt', 'mark': 'mc', 'luke': 'lc', 'john': 'jo',
        'acts': 'at', 'romans': 'rm', '1 corinthians': '1co', '2 corinthians': '2co',
        'galatians': 'gl', 'ephesians': 'ef', 'philippians': 'fp', 'colossians': 'cl',
        '1 thessalonians': '1ts', '2 thessalonians': '2ts', '1 timothy': '1tm',
        '2 timothy': '2tm', 'titus': 'tt', 'philemon': 'fm', 'hebrews': 'hb',
        'james': 'tg', '1 peter': '1pe', '2 peter': '2pe', '1 john': '1jo',
        '2 john': '2jo', '3 john': '3jo', 'jude': 'jd', 'revelation': 'ap'
      };

      const cleanRef = reference.toLowerCase().trim();
      let book = '';
      let chapterVerse = '';

      for (const [bookName, abbrev] of Object.entries(bookMappings)) {
        if (cleanRef.startsWith(bookName)) {
          book = abbrev;
          chapterVerse = cleanRef.slice(bookName.length).trim();
          break;
        }
      }

      if (!book) {
        const firstWord = cleanRef.split(' ')[0];
        for (const [bookName, abbrev] of Object.entries(bookMappings)) {
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

      const englishBookName = this.primaryBooksData.find(b => b.id === book)?.name || book;
      
      return {
        book,
        chapter: parseInt(chapter),
        verse: verse ? parseInt(verse) : null,
        fullRef: `${book} ${chapter}:${verse || ''}`.trim(),
        displayRef: `${englishBookName} ${chapter}${verse ? ':' + verse : ''}`,
        apiType: 'primary'
      };
    } else {
      // Fallback API book mappings (English abbreviations)
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
        fullRef: `${book} ${chapterVerse}`.toUpperCase(),
        displayRef: reference,
        apiType: 'fallback'
      };
    }
  }

  // Get a specific verse - uses appropriate API
  async getVerse(reference, version = this.defaultVersion) {
    const parsedRef = this.parseReference(reference, version);
    if (!parsedRef) {
      throw new Error('Invalid Bible reference');
    }

    const { book, chapter, verse, fullRef, displayRef, apiType } = parsedRef;
    const cacheKey = `${fullRef}_${version}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check offline verses first
    if (this.offlineVerses.has(fullRef)) {
      const offlineVerse = this.offlineVerses.get(fullRef)[version];
      if (offlineVerse) {
        const result = {
          reference: displayRef,
          text: offlineVerse,
          version: version,
          fullReference: fullRef,
          offline: true
        };
        this.cache.set(cacheKey, result);
        return result;
      }
    }

    try {
      let result;
      
      if (apiType === 'primary') {
        // Use primary API - FIX: Use relative path
        const data = await this.apiCall(`/verses/${version}/${book}/${chapter}/${verse}`, 'primary');

        result = {
          reference: displayRef,
          text: data.text,
          version: version,
          book: book,
          chapter: chapter,
          verse: verse,
          bookInfo: data.book
        };
      } else {
        // Use fallback API
        if (version !== 'BSB') {
          const fallbackText = this.offlineVerses.get(fullRef)?.[version] 
            || `"${reference}" - Available in BSB version only.`;
          
          result = {
            reference: reference,
            text: fallbackText,
            version: version,
            fullReference: fullRef,
            error: true,
            offline: true
          };
        } else {
          const chapterData = await this.getChapter(book, chapter, version);
          const verseContent = this.extractVerseFromChapter(chapterData, verse);
          
          if (!verseContent) {
            throw new Error(`Verse ${verse} not found in ${book} ${chapter}`);
          }

          result = {
            reference: reference,
            text: verseContent,
            version: version,
            fullReference: fullRef,
            chapterData: chapterData
          };
        }
      }

      // Cache the result
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, result);
      
      return result;

    } catch (error) {
      console.warn('Failed to fetch verse from API:', error);
      
      const fallbackText = this.offlineVerses.get(fullRef)?.[version] 
        || `"${reference}" - Unable to fetch verse at this time.`;
      
      const fallbackResult = {
        reference: displayRef || reference,
        text: fallbackText,
        version: version,
        fullReference: fullRef,
        error: true,
        offline: true
      };
      
      return fallbackResult;
    }
  }

  // FIXED: Get an entire chapter - uses appropriate API
  async getChapter(book, chapter, version = this.defaultVersion) {
    const cacheKey = `${version}_${book}_${chapter}`;
    
    if (this.chapterCache.has(cacheKey)) {
      return this.chapterCache.get(cacheKey);
    }

    const apiType = this.getApiForVersion(version);

    try {
      let result;
      
      if (apiType === 'primary') {
        // Use primary API - FIX: Use relative path
        const data = await this.apiCall(`/verses/${version}/${book}/${chapter}`, 'primary');

        result = {
          book: data.book,
          chapter: data.chapter,
          verses: data.verses,
          version: version
        };
      } else {
        // Use fallback API - FIX: Use relative path
        if (version !== 'BSB') {
          const mockChapter = this.createMockChapter(book, chapter, version);
          result = mockChapter;
        } else {
          const data = await this.apiCall(`/${version}/${book}/${chapter}.json`, 'fallback');
          result = data;
        }
      }

      // Cache the result
      if (this.chapterCache.size >= this.maxCacheSize) {
        const firstKey = this.chapterCache.keys().next().value;
        this.chapterCache.delete(firstKey);
      }
      
      this.chapterCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Failed to fetch ${book} ${chapter}:`, error);
      
      const mockChapter = this.createMockChapter(book, chapter, version);
      this.chapterCache.set(cacheKey, mockChapter);
      return mockChapter;
    }
  }

  // Create mock chapter data for offline use
  createMockChapter(book, chapter, version) {
    const bookData = this.fallbackBooksData.find(b => b.id === book) || this.primaryBooksData.find(b => b.id === book);
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

  // Extract specific verse text from chapter data (for fallback API)
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

  // Get random verse - uses appropriate API
  async getRandomVerse(version = this.defaultVersion) {
    const apiType = this.getApiForVersion(version);
    
    if (apiType === 'primary') {
      try {
        const data = await this.apiCall(`/verses/${version}/random`, 'primary');
        
        const bookName = this.primaryBooksData.find(b => b.id === data.book.abbrev.pt)?.name || data.book.name;
        
        return {
          reference: `${bookName} ${data.chapter}:${data.number}`,
          text: data.text,
          version: version,
          book: data.book.abbrev.pt,
          chapter: data.chapter,
          verse: data.number,
          bookInfo: data.book
        };
      } catch (error) {
        console.error('Failed to fetch random verse from primary API:', error);
        // Fallback to a default verse
        return await this.getVerse('John 3:16', version);
      }
    } else {
      // For fallback API, use rotating daily verses
      const dailyVerses = [
        'John 3:16',
        'Philippians 4:13',
        'Psalm 23:1',
        'Jeremiah 29:11',
        'Romans 8:28',
        'Isaiah 41:10',
        'Matthew 11:28'
      ];

      const dailyIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % dailyVerses.length;
      const selectedRef = dailyVerses[dailyIndex];

      return await this.getVerse(selectedRef, version);
    }
  }

  // FIXED: Search verses - uses appropriate API
  async searchVerses(query, version = this.defaultVersion, limit = 20) {
    if (!query.trim()) {
      return [];
    }

    const apiType = this.getApiForVersion(version);
    
    if (apiType === 'primary') {
      try {
        const response = await fetch(`${this.primaryBaseUrl}/verses/search`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
          },
          body: JSON.stringify({
            version: version,
            search: query
          })
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        
        return data.verses.slice(0, limit).map(verse => {
          const bookName = this.primaryBooksData.find(b => b.id === verse.book.abbrev.pt)?.name || verse.book.name;
          return {
            reference: `${bookName} ${verse.chapter}:${verse.number}`,
            text: verse.text,
            version: version,
            book: verse.book.abbrev.pt,
            chapter: verse.chapter,
            verse: verse.number,
            bookInfo: verse.book
          };
        });
      } catch (error) {
        console.error('Search failed:', error);
        // Fallback to offline search
        return this.offlineSearch(query, version, limit);
      }
    } else {
      // For fallback API, use offline search only
      return this.offlineSearch(query, version, limit);
    }
  }

  // Offline search fallback
  offlineSearch(query, version, limit) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    for (const [ref, versions] of this.offlineVerses.entries()) {
      if (results.length >= limit) break;
      
      const text = versions[version];
      if (text && text.toLowerCase().includes(queryLower)) {
        const [bookAbbr, chapterVerse] = ref.split(' ');
        const bookName = this.fallbackBooksData.find(b => b.id === bookAbbr)?.name || bookAbbr;
        
        results.push({
          reference: `${bookName} ${chapterVerse}`,
          text: text,
          version: version,
          book: bookAbbr,
          chapter: parseInt(chapterVerse.split(':')[0]),
          verse: parseInt(chapterVerse.split(':')[1]),
          offline: true
        });
      }
    }

    return results;
  }

  // Get daily verse
  async getDailyVerse(version = this.defaultVersion) {
    try {
      return await this.getRandomVerse(version);
    } catch (error) {
      console.error('Error getting daily verse:', error);
      // Fallback to John 3:16
      return await this.getVerse('John 3:16', version);
    }
  }

  // Get all available versions
  getAvailableVersions() {
    return this.versions;
  }

  // Get version name by ID
  getVersionName(versionId) {
    const version = this.versions.find(v => v.id === versionId);
    return version ? version.name : 'Unknown Version';
  }

  // Bookmark management
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

  clearCache() {
    this.cache.clear();
    this.chapterCache.clear();
    toast.success('Bible cache cleared');
  }

  getCacheSize() {
    return this.cache.size + this.chapterCache.size;
  }
}

const unifiedBibleService = new UnifiedBibleService();
export default unifiedBibleService;
