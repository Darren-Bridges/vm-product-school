"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";
import { Input } from "@/components/ui/input";

import { Skeleton } from "@/components/ui/skeleton";
import { dataCache } from '../utils/dataCache';

interface Category {
  id: string;
  name: string;
  description?: string;
  order?: number;
  parent_id?: string | null;
  slug?: string;
}
interface Article {
  id: string;
  title: string;
  slug: string;
  status?: string;
  content?: string;
  created_at?: string;
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [whatsNew, setWhatsNew] = useState<Article[]>([]);


  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      let categories = dataCache.getCategories();
      if (!categories) {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name, description, order, parent_id, slug")
          .is("parent_id", null)
          .order("order", { ascending: true });
        if (!error && data) {
          categories = data;
          dataCache.setCategories(data);
        }
      }
      if (categories) setCategories(categories);
      setLoading(false);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    // Fetch all published articles for search and what's new
    const fetchArticles = async () => {
      let articles = dataCache.getArticles();
      if (!articles) {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, created_at, status, content")
          .eq("status", "published");
        if (!error && data) {
          articles = data;
          dataCache.setArticles(data);
        }
      }
      if (articles) {
        // For what's new, sort and take 5 most recent
        setWhatsNew(
          articles
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
        );
        // For search, filter by search term
        if (search) {
          const filtered = articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));
          setSearchResults(filtered.slice(0, 5));
          setShowDropdown(filtered.length > 0);
        }
      }
    };
    fetchArticles();
  }, [search]);

  // Live search with debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!search) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const query = supabase
        .from("articles")
        .select("id, title, slug, status, content")
        .ilike("title", `%${search}%`)
        .eq("status", "published")
        .limit(5);
      const { data, error } = await query;
      if (!error && data) {
        setSearchResults(data);
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);
    // Cleanup
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  return (
    <main className="max-w-3xl mx-auto p-8 mt-20">
      <h1 className="text-3xl font-bold mb-2">Help Centre</h1>
      <p className="mb-6 text-muted-foreground">Search for help articles or browse by category.</p>
      <div className="relative mb-8">
        <Input
          type="text"
          placeholder="Search articles, guides, or topics..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          className="flex-1"
        />
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-background border rounded shadow z-10">
            {searchResults.map(article => (
              <Link
                key={article.id}
                href={`/article/${article.slug}`}
                className="block px-4 py-2 hover:bg-accent cursor-pointer"
                onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
              >
                <div className="flex items-center gap-2">
                  <span>{article.title}</span>
                  {article.status === 'draft' && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">Draft</span>
                  )}
                </div>
                {article.content && (
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {article.content.replace(/<[^>]+>/g, '').slice(0, 100)}{article.content.replace(/<[^>]+>/g, '').length > 100 ? '…' : ''}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
      <h2 className="text-xl font-semibold mb-4">Browse Categories</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 bg-card border rounded-lg shadow">
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-muted-foreground">No categories found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map(category => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="block p-6 bg-card border rounded-lg shadow hover:shadow-md transition"
            >
              <div className="font-bold text-lg mb-1">{category.name}</div>
              <div className="text-muted-foreground text-sm">{category.description || "No description"}</div>
            </Link>
          ))}
        </div>
      )}
      {/* What's New Section below categories */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">What’s New</h2>
        {loading && whatsNew.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-4">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : whatsNew.length > 0 && (
          <div className="space-y-4">
            {whatsNew.map(article => (
              <div key={article.id} className="bg-card border rounded-lg p-4">
                <Link
                  href={`/article/${article.slug}`}
                  className="font-medium text-foreground hover:underline text-lg"
                >
                  {article.title}
                </Link>
                {article.content && (
                  <div className="text-muted-foreground text-sm mt-2 line-clamp-2">
                    {article.content.replace(/<[^>]+>/g, '').slice(0, 200)}
                  </div>
                )}
                {article.created_at && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(article.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}