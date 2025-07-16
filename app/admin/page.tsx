"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { ProtectedAdminLayout } from "../../components/ProtectedAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FolderOpen, PlayCircle, Users } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  useEffect(() => {
    document.title = "Admin Dashboard | VM Product School";
  }, []);

  const [stats, setStats] = useState({
    articles: 0,
    categories: 0,
    tours: 0,
    users: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch articles count
        const { count: articlesCount } = await supabase
          .from("articles")
          .select("*", { count: "exact", head: true });

        // Fetch categories count
        const { count: categoriesCount } = await supabase
          .from("categories")
          .select("*", { count: "exact", head: true });

        // For now, tours and users are placeholder values since those tables don't exist yet
        setStats({
          articles: articlesCount || 0,
          categories: categoriesCount || 0,
          tours: 0, // Placeholder until tours table is implemented
          users: 0   // Placeholder until users tracking is implemented
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <ProtectedAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome to your knowledge base admin panel</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.articles}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.categories}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Product Tours</CardTitle>
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.tours}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.users}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/admin/articles/new"
                  className="flex items-center p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <FileText className="h-5 w-5 mr-3 text-blue-600" />
                  <div>
                    <div className="font-medium">Create Article</div>
                    <div className="text-sm text-muted-foreground">Add new help content</div>
                  </div>
                </Link>
                
                <Link
                  href="/admin/categories"
                  className="flex items-center p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <FolderOpen className="h-5 w-5 mr-3 text-green-600" />
                  <div>
                    <div className="font-medium">Manage Categories</div>
                    <div className="text-sm text-muted-foreground">Organize content</div>
                  </div>
                </Link>
                
                <Link
                  href="/admin/roadmap"
                  className="flex items-center p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="h-5 w-5 mr-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                  <div>
                    <div className="font-medium">Manage Roadmap</div>
                    <div className="text-sm text-muted-foreground">Product roadmap items</div>
                  </div>
                </Link>
                
                <Link
                  href="/admin/tours"
                  className="flex items-center p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <PlayCircle className="h-5 w-5 mr-3 text-purple-600" />
                  <div>
                    <div className="font-medium">Create Tour</div>
                    <div className="text-sm text-muted-foreground">Build interactive guides</div>
                  </div>
                </Link>
                
                <Link
                  href="/admin/theme"
                  className="flex items-center p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="h-5 w-5 mr-3 bg-gradient-to-r from-pink-500 to-orange-500 rounded"></div>
                  <div>
                    <div className="font-medium">Customize Theme</div>
                    <div className="text-sm text-muted-foreground">Brand your help centre</div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">New article published</div>
                    <div className="text-xs text-muted-foreground">&ldquo;How to set up inventory&rdquo; - 2 hours ago</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Category updated</div>
                    <div className="text-xs text-muted-foreground">&ldquo;Billing&rdquo; category modified - 4 hours ago</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Tour created</div>
                    <div className="text-xs text-muted-foreground">&ldquo;Getting Started&rdquo; tour - 1 day ago</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Theme updated</div>
                    <div className="text-xs text-muted-foreground">Brand colors changed - 2 days ago</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedAdminLayout>
  );
} 