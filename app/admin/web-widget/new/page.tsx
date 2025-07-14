"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { AdminLayout } from '@/components/AdminLayout';

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function CreateFlowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required.");
      setLoading(false);
      return;
    }
    // Check for unique slug
    const { data: existing, error: fetchError } = await supabase
      .from("web_widget_flows")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    if (existing) {
      setError("A flow with this slug already exists.");
      setLoading(false);
      return;
    }
    // Insert new flow
    const { data, error: insertError } = await supabase
      .from("web_widget_flows")
      .insert([
        { name, slug, flow_data: { nodes: [], edges: [] } }
      ])
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }
    router.push(`/admin/web-widget/${data.slug}`);
  };

  return (
    <AdminLayout sidebarOpen={false} setSidebarOpen={() => {}}>
      <div className="p-8 max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Create Flow</h1>
          <p className="text-muted-foreground mt-2">Start a new help widget flow. You can edit the flow visually after creating it.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-8 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
              disabled={loading}
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
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">URL: /admin/web-widget/<span className="font-mono">{slug || '...'}</span></p>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create Flow'}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
} 