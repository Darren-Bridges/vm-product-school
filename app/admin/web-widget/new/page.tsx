"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AdminLayout } from '@/components/AdminLayout';
import { WebWidgetFlowForm } from '@/components/WebWidgetFlowForm';

export default function CreateFlowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async ({ name, slug }: { name: string; slug: string }) => {
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
        <WebWidgetFlowForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          submitLabel="Create Flow"
        />
      </div>
    </AdminLayout>
  );
} 