"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { ProtectedAdminLayout } from "../../../components/ProtectedAdminLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../../../components/ui/dialog";
import { Plus, Edit, Trash2, FileText, ChevronDown, ChevronRight, Folder, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "../../../lib/utils";

interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  articles?: Article[];
  children?: Category[];
  order?: number;
  slug?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
  category_id?: string;
}

export default function CategoriesPage() {
  useEffect(() => {
    document.title = "Categories | Admin | VM Product School";
  }, []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const fetchCategoriesAndArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("order")
        .order("name");
      
      if (categoriesError) {
        setError(categoriesError.message);
        return;
      }

      // Fetch articles
      const { data: articlesData, error: articlesError } = await supabase
        .from("articles")
        .select("*")
        .order("title");
      
      if (articlesError) {
        setError(articlesError.message);
        return;
      }

      // Fetch article-category relationships
      const { data: articleCategoriesData, error: articleCategoriesError } = await supabase
        .from("article_categories")
        .select("*");
      
      if (articleCategoriesError) {
        setError(articleCategoriesError.message);
        return;
      }

      // Organize articles by category
      const categoriesWithArticles = (categoriesData || []).map(category => ({
        ...category,
        articles: (articlesData || []).filter(article => 
          (articleCategoriesData || []).some(ac => 
            ac.article_id === article.id && ac.category_id === category.id
          )
        )
      }));

      // Build hierarchical structure
      const categoriesWithChildren = buildCategoryHierarchy(categoriesWithArticles);

      setCategories(categoriesWithChildren);
      setArticles(articlesData || []);
      
    } catch (err) {
      setError('Fetch failed: ' + (err as Error).message);
      console.log('Fetch failed:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    console.log('Fetching categories and articles...');
    fetchCategoriesAndArticles();
  }, [fetchCategoriesAndArticles]);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  const buildCategoryHierarchy = (flatCategories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // Create a map of all categories
    flatCategories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Build the hierarchy
    flatCategories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    return rootCategories;
  };

  // Helper to remove a category and its children from the tree
  function removeCategoryFromTree(categories: Category[], id: string): Category[] {
    return categories
      .filter(cat => cat.id !== id)
      .map(cat => ({
        ...cat,
        children: cat.children ? removeCategoryFromTree(cat.children, id) : [],
      }));
  }

  // Helper to update a category in the tree
  function updateCategoryInTree(categories: Category[], updated: Category): Category[] {
    return categories.map(cat => {
      if (cat.id === updated.id) {
        return { ...cat, ...updated };
      }
      if (cat.children) {
        return { ...cat, children: updateCategoryInTree(cat.children, updated) };
      }
      return cat;
    });
  }

  // Helper to add a new category to the tree
  function addCategoryToTree(categories: Category[], newCat: Category): Category[] {
    if (!newCat.parent_id) {
      return [...categories, { ...newCat, children: [], articles: [] }];
    }
    return categories.map(cat => {
      if (cat.id === newCat.parent_id) {
        return {
          ...cat,
          children: [...(cat.children || []), { ...newCat, children: [], articles: [] }],
        };
      }
      if (cat.children) {
        return { ...cat, children: addCategoryToTree(cat.children, newCat) };
      }
      return cat;
    });
  }

  // Helper to reorder two categories in the tree
  function reorderCategoryInTree(categories: Category[], idA: string, idB: string): Category[] {
    const reorder = (cats: Category[]): Category[] => {
      const idxA = cats.findIndex(cat => cat.id === idA);
      const idxB = cats.findIndex(cat => cat.id === idB);
      if (idxA !== -1 && idxB !== -1) {
        const newCats = [...cats];
        [newCats[idxA], newCats[idxB]] = [newCats[idxB], newCats[idxA]];
        // Update order for all siblings
        return newCats.map((cat, i) => ({ ...cat, order: i }));
      }
      return cats.map(cat =>
        cat.children ? { ...cat, children: reorder(cat.children) } : cat
      );
    };
    return reorder(categories);
  }

  function slugify(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  // Helper function to flatten categories for dropdown with proper indentation
  const flattenCategoriesForDropdown = (categories: Category[], level: number = 0): Array<{ id: string; name: string; level: number }> => {
    let result: Array<{ id: string; name: string; level: number }> = [];
    
    categories.forEach(category => {
      // Add current category with indentation
      result.push({
        id: category.id,
        name: '  '.repeat(level) + category.name,
        level
      });
      
      // Add children recursively
      if (category.children && category.children.length > 0) {
        result = result.concat(flattenCategoriesForDropdown(category.children, level + 1));
      }
    });
    
    return result;
  };

  // Helper function to check if a category would create a circular reference
  const wouldCreateCircularReference = (categoryId: string, potentialParentId: string): boolean => {
    if (categoryId === potentialParentId) return true;
    
    const findCategory = (cats: Category[], id: string): Category | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findCategory(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const category = findCategory(categories, categoryId);
    if (!category || !category.children) return false;
    
    // Check if potentialParentId is a descendant of categoryId
    const isDescendant = (cats: Category[], targetId: string): boolean => {
      for (const cat of cats) {
        if (cat.id === targetId) return true;
        if (cat.children && isDescendant(cat.children, targetId)) return true;
      }
      return false;
    };
    
    return isDescendant(category.children, potentialParentId);
  };

  // CREATE/EDIT CATEGORY
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const categoryData = {
      name,
      description: description || null,
      parent_id: parentId || null,
      slug,
    };

    let result;
    if (editingCategory) {
      result = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", editingCategory.id);
    } else {
      result = await supabase.from("categories").insert([categoryData]).select().single();
    }

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
    } else {
      setDialogOpen(false);
      setEditingCategory(null);
      setName("");
      setDescription("");
      setParentId("");
      setSlug("");
      setSlugManuallyEdited(false);
      if (editingCategory) {
        setCategories(prev => updateCategoryInTree(prev, { ...editingCategory, ...categoryData, description: categoryData.description || undefined }));
      } else if (result.data) {
        setCategories(prev => addCategoryToTree(prev, { ...result.data, articles: [], children: [], description: result.data.description || undefined }));
      }
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setParentId(category.parent_id || "");
    setSlug(category.slug || "");
    setSlugManuallyEdited(false);
    setDialogOpen(true);
  };

  // DELETE CATEGORY
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    setError(null);
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      setError(error.message);
    } else {
      setCategories(prev => removeCategoryFromTree(prev, id));
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setParentId("");
    setSlug("");
    setSlugManuallyEdited(false);
    setDialogOpen(true);
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // ADD ARTICLE TO CATEGORY
  const addArticleToCategory = async (articleId: string, categoryId: string) => {
    try {
      await supabase
        .from("article_categories")
        .insert([{ article_id: articleId, category_id: categoryId }]);
      const article = articles.find(a => a.id === articleId);
      if (article) {
        setCategories(prevCategories => {
          const updateCategoryArticles = (cats: Category[]): Category[] => {
            return cats.map(cat => {
              if (cat.id === categoryId) {
                const updatedCat = { ...cat };
                updatedCat.articles = [...(updatedCat.articles || []), article];
                return updatedCat;
              }
              if (cat.children) {
                return { ...cat, children: updateCategoryArticles(cat.children) };
              }
              return cat;
            });
          };
          return updateCategoryArticles(prevCategories);
        });
      }
    } catch (err) {
      setError('Failed to add article to category: ' + (err as Error).message);
    }
  };

  // REMOVE ARTICLE FROM CATEGORY
  const removeArticleFromCategory = async (articleId: string, categoryId: string) => {
    try {
      await supabase
        .from("article_categories")
        .delete()
        .eq("article_id", articleId)
        .eq("category_id", categoryId);
      setCategories(prevCategories => {
        const updateCategoryArticles = (cats: Category[]): Category[] => {
          return cats.map(cat => {
            if (cat.id === categoryId) {
              const updatedCat = { ...cat };
              updatedCat.articles = (updatedCat.articles || []).filter(a => a.id !== articleId);
              return updatedCat;
            }
            if (cat.children) {
              return { ...cat, children: updateCategoryArticles(cat.children) };
            }
            return cat;
          });
        };
        return updateCategoryArticles(prevCategories);
      });
    } catch (err) {
      setError('Failed to remove article from category: ' + (err as Error).message);
    }
  };

  // MOVE CATEGORY
  const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const findCategoryAndParent = (cats: Category[], parentId: string | null = null): { category: Category | null, siblings: Category[], parentId: string | null } => {
      for (const cat of cats) {
        if (cat.id === categoryId) {
          return { category: cat, siblings: cats, parentId };
        }
        if (cat.children) {
          const result = findCategoryAndParent(cat.children, cat.id);
          if (result.category) {
            return result;
          }
        }
      }
      return { category: null, siblings: [], parentId: null };
    };

    const { category, siblings } = findCategoryAndParent(categories);
    if (!category || siblings.length < 2) return;

    const currentIndex = siblings.findIndex(c => c.id === categoryId);
    if (direction === 'up' && currentIndex > 0) {
      const targetIndex = currentIndex - 1;
      const catA = siblings[currentIndex];
      const catB = siblings[targetIndex];
      
      // Swap order values
      const tempOrder = catA.order;
      catA.order = catB.order;
      catB.order = tempOrder;

      // Update in database
      await supabase
        .from("categories")
        .update({ order: catB.order })
        .eq("id", catA.id);

      await supabase
        .from("categories")
        .update({ order: catA.order })
        .eq("id", catB.id);

      // Optimistically reorder in local state
      setCategories(prev => reorderCategoryInTree(prev, catA.id, catB.id));
    } else if (direction === 'down' && currentIndex < siblings.length - 1) {
      const targetIndex = currentIndex + 1;
      const catA = siblings[currentIndex];
      const catB = siblings[targetIndex];
      
      // Swap order values
      const tempOrder = catA.order;
      catA.order = catB.order;
      catB.order = tempOrder;

      // Update in database
      await supabase
        .from("categories")
        .update({ order: catB.order })
        .eq("id", catA.id);

      await supabase
        .from("categories")
        .update({ order: catA.order })
        .eq("id", catB.id);

      // Optimistically reorder in local state
      setCategories(prev => reorderCategoryInTree(prev, catA.id, catB.id));
    }
  };

  const renderCategory = (category: Category, level: number = 0, siblings: Category[] = categories) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const hasArticles = category.articles && category.articles.length > 0;

    // Use the current siblings array for index
    const currentIndex = siblings.findIndex(c => c.id === category.id);

    return (
      <div key={category.id} className={cn("space-y-2", level > 0 ? "sm:ml-6 border-l-2 border-border pl-3" : "")}>
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2" style={{ marginLeft: `${level * 8}px` }}>
                <button
                  onClick={() => toggleCategoryExpanded(category.id)}
                  className="p-1 hover:bg-accent rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <Folder className="w-4 h-4 text-blue-500" />
                <h3 className="font-medium text-foreground text-base sm:text-lg">{category.name}</h3>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  ({category.articles?.length || 0} articles)
                </span>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-1 mt-2 sm:mt-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowArticleDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => handleEdit(category)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => handleDelete(category.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <div className="flex gap-1 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-1/2 sm:w-auto"
                    onClick={() => moveCategory(category.id, 'up')}
                    disabled={currentIndex === 0}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-1/2 sm:w-auto"
                    onClick={() => moveCategory(category.id, 'down')}
                    disabled={currentIndex === siblings.length - 1}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            {category.description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 ml-7 sm:ml-8">{category.description}</p>
            )}
          </div>
          {/* Articles section */}
          {isExpanded && hasArticles && (
            <div className="border-t bg-muted">
              <div className="p-2 text-xs font-medium text-muted-foreground bg-accent">
                Articles in this category
              </div>
              <div className="p-2 space-y-2">
                {category.articles!.map((article) => (
                  <div
                    key={article.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 bg-card rounded border"
                    style={{ marginLeft: `${level * 8}px` }}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm sm:text-base">{article.title}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 sm:mt-0 w-full sm:w-auto"
                      onClick={() => removeArticleFromCategory(article.id, category.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Child categories section */}
          {isExpanded && hasChildren && (
            <div className="border-t bg-muted">
              <div className="p-2 text-xs font-medium text-muted-foreground bg-accent">
                Subcategories
              </div>
              <div className="p-2 space-y-2">
                {category.children!.map((childCategory) => (
                  <div key={childCategory.id}>
                    {renderCategory(childCategory, level + 1, category.children!)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Empty state when expanded but no content */}
          {isExpanded && !hasArticles && !hasChildren && (
            <div className="p-4 border-t bg-muted">
              <div className="text-center py-4 text-muted-foreground border-2 border-dashed border-border rounded">
                No articles or subcategories in this category
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ProtectedAdminLayout>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground">Categories</h1>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card p-6 rounded-lg border">
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-6 w-1/6" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </ProtectedAdminLayout>
    );
  }

  return (
    <ProtectedAdminLayout>
      <div className="p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-0 md:gap-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground mt-2">Organize your content with categories and articles</p>
          </div>
          <Button onClick={handleCreate} className="w-full md:w-auto mt-4 md:mt-0">
            <Plus className="w-4 h-4 mr-2" />
            Create Category
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">Error: {error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Categories with Articles */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Categories & Articles</h2>
            
            {categories.length === 0 ? (
              <div className="bg-card border rounded-lg p-8 text-center">
                <div className="text-muted-foreground mb-4">No categories found</div>
                <p className="text-muted-foreground mb-6">Create your first category to organize your content</p>
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Category
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category.id}>
                    {renderCategory(category)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Create Category"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
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
                  <p className="text-xs text-muted-foreground mt-1">This will be the category URL: /category/{slug || '<slug>'}</p>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label htmlFor="parent" className="block text-sm font-medium mb-1">
                    Parent Category
                  </label>
                  <select
                    id="parent"
                    value={parentId}
                    onChange={e => setParentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">No parent</option>
                    {flattenCategoriesForDropdown(categories)
                      .filter(cat => cat.id !== editingCategory?.id && !wouldCreateCircularReference(editingCategory?.id || '', cat.id))
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingCategory ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Article to Category Dialog */}
        <Dialog open={showArticleDialog} onOpenChange={setShowArticleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Add Articles to {selectedCategory?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2">
                {articles.map(article => {
                  const alreadyInCategory = selectedCategory?.articles?.some(a => a.id === article.id);
                  return (
                    <div key={article.id} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span>{article.title}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (selectedCategory && !alreadyInCategory) {
                            addArticleToCategory(article.id, selectedCategory.id);
                          }
                        }}
                        disabled={alreadyInCategory}
                      >
                        {alreadyInCategory ? "Added" : "Add"}
                      </Button>
                    </div>
                  );
                })}
                {articles.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No articles available
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedAdminLayout>
  );
} 