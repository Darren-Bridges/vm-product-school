import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// API key validation (in production, this should be more secure)
const VALID_API_KEYS = ['test-api-key-123', 'mp3-api-key', 'pos2-api-key'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey ? VALID_API_KEYS.includes(apiKey) : false;
}

interface Category {
  id: string;
  name: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  created_at: string;
  categories?: Category[];
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const { context } = await request.json();

    if (!context) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    // Extract context information
    const { app, page, module, userRole, businessType } = context;

    // Build search query based on context
    let categoryFilter = '';

    // Map context to search terms and categories
    if (module) {
      switch (module.toLowerCase()) {
        case 'inventory':
          categoryFilter = 'inventory';
          break;
        case 'orders':
          categoryFilter = 'orders';
          break;
        case 'reports':
          categoryFilter = 'reports';
          break;
        case 'customers':
          categoryFilter = 'customers';
          break;
        case 'settings':
          categoryFilter = 'settings';
          break;
        default:
          // If module is not recognized, use the module name as a category filter
          categoryFilter = module;
      }
    } else if (page) {
      // Extract module from page path
      const pathParts = page.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        categoryFilter = pathParts[0];
      }
    }

    // Query articles based on context
    let query = supabase
      .from('articles')
      .select(`
        id,
        title,
        slug,
        content,
        status,
        access_level,
        created_at,
        categories (
          id,
          name
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(10);

    // Apply category filter if available
    if (categoryFilter) {
      query = query.contains('categories.name', [categoryFilter]);
    }

    const { data: articles, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    // Process articles for widget display
    const processedArticles = (articles || []).map((article: Article) => {
      // Extract excerpt from content (first 150 characters)
      const excerpt = article.content 
        ? article.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
        : '';

      return {
        id: article.id,
        title: article.title,
        excerpt,
        url: `/articles/${article.slug}`,
        categories: article.categories?.map((cat: Category) => cat.name) || [],
        created_at: article.created_at,
      };
    });

    // If no context-specific articles found, return recent articles
    if (processedArticles.length === 0) {
      const { data: recentArticles, error: recentError } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          content,
          created_at,
          categories (
            id,
            name
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Database error:', recentError);
        return NextResponse.json(
          { error: 'Failed to fetch articles' },
          { status: 500 }
        );
      }

      const recentProcessed = (recentArticles || []).map((article: Article) => ({
        id: article.id,
        title: article.title,
        excerpt: article.content 
          ? article.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
          : '',
        url: `/articles/${article.slug}`,
        categories: article.categories?.map((cat: Category) => cat.name) || [],
        created_at: article.created_at,
      }));

      return NextResponse.json({
        articles: recentProcessed,
        context: { app, page, module, userRole, businessType },
        message: 'Showing recent articles (no context-specific content found)',
      });
    }

    return NextResponse.json({
      articles: processedArticles,
      context: { app, page, module, userRole, businessType },
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 