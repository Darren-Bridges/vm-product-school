"use client";

import { AdminLayout } from '@/components/AdminLayout';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table';
import { columns, Flow } from './columns';

export default function WebWidgetFlowsListPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlows = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('web_widget_flows')
          .select('id, slug, name, updated_at, is_default')
          .order('updated_at', { ascending: false });
        if (error) {
          setError(error.message);
        } else {
          setFlows(data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFlows();
  }, []);

  return (
    <AdminLayout sidebarOpen={false} setSidebarOpen={() => {}}>
      <div className="p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-0 md:gap-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Web Widget Flows</h1>
            <p className="text-muted-foreground mt-2">Manage your help widget flows. You can create, edit, and organize multiple flows for different use cases.</p>
          </div>
          <Button asChild className="w-full md:w-auto mt-4 md:mt-0">
            <Link href="/admin/web-widget/new">Create New Flow</Link>
          </Button>
        </div>
        {loading ? (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-10 w-64 rounded" /> {/* Search bar skeleton */}
              <Skeleton className="h-10 w-10 rounded" /> {/* Columns dropdown skeleton */}
            </div>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Slug</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Last Updated</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-8 w-16 rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">Error: {error}</div>
          </div>
        ) : flows.length === 0 ? (
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="text-muted-foreground mb-4">No flows found</div>
            <p className="text-muted-foreground mb-6">Get started by creating your first flow</p>
            <Button asChild>
              <Link href="/admin/web-widget/new">Create Your First Flow</Link>
            </Button>
          </div>
        ) : (
          <DataTable columns={columns} data={flows} searchKey="name" />
        )}
      </div>
    </AdminLayout>
  );
} 