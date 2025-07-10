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
            <h1 className="text-3xl font-bold text-foreground">Articles</h1>
            <p className="text-muted-foreground mt-2">Manage your help centre articles</p>
          </div>
          <Button asChild className="w-full md:w-auto mt-4 md:mt-0">
            <Link href="/admin/articles/new">Create Article</Link>
          </Button>
        </div>
        
        {loading ? (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-10 w-64 rounded" /> {/* Search bar skeleton */}
              <Skeleton className="h-10 w-10 rounded" /> {/* Columns dropdown skeleton */}
            </div>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Author</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Categories</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Access Level</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-8 w-16 rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">Error: {error}</div>
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="text-muted-foreground mb-4">No articles found</div>
            <p className="text-muted-foreground mb-6">Get started by creating your first article</p>
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