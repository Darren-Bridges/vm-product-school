"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";
import { Input } from "./ui/input";
import { Search } from "lucide-react";

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

export function SearchBar({ className }: SearchBarProps) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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