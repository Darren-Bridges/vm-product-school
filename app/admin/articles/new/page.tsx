"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { Button } from "../../../../components/ui/button";
import { useAuth } from "../../../../context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../../../../components/ui/dialog";
import { ArticleContentEditor } from "../../../../components/ArticleContentEditor";
import { CategorySelector } from "../../../../components/CategorySelector";
import { ProtectedAdminLayout } from "../../../../components/ProtectedAdminLayout";
import { getAvailableAccessLevels } from "../../../../utils/accessControl";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function CreateArticlePage() {
  const router = useRouter();
  const { user, isSuperAdmin } = useAuth();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [accessLevel, setAccessLevel] = useState("vm_internal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [editingLink, setEditingLink] = useState(false);
  const [content, setContent] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  // Get user role based on isSuperAdmin
  const userRole = isSuperAdmin ? 'superadmin' : 'user';
  const availableAccessLevels = getAvailableAccessLevels(userRole);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use the current slug state
      const { data: articleData, error: articleError } = await supabase
        .from("articles")
        .insert([
          { title, slug, content, status, access_level: accessLevel, author: user?.email || "" }
        ])
        .select()
        .single();

      if (articleError) {
        throw articleError;
      }

      // Then, create the article-category relationships
      if (selectedCategories.length > 0 && articleData) {
        const articleCategories = selectedCategories.map(categoryId => ({
          article_id: articleData.id,
          category_id: categoryId
        }));

        const { error: categoryError } = await supabase
          .from("article_categories")
          .insert(articleCategories);

        if (categoryError) {
          throw categoryError;
        }
      }

      router.push("/admin/articles");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedAdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Article</h1>
          <p className="text-gray-600 mt-2">Add new content to your help center</p>
        </div>
        
        {/* Link Dialog outside the main form */}
        <Dialog open={linkDialogOpen} onOpenChange={open => {
          setLinkDialogOpen(open);
          if (!open) {
            setEditingLink(false);
            setLinkUrl("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLink ? "Edit Link" : "Insert Link"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => {
              e.preventDefault();
              if (linkUrl) {
                // The editor is no longer managed here, so this line is removed.
              }
              setLinkDialogOpen(false);
              setEditingLink(false);
              setLinkUrl("");
            }}>
              <input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded mb-4"
                required
              />
              <DialogFooter>
                {editingLink && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      // The editor is no longer managed here, so this line is removed.
                      setLinkDialogOpen(false);
                      setEditingLink(false);
                      setLinkUrl("");
                    }}
                  >
                    Remove Link
                  </Button>
                )}
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={!linkUrl}>Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left side - Title and Content (75% width on desktop, full on mobile) */}
            <div className="w-full md:w-3/4 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <ArticleContentEditor value={content} onChange={setContent} />
              </div>
            </div>
            
            {/* Right side - Sidebar (25% width on desktop, full on mobile) */}
            <div className="w-full md:w-1/4 space-y-4 mt-8 md:mt-0">
              <div className="border rounded-lg p-4 bg-card">
                <h3 className="font-semibold mb-4">Article Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                    <select
                      id="status"
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium mb-1">Slug</label>
                    <input
                      id="slug"
                      type="text"
                      value={slug}
                      onChange={handleSlugChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">This will be the article URL: /article/{slug || '<slug>'}</p>
                  </div>
                  
                  <div>
                    <label htmlFor="accessLevel" className="block text-sm font-medium mb-1">Access Level</label>
                    <select
                      id="accessLevel"
                      value={accessLevel}
                      onChange={e => setAccessLevel(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    >
                      {availableAccessLevels.map(level => (
                        <option key={level} value={level}>
                          {level === 'vm_internal' && 'VM Internal Only'}
                          {level === 'external_clients' && 'External Clients'}
                          {level === 'public' && 'Public'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {accessLevel === 'vm_internal' && 'Only superadmin users can view this article'}
                      {accessLevel === 'external_clients' && 'Any logged in user can view this article'}
                      {accessLevel === 'public' && 'Anyone can view this article (logged in or not)'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Categories</label>
                    <CategorySelector
                      selectedCategories={selectedCategories}
                      onChange={setSelectedCategories}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Tags</label>
                    <input
                      type="text"
                      placeholder="Add tags..."
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">SEO Description</label>
                    <textarea
                      placeholder="Brief description for search engines..."
                      className="w-full px-3 py-2 border rounded resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              
              {/* Create button in sidebar */}
              <div className="border rounded-lg p-4 bg-card">
                {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Article"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </ProtectedAdminLayout>
  );
} 