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
  updated_at: string;
  categories?: Category[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const { id: articleId } = await params;

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Get article by ID
    const { data: article, error } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        slug,
        content,
        created_at,
        updated_at,
        categories (
          id,
          name
        )
      `)
      .eq('id', articleId)
      .eq('status', 'published')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Process article for widget display
    const processedArticle = {
      id: (article as Article).id,
      title: (article as Article).title,
      slug: (article as Article).slug,
      content: (article as Article).content,
      categories: (article as Article).categories?.map((cat) => cat.name) || [],
      created_at: (article as Article).created_at,
      updated_at: (article as Article).updated_at,
    };

    return NextResponse.json({
      article: processedArticle,
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 