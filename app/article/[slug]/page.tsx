"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";
import { Skeleton } from "../../../components/ui/skeleton";
import { ArticleContentViewer } from "../../../components/ArticleContentViewer";
import { dataCache } from '../../../utils/dataCache';

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

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [otherArticles, setOtherArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setNotFound(false);
      let articles = dataCache.getArticles();
      if (!articles) {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, content, status")
          .eq("status", "published");
        if (!error && data) {
          articles = data;
          dataCache.setArticles(data);
        }
      }
      if (!articles) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const currentArticle = articles.find((article: Article) => article.slug === slug);
      if (!currentArticle) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setArticle(currentArticle);
      const otherArticles = articles
        .filter((article: Article) => article.id !== currentArticle.id)
        .slice(0, 5)
        .map((article: Article): RelatedArticle => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
        }));
      setOtherArticles(otherArticles);
      setLoading(false);
    };
    if (slug) fetchArticle();
  }, [slug]);

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

  if (notFound || !article) {
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
      </aside>
      <main className="flex-1 px-8 md:px-16">
        <h1 className="text-3xl font-bold mb-6">{article.title}</h1>
        <div className="w-full">
          <ArticleContentViewer content={article.content} />
        </div>
        {/* Mobile related articles below content */}
        <div className="block md:hidden mt-12">
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
  );
} 