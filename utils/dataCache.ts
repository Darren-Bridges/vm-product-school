// Simple in-memory cache for categories and articles (client-side only)

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in ms

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class DataCache {
  private categories: CacheEntry<any[]> | null = null;
  private articles: CacheEntry<any[]> | null = null;
  private articleCategories: CacheEntry<any[]> | null = null;

  getCategories(): any[] | null {
    if (this.categories && Date.now() - this.categories.timestamp < CACHE_DURATION) {
      return this.categories.data;
    }
    return null;
  }

  setCategories(data: any[]) {
    this.categories = { data, timestamp: Date.now() };
  }

  clearCategories() {
    this.categories = null;
  }

  getArticles(): any[] | null {
    if (this.articles && Date.now() - this.articles.timestamp < CACHE_DURATION) {
      return this.articles.data;
    }
    return null;
  }

  setArticles(data: any[]) {
    this.articles = { data, timestamp: Date.now() };
  }

  clearArticles() {
    this.articles = null;
  }

  getArticleCategories(): any[] | null {
    if (this.articleCategories && Date.now() - this.articleCategories.timestamp < CACHE_DURATION) {
      return this.articleCategories.data;
    }
    return null;
  }

  setArticleCategories(data: any[]) {
    this.articleCategories = { data, timestamp: Date.now() };
  }

  clearArticleCategories() {
    this.articleCategories = null;
  }

  clearAll() {
    this.clearCategories();
    this.clearArticles();
    this.clearArticleCategories();
  }
}

export const dataCache = new DataCache();
export const clearArticlesCache = () => dataCache.clearArticles();
export const clearCategoriesCache = () => dataCache.clearCategories();
export const clearArticleCategoriesCache = () => dataCache.clearArticleCategories();
export const clearAllDataCache = () => dataCache.clearAll(); 