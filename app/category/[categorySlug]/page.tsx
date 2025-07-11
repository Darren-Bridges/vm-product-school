"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";
import { Skeleton } from "../../../components/ui/skeleton";
import { dataCache } from '../../../utils/dataCache';

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
      let categories = dataCache.getCategories();
      let articles = dataCache.getArticles();
      let articleCategories = dataCache.getArticleCategories();
      if (!categories) {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name, description, slug, order, parent_id")
          .order("order", { ascending: true });
        if (!error && data) {
          categories = data;
          dataCache.setCategories(data);
        }
      }
      if (!articles) {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, status, content, created_at")
          .eq("status", "published");
        if (!error && data) {
          articles = data;
          dataCache.setArticles(data);
        }
      }
      if (!articleCategories) {
        const { data, error } = await supabase
          .from("article_categories")
          .select("article_id, category_id");
        if (!error && data) {
          articleCategories = data;
          dataCache.setArticleCategories(data);
        }
      }
      if (!categories) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const categoryData = categories.find((c: any) => c.slug === categorySlug);
      if (!categoryData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCategory(categoryData);

      // Find articles in this category
      const articleIds = articleCategories
        ? articleCategories.filter((ac: any) => ac.category_id === categoryData.id).map((ac: any) => ac.article_id)
        : [];
      setArticles(Array.isArray(articles) ? articles.filter((a: any) => articleIds.includes(a.id)) : []);

      // Fetch subcategories if this is a parent category
      const subcategoriesData = categories.filter((c: any) => c.parent_id === categoryData.id);
      const subcategoriesWithArticles = subcategoriesData.map((subcategory: any) => {
        const subArticleIds = articleCategories
          ? articleCategories.filter((ac: any) => ac.category_id === subcategory.id).map((ac: any) => ac.article_id)
          : [];
        return {
          ...subcategory,
          articles: Array.isArray(articles) ? articles.filter((a: any) => subArticleIds.includes(a.id)) : [],
        };
      });
      setSubcategories(subcategoriesWithArticles);

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
          <p className="text-muted-foreground mb-6">This category does not exist.</p>
          <Link href="/" className="text-blue-600 hover:underline">Back to Help Centre</Link>
        </div>
      );
    }

  return (
    <div className="max-w-5xl mx-auto mt-20 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground text-lg">{category.description}</p>
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
                className="block p-4 bg-card border rounded-lg hover:shadow-md transition"
              >
                <h3 className="font-semibold text-lg mb-1">{article.title}</h3>
                {article.content && (
                  <p className="text-muted-foreground text-sm line-clamp-2">
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
                <p className="text-muted-foreground mb-4">{subcategory.description}</p>
              )}
              {subcategory.articles.length > 0 ? (
                <div className="space-y-3">
                  {subcategory.articles.map(article => (
                    <Link
                      key={article.id}
                      href={`/category/${category.slug}/${article.slug}`}
                      className="block p-4 bg-card border rounded-lg hover:shadow-md transition"
                    >
                      <h3 className="font-semibold text-lg mb-1">{article.title}</h3>
                      {article.content && (
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {article.content.replace(/<[^>]+>/g, '').slice(0, 150)}
                          {article.content.replace(/<[^>]+>/g, '').length > 150 ? '…' : ''}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No articles in this subcategory yet.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No content message */}
      {articles.length === 0 && subcategories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No articles found in this category.</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Help Centre
          </Link>
        </div>
      )}
    </div>
  );
} 