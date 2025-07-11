/**
 * Help Widget SDK
 * Provides contextual help within MP3 and POS2 applications
 */

(function() {
  'use strict';

  // Widget configuration
  let config = {
    apiKey: null,
    appId: null,
    position: 'bottom-right',
    theme: 'dark', // FORCE DARK MODE for testing
    apiBaseUrl: window.location.origin + '/api/widget',
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
  };

  // Widget state
  let state = {
    isOpen: false,
    isLoading: false,
    currentContext: null,
    cachedContent: new Map(),
    currentArticle: null,
    viewMode: 'list', // 'list' or 'article'
  };

  // Add to state
  let allArticles = null;
  let allArticlesLoaded = false;
  let allArticlesFetchedAt = 0;
  const ALL_ARTICLES_CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

  // DOM elements
  let elements = {
    container: null,
    button: null,
    sidebar: null,
    content: null,
    search: null,
    closeButton: null,
  };

  /**
   * Detect current theme
   * @returns {string} - 'light' or 'dark'
   */
  function detectTheme() {
    console.log('HelpWidget: detectTheme config.theme =', config.theme);
    if (config.theme === 'auto') {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('HelpWidget: matchMedia dark mode =', isDark);
      if (isDark) {
        return 'dark';
      }
      return 'light';
    }
    return config.theme;
  }

  /**
   * Apply theme to widget
   * @param {string} theme - 'light' or 'dark'
   */
  function applyTheme(theme) {
    if (elements.container) {
      elements.container.className = `help-widget help-widget--${theme}`;
      console.log('HelpWidget: Theme class applied:', elements.container.className);
      if (elements.sidebar) {
        console.log('HelpWidget: Sidebar element style before:', elements.sidebar.style.background);
      }
    }
  }

  /**
   * Initialize the help widget
   * @param {Object} options - Configuration options
   */
  function init(options = {}) {
    console.log('HelpWidget: Initializing with options:', options);
    
    // Merge configuration
    config = { ...config, ...options };
    console.log('HelpWidget: Final config after merge:', config);
    
    if (!config.apiKey) {
      console.error('HelpWidget: API key is required');
      return;
    }

    // Detect and apply theme
    const currentTheme = detectTheme();
    console.log('HelpWidget: Detected theme:', currentTheme);

    console.log('HelpWidget: Creating widget elements...');
    // Create widget elements
    createWidgetElements();
    
    console.log('HelpWidget: Injecting widget into DOM...');
    // Inject into DOM
    injectWidget();
    
    // Apply theme
    applyTheme(currentTheme);
    
    console.log('HelpWidget: Setting up event listeners...');
    // Set up event listeners
    setupEventListeners();
    
    // Set up theme change listener if using auto theme
    if (config.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        console.log('HelpWidget: Theme changed to:', newTheme);
        applyTheme(newTheme);
      });
    }
    
    // Load initial content if context is provided
    if (config.initialContext) {
      loadContextualContent(config.initialContext);
    }
    
    console.log('HelpWidget: Initialized successfully');
    console.log('HelpWidget: Widget container:', elements.container);
    console.log('HelpWidget: Widget button:', elements.button);
    
    // Force the button to be visible for debugging
    if (elements.button) {
      elements.button.style.position = 'fixed';
      elements.button.style.bottom = '20px';
      elements.button.style.right = '20px';
      elements.button.style.zIndex = '99999';
      console.log('HelpWidget: Button positioned and should be visible');
    }
  }

  /**
   * Create widget DOM elements
   */
  function createWidgetElements() {
    // Main container
    elements.container = document.createElement('div');
    elements.container.id = 'help-widget-container';
    elements.container.className = `help-widget help-widget--${config.theme}`;
    
    // Floating button
    elements.button = document.createElement('button');
    elements.button.className = 'help-widget__button';
    elements.button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#8C4FFB" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    `;
    
    // Sidebar panel
    elements.sidebar = document.createElement('div');
    elements.sidebar.className = 'help-widget__sidebar';
    elements.sidebar.innerHTML = `
      <button class="help-widget__sidebar-close" aria-label="Close help" type="button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="help-widget__brand-header">
        <img src="https://vm-product-school.vercel.app/VMlogo.62080a51e68bffbddd39660df08de35e.svg" alt="VM Logo" class="help-widget__logo" width="32" height="32" />
        <div class="help-widget__brand-titles">
          <span class="help-widget__brand-title">Product School</span>
          <span class="help-widget__brand-subtitle">Help Centre</span>
        </div>
      </div>
      <div class="help-widget__search">
        <input type="text" placeholder="Search help articles..." class="help-widget__search-input">
      </div>
      <div class="help-widget__content">
        <div class="help-widget__loading">Loading...</div>
      </div>
    `;

    // Add close button event handler
    const sidebarCloseBtn = elements.sidebar.querySelector('.help-widget__sidebar-close');
    if (sidebarCloseBtn) {
      sidebarCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebar();
      });
    }

    // Remove the 'Browse all articles' button and related logic
    // (No code for browseAllLink, showAllArticlesView, or renderAllArticlesByCategory)
    
    // Get references to inner elements
    elements.closeButton = elements.sidebar.querySelector('.help-widget__close');
    elements.backButton = elements.sidebar.querySelector('.help-widget__back');
    elements.search = elements.sidebar.querySelector('.help-widget__search-input');
    elements.content = elements.sidebar.querySelector('.help-widget__content');
    
    // Append elements
    elements.container.appendChild(elements.button);
    elements.container.appendChild(elements.sidebar);
  }

  /**
   * Inject widget into DOM
   */
  function injectWidget() {
    console.log('HelpWidget: Injecting styles...');
    // Add styles
    if (!document.getElementById('help-widget-styles')) {
      const style = document.createElement('style');
      style.id = 'help-widget-styles';
      style.textContent = getWidgetStyles();
      document.head.appendChild(style);
      console.log('HelpWidget: Styles added');
    }
    
    console.log('HelpWidget: Adding widget to body...');
    // Add widget to body
    document.body.appendChild(elements.container);
    console.log('HelpWidget: Widget added to body');
    console.log('HelpWidget: Body children count:', document.body.children.length);
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Toggle sidebar
    if (elements.button) elements.button.addEventListener('click', toggleSidebar);
    if (elements.closeButton) elements.closeButton.addEventListener('click', closeSidebar);
    if (elements.backButton) elements.backButton.addEventListener('click', goBackToList);
    
    // Search functionality
    if (elements.search) elements.search.addEventListener('input', debounce(handleSearch, 300));
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isOpen) {
        if (state.viewMode === 'article') {
          goBackToList();
        } else {
          closeSidebar();
        }
      }
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (state.isOpen && !elements.container.contains(e.target)) {
        closeSidebar();
      }
    });
    
    // Prevent closing when clicking inside the sidebar content
    if (elements.content) elements.content.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Toggle sidebar visibility
   */
  function toggleSidebar() {
    if (state.isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  /**
   * Open sidebar
   */
  function openSidebar() {
    state.isOpen = true;
    elements.container.classList.add('help-widget--open');
    elements.search.focus();
    const now = Date.now();
    let showDefaultArticle = false;
    let defaultArticle = null;
    // If a path is provided, try to fetch the article by path
    if (config.path) {
      showLoading();
      fetch(withRoleParam(`${config.apiBaseUrl}/article-by-path?path=${encodeURIComponent(config.path)}`), {
        headers: { 'X-API-Key': config.apiKey },
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.article) {
            defaultArticle = data.article;
            renderArticleContent(defaultArticle);
            state.currentArticle = defaultArticle;
            state.viewMode = 'article';
          } else {
            // If not found, fall back to list view after fetching all articles
            fetchAllArticlesAndShowList();
          }
        })
        .catch(() => {
          fetchAllArticlesAndShowList();
        });
      return;
    }
    // If no path, just fetch all articles and show list
    fetchAllArticlesAndShowList();
    function fetchAllArticlesAndShowList() {
      if (!allArticlesLoaded || (now - allArticlesFetchedAt > ALL_ARTICLES_CACHE_EXPIRY)) {
        showLoading();
        fetch(withRoleParam(`${config.apiBaseUrl}/all-articles`), {
          headers: { 'X-API-Key': config.apiKey },
        })
          .then(res => res.json())
          .then(data => {
            allArticles = data.articles || [];
            allArticlesLoaded = true;
            allArticlesFetchedAt = Date.now();
            renderContent({ articles: allArticles });
          })
          .catch(err => {
            showError('Failed to load articles');
          });
        return;
      }
      // Load content if not already loaded
      if (!elements.content.children.length || elements.content.querySelector('.help-widget__loading')) {
        renderContent({ articles: allArticles });
      }
    }
  }

  /**
   * Close sidebar
   */
  function closeSidebar() {
    state.isOpen = false;
    elements.container.classList.remove('help-widget--open');
  }

  /**
   * Load contextual content based on current context
   * @param {Object} context - Context object from the application
   */
  function loadContextualContent(context) {
    state.currentContext = context;
    
    // Check cache first
    const cacheKey = JSON.stringify(context);
    const cached = state.cachedContent.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < config.cacheExpiry) {
      renderContent(cached.data);
      return;
    }
    
    // Fetch from API
    state.isLoading = true;
    showLoading();
    
    fetch(withRoleParam(`${config.apiBaseUrl}/contextual`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify({ context }),
    })
    .then(response => response.json())
    .then(data => {
      // Cache the result
      state.cachedContent.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      
      renderContent(data);
    })
    .catch(error => {
      console.error('HelpWidget: Failed to load contextual content', error);
      showError('Failed to load help content');
    })
    .finally(() => {
      state.isLoading = false;
    });
  }

  /**
   * Load default content when no context is provided
   */
  function loadDefaultContent() {
    showLoading();
    
    fetch(withRoleParam(`${config.apiBaseUrl}/default`), {
      headers: {
        'X-API-Key': config.apiKey,
      },
    })
    .then(response => response.json())
    .then(data => {
      renderContent(data);
    })
    .catch(error => {
      console.error('HelpWidget: Failed to load default content', error);
      showError('Failed to load help content');
    });
  }

  /**
   * Handle search input
   * @param {Event} event - Search input event
   */
  function handleSearch(event) {
    const query = event.target.value.trim().toLowerCase();
    if (!allArticlesLoaded || !allArticles) {
      showLoading();
      return;
    }
    if (query.length < 2) {
      renderContent({ articles: allArticles });
      return;
    }
    // Remote search
    searchContent(query);
  }

  /**
   * Search for content
   * @param {string} query - Search query
   */
  function searchContent(query) {
    showLoading();
    
    fetch(withRoleParam(`${config.apiBaseUrl}/search?q=${encodeURIComponent(query)}`), {
      headers: {
        'X-API-Key': config.apiKey,
      },
    })
    .then(response => response.json())
    .then(data => {
      renderContent(data);
    })
    .catch(error => {
      console.error('HelpWidget: Search failed', error);
      showError('Search failed');
    });
  }

  /**
   * Render content in the sidebar
   * @param {Object} data - Content data
   */
  function renderContent(data) {
    if (!data.articles || data.articles.length === 0) {
      elements.content.innerHTML = '<div class="help-widget__empty">No help content found</div>';
      return;
    }

    // Group articles by category
    const categoryMap = {};
    const uncategorized = [];
    data.articles.forEach(article => {
      if (article.categories && article.categories.length > 0) {
        article.categories.forEach(cat => {
          if (!categoryMap[cat]) categoryMap[cat] = [];
          categoryMap[cat].push(article);
        });
      } else {
        uncategorized.push(article);
      }
    });

    let html = '';
    // Render each category group
    Object.keys(categoryMap).sort().forEach(cat => {
      html += `<div class="help-widget__category-group">
        <div class="help-widget__category-title">${cat}</div>`;
      categoryMap[cat].forEach(article => {
        let text = article.content ? article.content.replace(/<[^>]+>/g, '') : '';
        let preview = text.length > 120 ? text.slice(0, 120) + '…' : text;
        html += `
          <div class="help-widget__article">
            <h4 class="help-widget__article-title">
              <a href="#" data-article-id="${article.id}" class="help-widget__article-link">
                ${article.title}
              </a>
            </h4>
            <p class="help-widget__article-excerpt">${preview}</p>
          </div>
        `;
      });
      html += '</div>';
    });
    // Render uncategorized articles
    if (uncategorized.length > 0) {
      html += `<div class="help-widget__category-group">
        <div class="help-widget__category-title">Other</div>`;
      uncategorized.forEach(article => {
        let text = article.content ? article.content.replace(/<[^>]+>/g, '') : '';
        let preview = text.length > 120 ? text.slice(0, 120) + '…' : text;
        html += `
          <div class="help-widget__article">
            <h4 class="help-widget__article-title">
              <a href="#" data-article-id="${article.id}" class="help-widget__article-link">
                ${article.title}
              </a>
            </h4>
            <p class="help-widget__article-excerpt">${preview}</p>
          </div>
        `;
      });
      html += '</div>';
    }

    elements.content.innerHTML = html;
    // Add click handlers for article links
    const articleLinks = elements.content.querySelectorAll('.help-widget__article-link');
    articleLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        const articleId = link.getAttribute('data-article-id');
        loadArticleContent(articleId);
      });
    });
  }

  /**
   * Show loading state
   */
  function showLoading() {
    elements.content.innerHTML = '<div class="help-widget__loading">Loading...</div>';
  }

  /**
   * Show error state
   * @param {string} message - Error message
   */
  function showError(message) {
    elements.content.innerHTML = `<div class="help-widget__error">${message}</div>`;
  }

  /**
   * Load article content
   * @param {string} articleId - Article ID
   */
  function loadArticleContent(articleId) {
    // Try to find in cache first
    if (allArticlesLoaded && allArticles) {
      const article = allArticles.find(a => a.id === articleId);
      if (article) {
        renderArticleContent(article);
        state.currentArticle = article;
        state.viewMode = 'article';
        return;
      }
    }
    // Fallback to API fetch (should rarely happen)
    showLoading();
    fetch(`${config.apiBaseUrl}/article/${articleId}`, {
      headers: {
        'X-API-Key': config.apiKey,
      },
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        showError(data.error);
        return;
      }
      state.currentArticle = data.article;
      state.viewMode = 'article';
      renderArticleContent(data.article);
      updateHeaderForArticle();
      if (!state.isOpen) {
        openSidebar();
      }
    })
    .catch(error => {
      console.error('HelpWidget: Failed to load article', error);
      showError('Failed to load article');
    });
  }

  /**
   * Render article content
   * @param {Object} article - Article data
   */
  function renderArticleContent(article) {
    const html = `
      <div class="help-widget__article-view">
        <button class="help-widget__back-to-list" type="button">← Back to Help Center</button>
        <h2 class="help-widget__article-title">${article.title}</h2>
        <div class="help-widget__article-meta">
          <span class="help-widget__article-date">${new Date(article.created_at).toLocaleDateString()}</span>
          ${article.categories && article.categories.length > 0 ? 
            `<span class="help-widget__article-categories">${article.categories.join(', ')}</span>` : 
            ''
          }
        </div>
        <div class="help-widget__article-content tiptap">
          ${article.content}
        </div>
      </div>
    `;
    
    elements.content.innerHTML = html;
    // Add back button handler
    const backBtn = elements.content.querySelector('.help-widget__back-to-list');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        renderContent({ articles: allArticles });
        state.viewMode = 'list';
        state.currentArticle = null;
      });
    }
  }

  /**
   * Update header for article view
   */
  function updateHeaderForArticle() {
    // No-op: header has been removed from the sidebar
  }

  /**
   * Go back to list view
   */
  function goBackToList() {
    state.viewMode = 'list';
    state.currentArticle = null;
    
    const header = elements.sidebar.querySelector('.help-widget__header h3');
    header.textContent = 'Help Center';
    elements.backButton.style.display = 'none';
    elements.search.style.display = 'block';
    
    // Reload the previous content
    if (state.currentContext) {
      loadContextualContent(state.currentContext);
    } else {
      loadDefaultContent();
    }
  }

  /**
   * Update context (called by the application)
   * @param {Object} context - New context object
   */
  function updateContext(context) {
    loadContextualContent(context);
  }

  /**
   * Utility: Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Get widget styles
   * @returns {string} CSS styles
   */
  function getWidgetStyles() {
    return `
      .help-widget {
        position: fixed;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .help-widget--bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .help-widget--bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .help-widget--top-right {
        top: 20px;
        right: 20px;
      }
      
      .help-widget--top-left {
        top: 20px;
        left: 20px;
      }
      
      .help-widget__button {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: none;
        background: #8C4FFB;
        color: white;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .help-widget__button:hover {
        background:rgb(131, 70, 242);
        transform: scale(1.1);
      }
      
      .help-widget__sidebar {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 400px;
        height: 600px;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 2px 2px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        display: none;
        flex-direction: column;
        overflow: hidden;
      }
      
      .help-widget--open .help-widget__sidebar {
        display: flex;
      }
      
      .help-widget__header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .help-widget__header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      
      .help-widget__close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        color: #666;
      }
      
      .help-widget__close:hover {
        color: #333;
      }
      
      .help-widget__search {
        padding: 20px;
        border-bottom: 1px solid #eee;
      }
      
      .help-widget__search-input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .help-widget__content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        position: relative;
      }
      
      .help-widget__article {
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      }
      
      .help-widget__article:last-child {
        border-bottom: none;
      }
      
      .help-widget__article-title {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .help-widget__article-title a {
        color: #000000;
        text-decoration: none;
      }

      .help-widget--dark .help-widget__article-title a {
        color: #ffffff;
        text-decoration: none;
      }
      
      .help-widget__article-title a:hover {
        text-decoration: underline;
      }
      
      .help-widget__article-excerpt {
        margin: 0;
        color: #666;
        font-size: 14px;
        line-height: 1.4;
        max-height: 2.8em;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .help-widget--dark .help-widget__article-excerpt {
        color: #bbb;
      }
      
      .help-widget__loading,
      .help-widget__empty,
      .help-widget__error {
        text-align: center;
        padding: 40px 20px;
        color: #666;
      }
      
      .help-widget__error {
        color: #dc3545;
      }
      
      .help-widget__back {
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        color: #666;
        margin-right: 10px;
      }
      
      .help-widget__back:hover {
        color: #333;
      }
      
      .help-widget__article-view {
        padding: 0;
      }
      
      .help-widget__article-view .help-widget__article-title {
        font-size: 20px;
        margin-bottom: 10px;
        color: #333;
      }
      
      .help-widget__article-meta {
        margin-bottom: 20px;
        font-size: 12px;
        color: #666;
      }
      
      .help-widget__article-date {
        margin-right: 10px;
      }
      
      .help-widget__article-categories {
        background: #f0f0f0;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
      }
      
      .help-widget__article-content {
        line-height: 1.6;
        color: #333;
      }
      
      /* TipTap styles to match article pages */
      .help-widget__article-content.tiptap {
        line-height: 1.6;
        color: #333;
      }
      
      .help-widget__article-content.tiptap h1,
      .help-widget__article-content.tiptap h2,
      .help-widget__article-content.tiptap h3,
      .help-widget__article-content.tiptap h4,
      .help-widget__article-content.tiptap h5,
      .help-widget__article-content.tiptap h6 {
        margin: 20px 0 10px 0;
        color: #333;
        font-weight: 600;
      }
      
      .help-widget__article-content.tiptap h1 {
        font-size: 1.5em;
      }
      
      .help-widget__article-content.tiptap h2 {
        font-size: 1.3em;
      }
      
      .help-widget__article-content.tiptap h3 {
        font-size: 1.1em;
      }
      
      .help-widget__article-content.tiptap p {
        margin: 0 0 15px 0;
      }
      
      .help-widget__article-content.tiptap ul,
      .help-widget__article-content.tiptap ol {
        margin: 0 0 15px 20px;
        padding-left: 20px;
        list-style-position: outside;
      }
      
      .help-widget__article-content.tiptap ul {
        list-style-type: disc;
      }
      
      .help-widget__article-content.tiptap ol {
        list-style-type: decimal;
      }
      
      .help-widget__article-content.tiptap li {
        margin: 0 0 5px 0;
        display: list-item;
      }
      
      .help-widget__article-content.tiptap a {
        color: #007bff;
        text-decoration: none;
      }
      
      .help-widget__article-content.tiptap a:hover {
        text-decoration: underline;
      }
      
      .help-widget__article-content.tiptap code {
        background: #f5f5f5;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 0.9em;
      }
      
      .help-widget__article-content.tiptap pre {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
        margin: 15px 0;
      }
      
      .help-widget__article-content.tiptap pre code {
        background: none;
        padding: 0;
      }
      
      .help-widget__article-content.tiptap blockquote {
        border-left: 4px solid #007bff;
        margin: 15px 0;
        padding-left: 15px;
        color: #666;
        font-style: italic;
      }
      
      .help-widget__article-content.tiptap img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 10px 0;
      }
      
      .help-widget__article-content.tiptap strong {
        font-weight: 600;
      }
      
      .help-widget__article-content.tiptap em {
        font-style: italic;
      }
      
      .help-widget__article-content.tiptap mark {
        background: #fef08a;
        padding: 2px 4px;
        border-radius: 2px;
      }
      
      .help-widget__article-content.tiptap u {
        text-decoration: underline;
      }
      
      /* Dark theme */
      html body .help-widget.help-widget--dark > .help-widget__sidebar,
      .help-widget--dark .help-widget__sidebar {
        background: #18181b !important;
        color: #f3f3f3 !important;
        border-color: #333 !important;
      }
      
      .help-widget--dark .help-widget__header {
        border-bottom-color: #333;
      }
      
      .help-widget--dark .help-widget__header h3 {
        color: white;
      }
      
      .help-widget--dark .help-widget__close,
      .help-widget--dark .help-widget__back {
        color: #ccc;
      }
      
      .help-widget--dark .help-widget__close:hover,
      .help-widget--dark .help-widget__back:hover {
        color: white;
      }
      
      .help-widget--dark .help-widget__search {
        border-bottom-color: #333;
      }
      
      .help-widget--dark .help-widget__search-input {
        background: #2a2a2a;
        border-color: #444;
        color: white;
      }
      
      .help-widget--dark .help-widget__search-input::placeholder {
        color: #999;
      }
      
      .help-widget--dark .help-widget__article {
        border-bottom-color: #333;
      }
      
      .help-widget--dark .help-widget__article-title a {
        color: #ff;
      }
      
      .help-widget--dark .help-widget__article-title a:hover {
        color: #fff;
      }
      
      .help-widget--dark .help-widget__article-excerpt {
        color: #ccc;
      }
      
      .help-widget--dark .help-widget__loading,
      .help-widget--dark .help-widget__empty,
      .help-widget--dark .help-widget__error {
        color: #ccc;
      }
      
      .help-widget--dark .help-widget__error {
        color: #ff6b6b;
      }
      
      .help-widget--dark .help-widget__article-view .help-widget__article-title {
        color: white;
      }
      
      .help-widget--dark .help-widget__article-meta {
        color: #999;
      }
      
      .help-widget--dark .help-widget__article-categories {
        background: #333;
        color: #ccc;
      }
      
      /* Dark theme TipTap styles */
      .help-widget--dark .help-widget__article-content.tiptap {
        color: #e0e0e0;
      }
      
      .help-widget--dark .help-widget__article-content.tiptap h1,
      .help-widget--dark .help-widget__article-content.tiptap h2,
      .help-widget--dark .help-widget__article-content.tiptap h3,
      .help-widget--dark .help-widget__article-content.tiptap h4,
      .help-widget--dark .help-widget__article-content.tiptap h5,
      .help-widget--dark .help-widget__article-content.tiptap h6 {
        color: white;
      }
      
      .help-widget--dark .help-widget__article-content.tiptap a {
        color: #4da6ff;
      }
      
      .help-widget--dark .help-widget__article-content.tiptap a:hover {
        color: #66b3ff;
      }
      
      .help-widget--dark .help-widget__article-content.tiptap code {
        background: #2a2a2a;
        color: #e0e0e0;
      }
      
      .help-widget--dark .help-widget__article-content.tiptap pre {
        background: #2a2a2a;
        color: #e0e0e0;
      }
      
      .help-widget--dark .help-widget__article-content.tiptap blockquote {
        border-left-color: #4da6ff;
        color: #ccc;
      }
      
      .help-widget--dark .help-widget__article-content.tiptap mark {
        background: #fbbf24;
        color: #1a1a1a;
      }
      
      .help-widget--dark .help-widget__article-content.tiptap ul,
      .help-widget--dark .help-widget__article-content.tiptap ol {
        color: #e0e0e0;
      }
      
      .help-widget--dark .help-widget__article-content.tiptap li {
        color: #e0e0e0;
      }
      
      /* Brand header styles */
      .help-widget__brand-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 20px 8px 20px;
        border-bottom: none;
      }
      .help-widget__logo {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        background: white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      }
      .help-widget__brand-titles {
        display: flex;
        flex-direction: column;
      }
      .help-widget__brand-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: #222;
      }
      .help-widget__brand-subtitle {
        font-size: 0.95rem;
        color: #888;
        font-weight: 400;
        margin-top: 1px;
      }
      .help-widget--dark .help-widget__brand-title {
        color: #f3f3f3;
      }
      .help-widget--dark .help-widget__brand-subtitle {
        color: #bbb;
      }
      .help-widget--dark .help-widget__logo {
        background: #222;
      }
      
      .help-widget__sidebar-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        z-index: 10;
        padding: 4px;
        border-radius: 50%;
        transition: background 0.15s;
      }
      .help-widget__sidebar-close:hover {
        background: #f0f0f0;
        color: #333;
      }
      .help-widget--dark .help-widget__sidebar-close:hover {
        background: #222;
        color: #fff;
      }
      
      /* Mobile responsive */
      @media (max-width: 480px) {
        .help-widget__sidebar {
          width: 100vw;
          height: 100vh;
          left: 0;
          right: 0;
          bottom: 0;
          top: 0;
          border-radius: 0;
          position: fixed;
          z-index: 999999;
        }
        .help-widget--open .help-widget__sidebar {
          display: flex;
        }
      }
      /* Browse all articles styles */
      .help-widget__browse-all {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #007bff;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        padding: 0;
      }
      .help-widget__all-categories {
        padding: 0 20px 20px 20px;
      }
      .help-widget__category-group {
        margin-bottom: 18px;
      }
      .help-widget__category-title {
        font-size: 1.08rem;
        font-weight: 600;
        margin: 0 0 8px 0;
        color: #222;
        padding: 8px 0 8px 0;
      }
      .help-widget--dark .help-widget__category-title {
        color: #f3f3f3;
      }
      .help-widget__subcategory-group {
        margin-left: 16px;
        margin-bottom: 8px;
      }
      .help-widget__subcategory-title {
        font-size: 1rem;
        font-weight: 500;
        margin-bottom: 2px;
        color: #444;
      }
      .help-widget__article-list {
        list-style: disc inside;
        margin: 0 0 6px 16px;
        padding: 0;
      }
      .help-widget__article-list li {
        margin-bottom: 2px;
      }
      .help-widget__article-link {
        color: #007bff;
        text-decoration: none;
        cursor: pointer;
      }
      .help-widget__article-link:hover {
        text-decoration: underline;
      }
      .help-widget--dark .help-widget__category-title {
        color: #f3f3f3;
      }
      .help-widget--dark .help-widget__subcategory-title {
        color: #bbb;
      }
      .help-widget__back-to-list {
        display: inline-block;
        margin-bottom: 12px;
        background: none;
        border: none;
        color: #8C4FFB;
        font-size: 1rem;
        cursor: pointer;
        padding: 0;
        text-align: left;
      }
      .help-widget__back-to-list:hover {
        text-decoration: underline;
      }
      .help-widget--dark .help-widget__back-to-list {
        color: #8C4FFB;
      }
    `;
  }

  // Add function to fetch and render all articles grouped by category
  // This function is no longer needed as the 'Browse all articles' button is removed.
  // Keeping it here for now, but it will not be called by the new code.
  function showAllArticlesView() {
    showLoading();
    fetch(withRoleParam(`${config.apiBaseUrl}/categories`), {
      headers: { 'X-API-Key': config.apiKey },
    })
      .then(res => res.json())
      .then(data => {
        renderAllArticlesByCategory(data);
      })
      .catch(err => {
        showError('Failed to load categories');
      });
  }

  function renderAllArticlesByCategory(categories) {
    let html = '<div class="help-widget__all-categories">';
    categories.forEach(cat => {
      html += `<div class="help-widget__category-group">
        <div class="help-widget__category-title">${cat.name}</div>`;
      if (cat.articles && cat.articles.length > 0) {
        html += '<ul class="help-widget__article-list">';
        cat.articles.forEach(article => {
          html += `<li><a href="#" class="help-widget__article-link" data-article-id="${article.id}">${article.title}</a></li>`;
        });
        html += '</ul>';
      }
      if (cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories.forEach(subcat => {
          html += `<div class="help-widget__subcategory-group">
            <div class="help-widget__subcategory-title">${subcat.name}</div>`;
          if (subcat.articles && subcat.articles.length > 0) {
            html += '<ul class="help-widget__article-list">';
            subcat.articles.forEach(article => {
              html += `<li><a href="#" class="help-widget__article-link" data-article-id="${article.id}">${article.title}</a></li>`;
            });
            html += '</ul>';
          }
          html += '</div>';
        });
      }
      html += '</div>';
    });
    html += '</div>';
    elements.content.innerHTML = html;
    // Add click handlers for article links
    const articleLinks = elements.content.querySelectorAll('.help-widget__article-link');
    articleLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const articleId = link.getAttribute('data-article-id');
        loadArticleContent(articleId);
      });
    });
  }

  // Helper to append userRole as a query param
  function withRoleParam(url) {
    if (config.userRole) {
      return url + (url.includes('?') ? '&' : '?') + 'role=' + encodeURIComponent(config.userRole);
    }
    return url;
  }

  // Public API
  window.HelpWidget = {
    init,
    updateContext,
  };

  // Debug: Log that the script has loaded
  console.log('HelpWidget: Script loaded and ready');

})(); 