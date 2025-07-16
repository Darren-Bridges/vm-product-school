"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";
import { Skeleton } from "../../../components/ui/skeleton";
import { dataCache } from '../../../utils/dataCache';
import { CategorySidebar, CategorySidebarMobile } from "@/components/CategorySidebar";
import { FileText } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
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

interface CategoryTreeNode extends Category {
  articles: Article[];
  children: CategoryTreeNode[];
}

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode | null>(null);
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});
  const [allCategoryTrees, setAllCategoryTrees] = useState<CategoryTreeNode[]>([]);
  const { user, isSuperAdmin, userReady } = useAuth();

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true);
      setNotFound(false);
      let categories = dataCache.getCategories();
      const userId = user ? user.email : null;
      let articles = dataCache.getArticles(userId, isSuperAdmin);
      let articleCategories = dataCache.getArticleCategories();
      if (!categories) {
        const { data, error } = await supabase
        .from("categories")
        .select("id, name, description, slug, order, parent_id")
          .order("order", { ascending: true });
        if (!error && data) {
          categories = data;
          dataCache.setCategories(data);
        }
      }
      if (!articles) {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, status, content, created_at")
          .eq("status", "published");
        if (!error && data) {
          articles = data;
          dataCache.setArticles(data, userId, isSuperAdmin);
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
      if (!categories) {
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

      // Helper to build the full tree recursively
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
      setCategoryTree(buildTree(categoryData));
      // Build all root category trees for the sidebar
      const rootCategories = (Array.isArray(categories) ? categories : []).filter((c: Category) => !c.parent_id);
      setAllCategoryTrees(rootCategories.map(buildTree));
      setLoading(false);
    };
    if (categorySlug && userReady) fetchCategory();
  }, [categorySlug, user, isSuperAdmin, userReady]);

  useEffect(() => {
    if (category && category.name) {
      document.title = `${category.name} | VM Product School`;
    }
  }, [category]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto mt-20 p-8">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Skeleton className="h-6 w-2/3 mb-8" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

      if (notFound || !category) {
      return (
        <div className="max-w-2xl mx-auto mt-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground mb-6">This category does not exist.</p>
          <Link href="/" className="text-blue-600 hover:underline">Back to Help Centre</Link>
        </div>
      );
    }

  function renderCategoryTree(node: CategoryTreeNode, parentSlug: string, level: number = 0) {
    return (
      <section key={node.id} className={level === 0 ? "mb-6" : "mb-14 mt-12"}>
        {level !== 0 && (
          <>
            <h2 className="text-2xl font-bold mb-6">{node.name}</h2>
            {node.description && <p className="text-muted-foreground mb-6 text-lg">{node.description}</p>}
          </>
        )}
        {node.articles.length > 0 && (
          <ul className="mb-2">
            {node.articles.map(article => (
              <li key={article.id} className="flex items-center border-b border-border last:border-b-0 py-3 gap-2">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <Link
                  href={`/category/${parentSlug}/${article.slug}`}
                  className="block text-base text-foreground font-medium hover:underline truncate"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {node.children.length > 0 && (
          <div className="space-y-14">
            {node.children.map(child => renderCategoryTree(child, child.slug, level + 1))}
          </div>
        )}
      </section>
    );
  }

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function SidebarTree({ node, parentSlug, level = 0 }: { node: CategoryTreeNode; parentSlug: string; level?: number }) {
    const isExpanded = expanded[node.id] ?? level < 2; // expand top 2 levels by default
    return (
      <div key={node.id} style={{ marginLeft: level * 12 }}>
        <div className="flex items-center gap-1">
          {node.children.length > 0 ? (
            <button
              type="button"
              className="text-xs px-1 focus:outline-none"
              onClick={() => toggleExpand(node.id)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}
          <Link
            href={`/category/${node.slug}`}
            className="font-medium hover:underline text-foreground"
          >
            {node.name}
          </Link>
        </div>
        {isExpanded && (
          <div>
            {node.articles.map(article => (
              <div key={article.id} style={{ marginLeft: 16 }}>
                <Link
                  href={`/category/${node.slug}/${article.slug}`}
                  className="text-sm hover:underline text-muted-foreground block truncate"
                >
                  {article.title}
                </Link>
              </div>
            ))}
            {node.children.map(child => (
              <SidebarTree key={child.id} node={child} parentSlug={parentSlug} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full mt-20 gap-8 p-4 md:p-8">
      <CategorySidebar
        trees={allCategoryTrees}
        currentCategorySlug={categorySlug}
      />
      <main className="flex-1">
        <CategorySidebarMobile
          trees={allCategoryTrees}
          currentCategorySlug={categorySlug}
        />
        <div className="mb-6 pb-2">
          <h1 className="text-4xl font-bold mb-4">{category.name}</h1>
          {category.description && (
            <p className="text-lg text-muted-foreground mb-3">{category.description}</p>
          )}
        </div>
        {categoryTree && renderCategoryTree(categoryTree, categoryTree.slug, 0)}
      </main>
    </div>
  );
} 