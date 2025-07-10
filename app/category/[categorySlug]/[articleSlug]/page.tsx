"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import Link from "next/link";
import { Skeleton } from "../../../../components/ui/skeleton";
import { ArticleContentViewer } from "../../../../components/ArticleContentViewer";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
}

interface SidebarArticle {
  id: string;
  title: string;
  slug: string;
}

export default function CategoryArticlePage() {
  const { categorySlug, articleSlug } = useParams<{ categorySlug: string; articleSlug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [otherArticles, setOtherArticles] = useState<SidebarArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setNotFound(false);

      // Fetch the category first
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id, name, slug, description")
        .eq("slug", categorySlug)
        .single();

      if (categoryError || !categoryData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCategory(categoryData);

      // Fetch the article by slug, only if published
      const { data: articleData, error: articleError } = await supabase
        .from("articles")
        .select("id, title, slug, content, status")
        .eq("slug", articleSlug)
        .eq("status", "published")
        .single();

      if (articleError || !articleData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setArticle(articleData);

      // Fetch other articles in the same category - get article IDs first
      const { data: otherArticleIdsData, error: otherArticleIdsError } = await supabase
        .from("article_categories")
        .select("article_id")
        .eq("category_id", categoryData.id)
        .neq("article_id", articleData.id);

      if (!otherArticleIdsError && otherArticleIdsData) {
        const otherArticleIds = otherArticleIdsData.map(item => item.article_id);
        
        // Only fetch articles if we have article IDs
        if (otherArticleIds.length > 0) {
          // Fetch the actual articles
          const { data: otherArticlesData, error: otherArticlesError } = await supabase
            .from("articles")
            .select("id, title, slug")
            .in("id", otherArticleIds)
            .eq("status", "published");

          if (!otherArticlesError && otherArticlesData) {
            setOtherArticles(otherArticlesData);
          }
        }
      }

      setLoading(false);
    };

    if (categorySlug && articleSlug) fetchData();
  }, [categorySlug, articleSlug]);

  if (loading) {
    return (
      <div className="flex w-full mt-20 gap-8 p-4 md:p-8">
        <aside className="w-64 hidden md:block">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-32 mb-2" />
            ))}
          </div>
        </aside>
        <main className="flex-1">
          <Skeleton className="h-10 w-full mb-6" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (notFound || !article || !category) {
    return (
      <div className="max-w-2xl mx-auto mt-32 text-center">
        <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
        <p className="text-gray-500 mb-6">This article does not exist or is not published.</p>
        <Link href="/" className="text-blue-600 hover:underline">Back to Help Centre</Link>
      </div>
    );
  }

  return (
    <div className="flex w-full mt-20 gap-8 p-4 md:p-8">
      {/* Desktop sidebar */}
      <aside className="w-64 hidden md:block border-r pr-6">
        <div className="mb-6">
          <Link 
            href={`/category/${category.slug}`}
            className="text-sm text-muted-foreground hover:text-foreground mb-2 block"
          >
            ← Back to {category.name}
          </Link>
          <h2 className="text-lg font-semibold mb-4">More in {category.name}</h2>
        </div>
        <nav className="space-y-2">
          {otherArticles.map(a => (
            <Link
              key={a.id}
              href={`/category/${category.slug}/${a.slug}`}
              className="block text-foreground hover:text-blue-600 hover:underline truncate"
            >
              {a.title}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-8 md:px-16">
        <div className="mb-6">
          <nav className="text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground">Help Centre</Link>
            <span className="mx-2">/</span>
            <Link href={`/category/${category.slug}`} className="hover:text-foreground">
              {category.name}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{article.title}</span>
          </nav>
          <h1 className="text-3xl font-bold mb-6">{article.title}</h1>
        </div>
        <div className="w-full">
          <ArticleContentViewer content={article.content} />
        </div>
        {/* Mobile related articles below content */}
        <div className="block md:hidden mt-12">
          <h2 className="text-lg font-semibold mb-4">More in {category.name}</h2>
          <nav className="space-y-2">
            {otherArticles.map(a => (
              <Link
                key={a.id}
                href={`/category/${category.slug}/${a.slug}`}
                className="block text-foreground hover:text-blue-600 hover:underline truncate"
              >
                {a.title}
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
} 