"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { Button } from "../../../../components/ui/button";
import { ArticleContentEditor } from "../../../../components/ArticleContentEditor";
import { CategorySelector } from "../../../../components/CategorySelector";
import { Skeleton } from "../../../../components/ui/skeleton";
import { ProtectedAdminLayout } from "../../../../components/ProtectedAdminLayout";
import Link from "next/link";
import { useAuth } from "../../../../context/AuthContext";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../../../../components/ui/alert-dialog";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../../../../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { getAvailableAccessLevels } from "../../../../utils/accessControl";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// Define Feedback type for feedback rows
interface Feedback {
  id: string;
  article_id: string;
  feedback: string;
  reason?: string;
  source: string;
  user_email?: string;
  page_path?: string;
  created_at: string;
}

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params?.id as string;
  const { isSuperAdmin } = useAuth();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [accessLevel, setAccessLevel] = useState("external_clients");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [editingLink, setEditingLink] = useState(false);
  const [content, setContent] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [path, setPath] = useState("");
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [articleFeedback, setArticleFeedback] = useState<Feedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Get user role based on isSuperAdmin
  const userRole = isSuperAdmin ? 'superadmin' : 'user';
  const availableAccessLevels = getAvailableAccessLevels(userRole);

  // Fetch feedback for this article when modal opens
  useEffect(() => {
    if (feedbackModalOpen && articleId) {
      setFeedbackLoading(true);
      setFeedbackError(null);
      supabase
        .from("article_feedback")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) setFeedbackError("Failed to load feedback");
          else setArticleFeedback(data || []);
          setFeedbackLoading(false);
        });
    }
  }, [feedbackModalOpen, articleId]);

  // Calculate percent good for this article
  const total = articleFeedback.length;
  const good = articleFeedback.filter(f => f.feedback === 'yes').length;
  const percentGood = total > 0 ? Math.round((good / total) * 100) : 0;

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  };

  // Fetch article data and categories
  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch article data
        const { data: articleData, error: articleError } = await supabase
          .from("articles")
          .select("title, slug, content, status, access_level, author, path")
          .eq("id", articleId)
          .single();

        if (articleError) {
          throw articleError;
        }

        if (articleData) {
          setTitle(articleData.title);
          setSlug(articleData.slug || "");
          setSlugManuallyEdited(false);
          setStatus(articleData.status);
          setAccessLevel(articleData.access_level || "external_clients");
          setAuthor(articleData.author || null);
          setContent(articleData.content || "");
          setPath(articleData.path || "");
        }

        // Fetch article categories
        const { data: categoryData, error: categoryError } = await supabase
          .from("article_categories")
          .select("category_id")
          .eq("article_id", articleId);

        if (categoryError) {
          throw categoryError;
        }

        if (categoryData) {
          setSelectedCategories(categoryData.map(item => item.category_id));
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  useEffect(() => {
    if (title) {
      document.title = `${title} | Article | Admin | VM Product School`;
    }
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Use the current slug state
      const pathValue = path.trim() === "" ? null : path;

      const { error: articleError } = await supabase
        .from("articles")
        .update({ 
          title, 
          slug, 
          content, 
          status, 
          access_level: accessLevel, 
          path: pathValue, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", articleId);

      if (articleError) {
        throw articleError;
      }

      // Update article categories
      // First, delete existing relationships
      const { error: deleteError } = await supabase
        .from("article_categories")
        .delete()
        .eq("article_id", articleId);

      if (deleteError) {
        throw deleteError;
      }

      // Then, insert new relationships
      if (selectedCategories.length > 0) {
        const articleCategories = selectedCategories.map(categoryId => ({
          article_id: articleId,
          category_id: categoryId
        }));

        const { error: insertError } = await supabase
          .from("article_categories")
          .insert(articleCategories);

        if (insertError) {
          throw insertError;
        }
      }

      router.push("/admin/articles");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    
    try {
      // Delete article categories first
      const { error: categoryError } = await supabase
        .from("article_categories")
        .delete()
        .eq("article_id", articleId);

      if (categoryError) {
        throw categoryError;
      }

      // Then delete the article
      const { error: articleError } = await supabase
        .from("articles")
        .delete()
        .eq("id", articleId);

      if (articleError) {
        throw articleError;
      }

      router.push("/admin/articles");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setDeleteError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedAdminLayout>
        <div className="p-8">
          <div className="mb-2">
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex gap-8">
            <div className="w-3/4 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="w-1/4 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </ProtectedAdminLayout>
    );
  }
  if (error) {
    return (
      <ProtectedAdminLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">Error: {error}</div>
          </div>
        </div>
      </ProtectedAdminLayout>
    );
  }

  return (
    <ProtectedAdminLayout>
      <div className="p-8">
        <div className="mb-2">
          <Button asChild variant="outline">
            <Link href="/admin/articles">Back to Articles</Link>
          </Button>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Article</h1>
            <p className="text-muted-foreground mt-2">Update your help centre content</p>
          </div>
          <div className="flex items-center gap-2">
            {status === "draft" && (
              <Button asChild variant="outline">
                <Link href={`/admin/articles/${articleId}/preview`}>Preview</Link>
              </Button>
            )}
            <Button variant="secondary" onClick={() => setFeedbackModalOpen(true)}>
              View feedback
            </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="More options">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <span className="text-destructive cursor-pointer">Delete Article</span>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Article?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this article? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    {deleteError && <div className="text-red-600 text-sm mb-2">{deleteError}</div>}
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {deleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
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
        
        {/* Feedback Modal */}
        <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Feedback for this Article</DialogTitle>
            </DialogHeader>
            <div className="mb-4 flex flex-col items-center">
              <div className="text-2xl font-bold mb-1">{percentGood}%</div>
              <div className="text-muted-foreground text-sm">of feedback is &quot;good&quot;</div>
            </div>
            {feedbackLoading ? (
              <div>Loading...</div>
            ) : feedbackError ? (
              <div className="text-red-600">{feedbackError}</div>
            ) : articleFeedback.length === 0 ? (
              <div className="text-muted-foreground">No feedback for this article yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>User Email</TableHead>
                      <TableHead>Page Path</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articleFeedback.map(fb => (
                      <TableRow key={fb.id}>
                        <TableCell>{fb.feedback === 'yes' ? '✅ Yes' : '❌ No'}</TableCell>
                        <TableCell>{fb.reason || ''}</TableCell>
                        <TableCell>{fb.source}</TableCell>
                        <TableCell>{fb.user_email || ''}</TableCell>
                        <TableCell>{fb.page_path || ''}</TableCell>
                        <TableCell>{new Date(fb.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left side - Title and Content (75% width on desktop, full on mobile) */}
            <div className="w-full md:w-3/4 space-y-4">
              {author && (
                <div className="text-sm text-muted-foreground mb-2">Author: {author}</div>
              )}
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
                    <label htmlFor="path" className="block text-sm font-medium mb-1">Path</label>
                    <input
                      id="path"
                      type="text"
                      value={path}
                      onChange={e => setPath(e.target.value)}
                      placeholder="e.g., /inventory/setup"
                      className="w-full px-3 py-2 border rounded"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional path for widget to show this article by default</p>
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
              
              {/* Save button in sidebar */}
              <div className="border rounded-lg p-4 bg-card">
                {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </ProtectedAdminLayout>
  );
} 