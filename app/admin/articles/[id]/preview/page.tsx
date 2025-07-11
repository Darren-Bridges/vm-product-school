"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";
import Link from "next/link";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { ArticleContentViewer } from "../../../../../components/ArticleContentViewer";
import { Button } from "../../../../../components/ui/button";
import { ProtectedAdminLayout } from "../../../../../components/ProtectedAdminLayout";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
}

export default function ArticlePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [otherArticles, setOtherArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setNotFound(false);
      
      try {
        // Fetch the specific article by ID (including drafts)
        const { data: articleData, error: articleError } = await supabase
          .from("articles")
          .select("id, title, slug, content, status")
          .eq("id", id)
          .single();

        if (articleError) {
          throw articleError;
        }

        if (!articleData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setArticle(articleData);

        // Fetch other articles for the sidebar (only published ones)
        const { data: otherArticlesData, error: otherArticlesError } = await supabase
          .from("articles")
          .select("id, title, slug")
          .eq("status", "published")
          .neq("id", id)
          .limit(5);

        if (!otherArticlesError && otherArticlesData) {
          setOtherArticles(otherArticlesData);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Error fetching article:', errorMessage);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchArticle();
    }
  }, [id]);

  if (loading) {
    return (
      <ProtectedAdminLayout>
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
      </ProtectedAdminLayout>
    );
  }

  if (notFound || !article) {
    return (
      <ProtectedAdminLayout>
        <div className="max-w-2xl mx-auto mt-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
          <p className="text-gray-500 mb-6">This article does not exist.</p>
          <Button asChild>
            <Link href="/admin/articles">Back to Articles</Link>
          </Button>
        </div>
      </ProtectedAdminLayout>
    );
  }

  return (
    <ProtectedAdminLayout>
      <div className="flex w-full mt-20 gap-8 p-4 md:p-8">
        {/* Desktop sidebar */}
        <aside className="w-64 hidden md:block border-r pr-6">
          <div className="mb-6">
            <Button asChild variant="outline" className="mb-4">
              <Link href={`/admin/articles/${id}`}>← Back to Edit</Link>
            </Button>
            <h2 className="text-lg font-semibold mb-4">Other Articles</h2>
          </div>
          <nav className="space-y-2">
            {otherArticles.map(a => (
              <Link
                key={a.id}
                href={`/article/${a.slug}`}
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
              <Link href="/admin/articles" className="hover:text-foreground">Admin</Link>
              <span className="mx-2">/</span>
              <Link href="/admin/articles" className="hover:text-foreground">Articles</Link>
              <span className="mx-2">/</span>
              <Link href={`/admin/articles/${id}`} className="hover:text-foreground">Edit</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Preview</span>
            </nav>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{article.title}</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Draft Preview
                </span>
                <Button asChild variant="outline">
                  <Link href={`/admin/articles/${id}`}>Edit Article</Link>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="w-full">
            <ArticleContentViewer content={article.content} />
          </div>
          
          {/* Mobile related articles below content */}
          <div className="block md:hidden mt-12">
            <Button asChild variant="outline" className="mb-4">
              <Link href={`/admin/articles/${id}`}>← Back to Edit</Link>
            </Button>
            <h2 className="text-lg font-semibold mb-4">Other Articles</h2>
            <nav className="space-y-2">
              {otherArticles.map(a => (
                <Link
                  key={a.id}
                  href={`/article/${a.slug}`}
                  className="block text-foreground hover:text-blue-600 hover:underline truncate"
                >
                  {a.title}
                </Link>
              ))}
            </nav>
          </div>
        </main>
      </div>
    </ProtectedAdminLayout>
  );
} 