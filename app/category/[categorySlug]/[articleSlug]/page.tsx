"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import Link from "next/link";
import { Skeleton } from "../../../../components/ui/skeleton";
import { ArticleContentViewer } from "../../../../components/ArticleContentViewer";
import { dataCache } from '../../../../utils/dataCache';
import { useAuth } from "../../../../context/AuthContext";
import { getArticleAccessFilter } from "../../../../utils/accessControl";
import { CategorySidebar, CategoryTreeNode } from "@/components/CategorySidebar";
import { CategorySidebarMobile } from "@/components/CategorySidebar";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_id: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
}

interface ArticleCategory {
  article_id: string;
  category_id: string;
}

export default function CategoryArticlePage() {
  const { categorySlug, articleSlug } = useParams<{ categorySlug: string; articleSlug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { user, isSuperAdmin } = useAuth();
  const [allCategoryTrees, setAllCategoryTrees] = useState<CategoryTreeNode[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setNotFound(false);
      let categories = dataCache.getCategories();
      let articles = dataCache.getArticles();
      let articleCategories = dataCache.getArticleCategories();
      const allowedAccess = getArticleAccessFilter(user, isSuperAdmin);
      if (!categories) {
        const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, parent_id")
          .order("order", { ascending: true });
        if (!error && data) {
          categories = data;
          dataCache.setCategories(data);
        }
      }
      if (!articles) {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, content, status, created_at, access_level")
          .in("access_level", allowedAccess);
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
      if (!categories || !articles || !articleCategories) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const categoryData = categories.find((category: Category) => category.slug === categorySlug);
      if (!categoryData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCategory(categoryData);
      const articleData = articles.find((article: Article) => article.slug === articleSlug);
      if (!articleData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setArticle(articleData);
      // Build all root category trees for the sidebar
      function buildTree(cat: Category): CategoryTreeNode {
        const articleIds = articleCategories
          ? articleCategories.filter((ac: ArticleCategory) => ac.category_id === cat.id).map((ac: ArticleCategory) => ac.article_id)
          : [];
        const nodeArticles = Array.isArray(articles) ? articles.filter((article: Article) => articleIds.includes(article.id)) : [];
        const children = (Array.isArray(categories) ? categories : []).filter((c: Category) => c.parent_id === cat.id);
        return {
          ...cat,
          articles: nodeArticles,
          children: children.map(buildTree),
        };
      }
      const rootCategories = (Array.isArray(categories) ? categories : []).filter((c: Category) => !c.parent_id);
      setAllCategoryTrees(rootCategories.map(buildTree));
      setLoading(false);
    };
    if (categorySlug && articleSlug) fetchData();
  }, [categorySlug, articleSlug, user, isSuperAdmin]);

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
      <CategorySidebar
        trees={allCategoryTrees}
        currentCategorySlug={categorySlug}
        currentArticleSlug={articleSlug}
      />
      <main className="flex-1 px-8 md:px-16">
        <CategorySidebarMobile
          trees={allCategoryTrees}
          currentCategorySlug={categorySlug}
          currentArticleSlug={articleSlug}
        />
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
            {/* otherArticles is not defined here, so this loop will not render anything */}
            {/* This part of the code needs to be refactored to fetch related articles */}
            {/* For now, we'll just show a placeholder or remove if not needed */}
            <p>No related articles found.</p>
          </nav>
        </div>
      </main>
    </div>
  );
} 