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
  access_level: string;
  path?: string;
  categories?: Category[];
}

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Get role from query param
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  let allowedAccess;
  if (role === 'superadmin') {
    allowedAccess = ['public', 'external_clients', 'vm_internal'];
  } else if (role) {
    allowedAccess = ['public', 'external_clients'];
  } else {
    allowedAccess = ['public'];
  }

  // Fetch all published articles with categories and access filter
  const { data: articles, error } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      slug,
      content,
      created_at,
      updated_at,
      access_level,
      path,
      categories (
        name
      )
    `)
    .in('access_level', allowedAccess)
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
    access_level: article.access_level,
    path: article.path,
  }));

  return NextResponse.json({ articles: processed });
} 