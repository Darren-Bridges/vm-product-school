"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { ProtectedAdminLayout } from "../../../components/ProtectedAdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { columns, Article } from "./columns";
import Link from "next/link";

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch articles
        const { data: articlesData, error: articlesError } = await supabase
          .from("articles")
          .select("id, title, slug, status, access_level, author, created_at, updated_at")
          .order("created_at", { ascending: false });

        if (articlesError) {
          throw articlesError;
        }

        // Fetch categories for all articles
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("article_categories")
          .select(`
            article_id,
            categories (
              id,
              name
            )
          `);

        if (categoriesError) {
          throw categoriesError;
        }

        // Group categories by article
        const categoriesByArticle: { [key: string]: string[] } = {};
        if (categoriesData) {
          // Using any type due to Supabase's complex return type structure
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          categoriesData.forEach((item: any) => {
            if (!categoriesByArticle[item.article_id]) {
              categoriesByArticle[item.article_id] = [];
            }
            if (item.categories) {
              categoriesByArticle[item.article_id].push(item.categories.name);
            }
          });
        }

        // Combine articles with their categories
        const articlesWithCategories = (articlesData || []).map(article => ({
          ...article,
          categories: categoriesByArticle[article.id] || []
        }));

        setArticles(articlesWithCategories);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticles();
  }, []);

  return (
    <ProtectedAdminLayout>
      <div className="p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-0 md:gap-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
            <p className="text-gray-600 mt-2">Manage your help center articles</p>
          </div>
          <Button asChild className="w-full md:w-auto mt-4 md:mt-0">
            <Link href="/admin/articles/new">Create Article</Link>
          </Button>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border">
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-6 w-1/6" />
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">Error: {error}</div>
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <div className="text-gray-500 mb-4">No articles found</div>
            <p className="text-gray-400 mb-6">Get started by creating your first article</p>
            <Button asChild>
              <Link href="/admin/articles/new">Create Your First Article</Link>
            </Button>
          </div>
        ) : (
          <DataTable columns={columns} data={articles} searchKey="title" />
        )}
      </div>
    </ProtectedAdminLayout>
  );
} 