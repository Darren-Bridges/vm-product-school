"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { CheckCircle, Clock, Play, Link as LinkIcon } from "lucide-react";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "active" | "planned" | "shipped";
  priority: "low" | "medium" | "high";
  shipped_month?: number;
  shipped_year?: number;
  created_at: string;
  updated_at: string;
  article_slug?: string; // Added article_slug to the interface
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
  articles?: { slug?: string | null } | null;
  created_at: string;
  updated_at: string;
}

export default function RoadmapPage() {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoadmapItems = async () => {
      try {
        const { data, error } = await supabase
          .from("roadmap_items")
          .select("*, articles(slug)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        // Map article_slug from joined articles
        const items: RoadmapItem[] = (data || []).map((item: SupabaseRoadmapItem) => ({
          ...item,
          article_slug: item.articles?.slug || undefined,
        }));
        setRoadmapItems(items);
      } catch (error) {
        console.error("Error fetching roadmap items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmapItems();
  }, []);

  const groupedItems = {
    active: roadmapItems.filter(item => item.status === "active"),
    planned: roadmapItems.filter(item => item.status === "planned"),
    shipped: roadmapItems.filter(item => item.status === "shipped"),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-4xl font-bold text-foreground mb-4">Product Roadmap</h1>
          <p className="text-lg text-muted-foreground">
            See what we&apos;re building and what&apos;s coming next
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-8 pb-16">
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
                  <RoadmapItemCard key={item.id} item={item} />
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
                  <RoadmapItemCard key={item.id} item={item} />
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
                          <RoadmapItemCard key={item.id} item={item} />
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
    </div>
  );
}

function RoadmapItemCard({ item }: { item: RoadmapItem }) {
  return (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors flex justify-between items-center">
      <div>
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{item.title}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-3 leading-relaxed">{item.description}</p>
      </div>
      <div className="flex gap-2 items-center">
        {item.article_slug && (
          <a href={`/article/${item.article_slug}`} title="View Article" className="text-blue-600 hover:text-blue-800">
            <LinkIcon className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
} 