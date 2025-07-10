"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";
import { Skeleton } from "../../../components/ui/skeleton";
import { ArticleContentViewer } from "../../../components/ArticleContentViewer";

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

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [otherArticles, setOtherArticles] = useState<SidebarArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setNotFound(false);
      // Fetch the article by slug, only if published
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, content, status")
        .eq("slug", slug)
        .eq("status", "published")
        .single();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setArticle(data);
      // Fetch other published articles for the sidebar
      const { data: others } = await supabase
        .from("articles")
        .select("id, title, slug")
        .eq("status", "published")
        .neq("slug", slug)
        .order("title");
      setOtherArticles(others || []);
      setLoading(false);
    };
    if (slug) fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex max-w-5xl mx-auto mt-20 gap-8 p-4 md:p-8">
        <aside className="w-64 hidden md:block">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-32 mb-2" />
            ))}
          </div>
        </aside>
        <main className="flex-1">
          <Skeleton className="h-10 w-[90vw] max-w-xl mx-auto mb-6" />
          <Skeleton className="h-6 w-[80vw] max-w-lg mx-auto mb-2" />
          <Skeleton className="h-96 w-[95vw] max-w-2xl mx-auto" />
        </main>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="max-w-2xl mx-auto mt-32 text-center">
        <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
        <p className="text-gray-500 mb-6">This article does not exist or is not published.</p>
        <Link href="/" className="text-blue-600 hover:underline">Back to Help Center</Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-5xl mx-auto mt-20 gap-8 p-4 md:p-8">
      <aside className="w-64 hidden md:block border-r pr-6">
        <h2 className="text-lg font-semibold mb-4">Other Articles</h2>
        <nav className="space-y-2">
          {otherArticles.map(a => (
            <Link
              key={a.id}
              href={`/article/${a.slug}`}
              className="block text-gray-700 hover:text-blue-600 hover:underline truncate"
            >
              {a.title}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1">
        <h1 className="text-3xl font-bold mb-6">{article.title}</h1>
        <div className="prose prose-neutral max-w-none">
          <ArticleContentViewer content={article.content} />
        </div>
      </main>
    </div>
  );
} 