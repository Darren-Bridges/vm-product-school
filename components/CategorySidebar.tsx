"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./ui/accordion";
import { useEffect, useState } from "react";

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  children: CategoryTreeNode[];
  articles: { id: string; title: string; slug: string }[];
}

interface CategorySidebarProps {
  trees: CategoryTreeNode[];
  currentCategorySlug?: string;
  currentArticleSlug?: string;
}

function findCategoryPath(trees: CategoryTreeNode[], targetSlug?: string, path: string[] = []): string[] | null {
  for (const node of trees) {
    if (node.slug === targetSlug) return [...path, node.id];
    if (node.children.length > 0) {
      const childPath = findCategoryPath(node.children, targetSlug, [...path, node.id]);
      if (childPath) return childPath;
    }
  }
  return null;
}

function findArticlePath(trees: CategoryTreeNode[], articleSlug?: string, path: string[] = []): string[] | null {
  for (const node of trees) {
    if (node.articles.some(a => a.slug === articleSlug)) return [...path, node.id];
    if (node.children.length > 0) {
      const childPath = findArticlePath(node.children, articleSlug, [...path, node.id]);
      if (childPath) return childPath;
    }
  }
  return null;
}

// Helper to determine if a node or any of its descendants has at least one article
function hasArticlesOrDescendants(node: CategoryTreeNode): boolean {
  if (node.articles.length > 0) return true;
  return node.children.some(hasArticlesOrDescendants);
}

export function CategorySidebar({ trees, currentCategorySlug, currentArticleSlug }: CategorySidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string[]>([]);

  useEffect(() => {
    // Expand the path to the current category or article
    let path: string[] | null = null;
    if (currentArticleSlug) {
      path = findArticlePath(trees, currentArticleSlug);
    }
    if (!path && currentCategorySlug) {
      path = findCategoryPath(trees, currentCategorySlug);
    }
    if (path) setOpen(path);
  }, [trees, currentCategorySlug, currentArticleSlug]);

  // Filter trees to only include categories with articles or descendants with articles
  const filteredTrees = trees.filter(hasArticlesOrDescendants);

  return (
    <aside className="w-64 hidden md:block border-r pr-6 overflow-y-auto max-h-[80vh] bg-background">
      {/* Remove 'All Categories' heading on desktop */}
      <Accordion type="multiple" className="w-full" value={open} onValueChange={setOpen}>
        {filteredTrees.map((tree) => (
          <SidebarAccordionNode
            key={tree.id}
            node={tree}
            pathname={pathname}
            currentCategorySlug={currentCategorySlug}
            currentArticleSlug={currentArticleSlug}
            level={0}
            open={open}
          />
        ))}
      </Accordion>
    </aside>
  );
}

export function CategorySidebarMobile({ trees, currentCategorySlug, currentArticleSlug }: CategorySidebarProps) {
  const [open, setOpen] = useState(false);
  // Filter trees to only include categories with articles or descendants with articles
  const filteredTrees = trees.filter(hasArticlesOrDescendants);
  return (
    <div className="block md:hidden mb-4">
      {/* Remove 'All Categories' heading on mobile */}
      <Accordion type="single" collapsible className="w-full" value={open ? "all" : undefined} onValueChange={v => setOpen(!!v)}>
        <AccordionItem value="all">
          <AccordionTrigger className="text-base font-medium px-4 py-2 bg-accent rounded-md">
            All content
          </AccordionTrigger>
          <AccordionContent>
            <div className="max-h-[60vh] overflow-y-auto bg-background border rounded-md p-2">
              <Accordion type="multiple" className="w-full">
                {filteredTrees.map((tree) => (
                  <SidebarAccordionNode
                    key={tree.id}
                    node={tree}
                    pathname={""}
                    currentCategorySlug={currentCategorySlug}
                    currentArticleSlug={currentArticleSlug}
                    level={0}
                    open={[]}
                  />
                ))}
              </Accordion>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function SidebarAccordionNode({ node, pathname, currentCategorySlug, currentArticleSlug, level, open }: {
  node: CategoryTreeNode;
  pathname: string;
  currentCategorySlug?: string;
  currentArticleSlug?: string;
  level: number;
  open: string[];
}) {
  const isActiveCategory = node.slug === currentCategorySlug;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Filter children to only those with articles or descendants with articles
  const filteredChildren = node.children.filter(hasArticlesOrDescendants);

  return (
    <AccordionItem value={node.id} className={(level === 0 ? "mb-2" : "mb-1 ml-2 border-none")}> 
      <AccordionTrigger className="flex items-center px-1">
        {isMobile ? (
          <span
            className={
              "flex-1 text-left block truncate px-1 cursor-pointer select-none " +
              (isActiveCategory ? "font-semibold text-primary bg-accent/40 rounded" : "")
            }
          >
            {node.name}
          </span>
        ) : (
          <Link
            href={`/category/${node.slug}`}
            className={
              "flex-1 text-left block truncate px-1 " +
              (isActiveCategory ? "font-semibold text-primary bg-accent/40 rounded" : "")
            }
            onClick={e => e.stopPropagation()}
          >
            {node.name}
          </Link>
        )}
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-1">
          {node.articles.map((article) => (
            <Link
              key={article.id}
              href={`/category/${node.slug}/${article.slug}`}
              className={
                "pl-8 text-sm block truncate rounded hover:bg-accent hover:text-accent-foreground transition " +
                (article.slug === currentArticleSlug ? "font-semibold bg-accent/60 text-primary" : "text-muted-foreground")
              }
              onClick={e => e.stopPropagation()}
            >
              {article.title}
            </Link>
          ))}
          {filteredChildren.map((child) => (
            <SidebarAccordionNode
              key={child.id}
              node={child}
              pathname={pathname}
              currentCategorySlug={currentCategorySlug}
              currentArticleSlug={currentArticleSlug}
              level={level + 1}
              open={open}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
} 