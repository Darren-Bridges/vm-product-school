"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";
import { Skeleton } from "../../../components/ui/skeleton";

interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  order?: number;
  parent_id?: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  content?: string;
}

interface Subcategory {
  id: string;
  name: string;
  description?: string;
  slug: string;
  order?: number;
  articles: Article[];
}

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true);
      setNotFound(false);
      
      // Fetch the category by slug
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id, name, description, slug, order, parent_id")
        .eq("slug", categorySlug)
        .single();

      if (categoryError || !categoryData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCategory(categoryData);

      // Fetch articles in this category - get article IDs first
      const { data: articleIdsData, error: articleIdsError } = await supabase
        .from("article_categories")
        .select("article_id")
        .eq("category_id", categoryData.id);

      if (!articleIdsError && articleIdsData) {
        const articleIds = articleIdsData.map(item => item.article_id);
        
        // Only fetch articles if we have article IDs
        if (articleIds.length > 0) {
          // Fetch the actual articles
          const { data: articlesData, error: articlesError } = await supabase
            .from("articles")
            .select("id, title, slug, status, content")
            .in("id", articleIds)
            .eq("status", "published");

          if (!articlesError && articlesData) {
            setArticles(articlesData);
          }
        }
      }

      // Fetch subcategories if this is a parent category
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from("categories")
        .select("id, name, description, slug, order")
        .eq("parent_id", categoryData.id)
        .order("order", { ascending: true });

      if (!subcategoriesError && subcategoriesData) {
        // Fetch articles for each subcategory
        const subcategoriesWithArticles = await Promise.all(
          subcategoriesData.map(async (subcategory) => {
            // Get article IDs for this subcategory
            const { data: subArticleIdsData } = await supabase
              .from("article_categories")
              .select("article_id")
              .eq("category_id", subcategory.id);

            let subArticles: Article[] = [];
            if (subArticleIdsData) {
              const subArticleIds = subArticleIdsData.map(item => item.article_id);
              
              // Only fetch articles if we have article IDs
              if (subArticleIds.length > 0) {
                // Fetch the actual articles
                const { data: subArticlesData } = await supabase
                  .from("articles")
                  .select("id, title, slug, status, content")
                  .in("id", subArticleIds)
                  .eq("status", "published");

                if (subArticlesData) {
                  subArticles = subArticlesData;
                }
              }
            }

            return {
              ...subcategory,
              articles: subArticles
            };
          })
        );
        setSubcategories(subcategoriesWithArticles);
      }

      setLoading(false);
    };
    if (categorySlug) fetchCategory();
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto mt-20 p-8">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Skeleton className="h-6 w-2/3 mb-8" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !category) {
    return (
      <div className="max-w-2xl mx-auto mt-32 text-center">
        <h1 className="text-3xl font-bold mb-4">Category Not Found</h1>
        <p className="text-gray-500 mb-6">This category does not exist.</p>
        <Link href="/" className="text-blue-600 hover:underline">Back to Help Center</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-20 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-gray-600 text-lg">{category.description}</p>
        )}
      </div>

      {/* Direct articles in this category */}
      {articles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Articles</h2>
          <div className="space-y-3">
            {articles.map(article => (
              <Link
                key={article.id}
                href={`/category/${category.slug}/${article.slug}`}
                className="block p-4 bg-white border rounded-lg hover:shadow-md transition"
              >
                <h3 className="font-semibold text-lg mb-1">{article.title}</h3>
                {article.content && (
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {article.content.replace(/<[^>]+>/g, '').slice(0, 150)}
                    {article.content.replace(/<[^>]+>/g, '').length > 150 ? '…' : ''}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div className="space-y-8">
          {subcategories.map(subcategory => (
            <div key={subcategory.id}>
              <h2 className="text-xl font-semibold mb-4">{subcategory.name}</h2>
              {subcategory.description && (
                <p className="text-gray-600 mb-4">{subcategory.description}</p>
              )}
              {subcategory.articles.length > 0 ? (
                <div className="space-y-3">
                  {subcategory.articles.map(article => (
                    <Link
                      key={article.id}
                      href={`/category/${category.slug}/${article.slug}`}
                      className="block p-4 bg-white border rounded-lg hover:shadow-md transition"
                    >
                      <h3 className="font-semibold text-lg mb-1">{article.title}</h3>
                      {article.content && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {article.content.replace(/<[^>]+>/g, '').slice(0, 150)}
                          {article.content.replace(/<[^>]+>/g, '').length > 150 ? '…' : ''}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No articles in this subcategory yet.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No content message */}
      {articles.length === 0 && subcategories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No articles found in this category.</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Help Center
          </Link>
        </div>
      )}
    </div>
  );
} 