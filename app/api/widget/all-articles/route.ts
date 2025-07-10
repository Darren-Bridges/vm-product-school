import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const VALID_API_KEYS = ['test-api-key-123', 'mp3-api-key', 'pos2-api-key'];
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey ? VALID_API_KEYS.includes(apiKey) : false;
}

interface Category {
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

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Fetch all published articles with categories
  const { data: articles, error } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      slug,
      content,
      created_at,
      updated_at,
      categories (
        name
      )
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error || !articles) {
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }

  // Process articles for widget display
  const processed = (articles as Article[]).map((article) => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    content: article.content,
    categories: article.categories?.map((cat) => cat.name) || [],
    created_at: article.created_at,
    updated_at: article.updated_at,
  }));

  return NextResponse.json({ articles: processed });
} 