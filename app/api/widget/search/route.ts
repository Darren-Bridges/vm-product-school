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

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const role = searchParams.get('role');
    let allowedAccess;
    if (role === 'superadmin') {
      allowedAccess = ['public', 'external_clients', 'vm_internal'];
    } else if (role) {
      allowedAccess = ['public', 'external_clients'];
    } else {
      allowedAccess = ['public'];
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Search articles by title and content, filter by access_level
    const { data: articles, error } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        slug,
        content,
        created_at,
        access_level,
        path,
        categories (
          id,
          name
        )
      `)
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .in('access_level', allowedAccess)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to search articles' },
        { status: 500 }
      );
    }

    // Process articles for widget display
    const processedArticles = (articles || []).map(article => {
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
        access_level: article.access_level,
        path: article.path,
      };
    });

    return NextResponse.json({
      articles: processedArticles,
      query,
      total: processedArticles.length,
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 