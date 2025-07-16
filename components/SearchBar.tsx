"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getArticleAccessFilter } from "../utils/accessControl";

interface Article {
  id: string;
  title: string;
  slug: string;
  status?: string;
  content?: string;
}

interface SearchBarProps {
  className?: string;
}

// Add fuzzyScore helper
function fuzzyScore(needle: string, haystack: string): number {
  if (!needle) return 0;
  if (!haystack) return 0;
  needle = needle.toLowerCase();
  haystack = haystack.toLowerCase();
  if (needle === haystack) return 100;
  if (haystack.startsWith(needle)) return 90;
  if (haystack.includes(needle)) return 75;
  let hIdx = 0, gaps = 0;
  for (let nIdx = 0; nIdx < needle.length; nIdx++) {
    hIdx = haystack.indexOf(needle[nIdx], hIdx);
    if (hIdx === -1) return 0;
    if (nIdx > 0 && hIdx > 0) gaps += hIdx;
    hIdx++;
  }
  return Math.max(50 - gaps, 1);
}

export function SearchBar({ className }: SearchBarProps) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, isSuperAdmin } = useAuth();

  // Fetch all accessible articles once per session/user
  useEffect(() => {
    if (user === undefined || isSuperAdmin === undefined) return;
    const allowedAccess = getArticleAccessFilter(user, isSuperAdmin);
    supabase
      .from("articles")
      .select("id, title, slug, status, content, access_level")
      .in("access_level", allowedAccess)
      .then(({ data, error }) => {
        if (!error && data) {
          setAllArticles(data);
        } else {
          setAllArticles([]);
        }
      });
  }, [user, isSuperAdmin]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fuzzy search and ranking in-memory
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!search) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimeout.current = setTimeout(() => {
      // Fuzzy search and sort
      const scored = allArticles.map((a: Article) => {
        const title = a.title || '';
        const content = a.content || '';
        let score = 0;
        score += fuzzyScore(search, title) * 2;
        score += fuzzyScore(search, content);
        return { article: a, score };
      }).filter(item => item.score > 0);
      scored.sort((a, b) => b.score - a.score);
      const filtered = scored.map(item => item.article).slice(0, 5);
      setSearchResults(filtered);
      setShowDropdown(filtered.length > 0);
    }, 300);
    // Cleanup
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search, allArticles]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          className="w-full pr-12 md:pr-20"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1 hidden md:flex">
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
            ⌘
          </kbd>
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
            K
          </kbd>
        </div>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 md:hidden">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-background border rounded shadow z-10">
          {searchResults.map(article => (
            <Link
              key={article.id}
              href={`/article/${article.slug}`}
              className="block px-4 py-2 hover:bg-accent cursor-pointer"
              onMouseDown={e => e.preventDefault()}
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
  );
} 