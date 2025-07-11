import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// API key validation (same as article/[id]/route.ts)
const VALID_API_KEYS = ['test-api-key-123', 'mp3-api-key', 'pos2-api-key'];
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey ? VALID_API_KEYS.includes(apiKey) : false;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  path?: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  articles: Article[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  articles: Article[];
  subcategories: Subcategory[];
}

// For initial fetches (no articles/subcategories yet)
interface RawCategory {
  id: string;
  name: string;
  slug: string;
  order?: number;
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

  // Fetch all top-level categories (parent_id is null)
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name, slug, order')
    .is('parent_id', null)
    .order('order', { ascending: true });

  if (catError || !categories) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }

  // For each category, fetch articles and subcategories
  const result: Category[] = await Promise.all((categories as RawCategory[]).map(async (cat) => {
    // Articles directly in this category
    const { data: articleIdsData } = await supabase
      .from('article_categories')
      .select('article_id')
      .eq('category_id', cat.id);
    let articles: Article[] = [];
    if (articleIdsData && articleIdsData.length > 0) {
      const articleIds = articleIdsData.map((item: { article_id: string }) => item.article_id);
      const { data: articlesData } = await supabase
        .from('articles')
        .select('id, title, slug, status, access_level, path')
        .in('id', articleIds)
        .in('access_level', allowedAccess)
        .eq('status', 'published');
      if (articlesData) articles = articlesData as Article[];
    }
    // Subcategories
    const { data: subcategoriesData } = await supabase
      .from('categories')
      .select('id, name, slug, order')
      .eq('parent_id', cat.id)
      .order('order', { ascending: true });
    let subcategories: Subcategory[] = [];
    if (subcategoriesData && subcategoriesData.length > 0) {
      subcategories = await Promise.all((subcategoriesData as RawCategory[]).map(async (subcat) => {
        const { data: subArticleIdsData } = await supabase
          .from('article_categories')
          .select('article_id')
          .eq('category_id', subcat.id);
        let subArticles: Article[] = [];
        if (subArticleIdsData && subArticleIdsData.length > 0) {
          const subArticleIds = subArticleIdsData.map((item: { article_id: string }) => item.article_id);
          const { data: subArticlesData } = await supabase
            .from('articles')
            .select('id, title, slug, status, access_level, path')
            .in('id', subArticleIds)
            .in('access_level', allowedAccess)
            .eq('status', 'published');
          if (subArticlesData) subArticles = subArticlesData as Article[];
        }
        return {
          id: subcat.id,
          name: subcat.name,
          slug: subcat.slug,
          articles: subArticles,
        };
      }));
    }
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      articles,
      subcategories,
    };
  }));

  return NextResponse.json(result);
} 