"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { ProtectedAdminLayout } from "../../../components/ProtectedAdminLayout";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Plus, Edit, Trash2, CheckCircle, Clock, Play, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../../../components/ui/dialog";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "active" | "planned" | "shipped";
  priority: "low" | "medium" | "high";
  shipped_month?: number;
  shipped_year?: number;
  article_id?: string | null;
  article_slug?: string | null;
  article_title?: string | null;
  created_at: string;
  updated_at: string;
}

// Article type for dropdown
interface ArticleOption {
  id: string;
  title: string;
  slug: string;
}

// Define SupabaseRoadmapItem for raw fetch
interface SupabaseRoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "active" | "planned" | "shipped";
  priority: "low" | "medium" | "high";
  shipped_month?: number;
  shipped_year?: number;
  article_id?: string | null;
  articles?: { slug?: string | null; title?: string | null } | null;
  created_at: string;
  updated_at: string;
}

export default function RoadmapAdminPage() {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "planned" as "active" | "planned" | "shipped",
    priority: "medium" as "low" | "medium" | "high",
    shipped_month: undefined as number | undefined,
    shipped_year: undefined as number | undefined,
    article_id: undefined as string | undefined,
  });
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<ArticleOption[]>([]);

  useEffect(() => {
    fetchRoadmapItems();
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, slug")
      .eq("status", "published")
      .order("title", { ascending: true });
    if (!error && data) setArticles(data);
  };

  const fetchRoadmapItems = async () => {
    try {
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("*, articles(id, slug, title)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Map article fields for easy access
      const items: RoadmapItem[] = (data || []).map((item: SupabaseRoadmapItem) => ({
        ...item,
        article_slug: item.articles?.slug || null,
        article_title: item.articles?.title || null,
      }));
      setRoadmapItems(items);
    } catch (error) {
      console.error("Error fetching roadmap items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from("roadmap_items")
          .update({
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            shipped_month: formData.shipped_month,
            shipped_year: formData.shipped_year,
            article_id: formData.article_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingItem.id);

        if (error) throw error;
      } else {
        // Create new item
        const { error } = await supabase
          .from("roadmap_items")
          .insert({
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            shipped_month: formData.shipped_month,
            shipped_year: formData.shipped_year,
            article_id: formData.article_id || null,
          });

        if (error) throw error;
      }

      setDialogOpen(false);
      setEditingItem(null);
      setFormData({ title: "", description: "", status: "planned", priority: "medium", shipped_month: undefined, shipped_year: undefined, article_id: undefined });
      fetchRoadmapItems();
    } catch (error) {
      console.error("Error saving roadmap item:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: RoadmapItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      shipped_month: item.shipped_month,
      shipped_year: item.shipped_year,
      article_id: item.article_id || undefined,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setSaving(true); // Changed from setDeleting to setSaving
    try {
      const { error } = await supabase
        .from("roadmap_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchRoadmapItems();
    } catch (error) {
      console.error("Error deleting roadmap item:", error);
    } finally {
      setSaving(false); // Changed from setDeleting to setSaving
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ title: "", description: "", status: "planned", priority: "medium", shipped_month: undefined, shipped_year: undefined, article_id: undefined });
  };

  const groupedItems = {
    active: roadmapItems.filter(item => item.status === "active"),
    planned: roadmapItems.filter(item => item.status === "planned"),
    shipped: roadmapItems.filter(item => item.status === "shipped"),
  };

  if (loading) {
    return (
      <ProtectedAdminLayout>
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  <div className="space-y-4">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-24 bg-gray-200 rounded border"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ProtectedAdminLayout>
    );
  }

  return (
    <ProtectedAdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Roadmap</h1>
            <p className="text-muted-foreground mt-2">Manage your product roadmap items</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="space-y-8">
          {/* Active Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Play className="h-5 w-5 mr-2 text-blue-600" />
                Active ({groupedItems.active.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupedItems.active.length > 0 ? (
                <div className="space-y-4">
                  {groupedItems.active.map(item => (
                    <RoadmapItemCard
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No active items</p>
              )}
            </CardContent>
          </Card>

          {/* Planned Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                Planned ({groupedItems.planned.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupedItems.planned.length > 0 ? (
                <div className="space-y-4">
                  {groupedItems.planned.map(item => (
                    <RoadmapItemCard
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No planned items</p>
              )}
            </CardContent>
          </Card>

          {/* Shipped Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Shipped ({groupedItems.shipped.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupedItems.shipped.length > 0 ? (
                <div className="space-y-8">
                  {(() => {
                    // Group by month+year
                    const groups: { [key: string]: typeof groupedItems.shipped } = {};
                    groupedItems.shipped.forEach(item => {
                      if (item.shipped_month && item.shipped_year) {
                        const key = `${item.shipped_year}-${item.shipped_month}`;
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(item);
                      } else {
                        // Items without shipped date go in 'Unknown'
                        if (!groups['Unknown']) groups['Unknown'] = [];
                        groups['Unknown'].push(item);
                      }
                    });
                    // Sort keys descending (most recent first)
                    const sortedKeys = Object.keys(groups).sort((a, b) => {
                      if (a === 'Unknown') return 1;
                      if (b === 'Unknown') return -1;
                      const [aYear, aMonth] = a.split('-').map(Number);
                      const [bYear, bMonth] = b.split('-').map(Number);
                      if (bYear !== aYear) return bYear - aYear;
                      return bMonth - aMonth;
                    });
                    return sortedKeys.map(key => (
                      <div key={key}>
                        <div className="font-semibold text-md mb-2">
                          {key === 'Unknown'
                            ? 'Unknown Date'
                            : new Date(Number(key.split('-')[0]), Number(key.split('-')[1]) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="space-y-4">
                          {groups[key].map(item => (
                            <RoadmapItemCard
                              key={item.id}
                              item={item}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No shipped items</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Roadmap Item" : "Add Roadmap Item"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded resize-none"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as RoadmapItem["status"] })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="shipped">Shipped</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium mb-1">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as RoadmapItem["priority"] })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Article Link Dropdown */}
              <div>
                <label htmlFor="article_id" className="block text-sm font-medium mb-1">
                  Link to Article (optional)
                </label>
                <select
                  id="article_id"
                  value={formData.article_id || ""}
                  onChange={e => setFormData({ ...formData, article_id: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">No article</option>
                  {articles.map(article => (
                    <option key={article.id} value={article.id}>{article.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="shipped_month" className="block text-sm font-medium mb-1">
                    Shipped Month {formData.status === "shipped" && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    id="shipped_month"
                    value={formData.shipped_month || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      shipped_month: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 border rounded"
                    required={formData.status === "shipped"}
                  >
                    <option value="">Select month</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="shipped_year" className="block text-sm font-medium mb-1">
                    Shipped Year {formData.status === "shipped" && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="shipped_year"
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.shipped_year || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      shipped_year: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="2024"
                    required={formData.status === "shipped"}
                  />
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingItem ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedAdminLayout>
  );
}

function RoadmapItemCard({ item, onEdit, onDelete }: { item: RoadmapItem; onEdit: (item: RoadmapItem) => void; onDelete: (id: string) => void; }) {
  return (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors flex justify-between items-center">
      <div>
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{item.title}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-3 leading-relaxed">{item.description}</p>
      </div>
      <div className="flex gap-2 items-center">
        {item.article_slug && (
          <a href={`/article/${item.article_slug}`} target="_blank" rel="noopener noreferrer" title={item.article_title || "View Article"} className="text-blue-600 hover:text-blue-800">
            <LinkIcon className="h-4 w-4" />
          </a>
        )}
        <button onClick={() => onEdit(item)} className="text-muted-foreground hover:text-blue-600"><Edit className="w-4 h-4" /></button>
        <button onClick={() => onDelete(item.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
} 