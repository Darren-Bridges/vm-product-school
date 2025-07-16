"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { DataTable } from "@/components/ui/data-table";
import { ProtectedAdminLayout } from "../../../../components/ProtectedAdminLayout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ColumnDef } from "@tanstack/react-table";

interface Feedback {
  id: string;
  article_id: string;
  article_title?: string;
  feedback: string;
  reason?: string;
  source: string;
  user_email?: string;
  page_path?: string;
  created_at: string;
}

const columns: ColumnDef<Feedback>[] = [
  {
    accessorKey: "article_title",
    header: "Article Title",
    cell: ({ row }) => (row.original as Feedback).article_title || (row.original as Feedback).article_id,
  },
  {
    accessorKey: "feedback",
    header: "Feedback",
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return value === "yes" ? "✅ Yes" : "❌ No";
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
  },
  {
    accessorKey: "source",
    header: "Source",
  },
  {
    accessorKey: "user_email",
    header: "User Email",
  },
  {
    accessorKey: "page_path",
    header: "Page Path",
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleString(),
  },
];

// Define a type for the row returned from Supabase
interface FeedbackRow extends Feedback {
  articles?: { title?: string };
}

export default function ArticleFeedbackAdminPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);
      // Join article_feedback with articles to get the title
      const { data, error } = await supabase
        .from("article_feedback")
        .select("*, articles(id, title)")
        .order("created_at", { ascending: false });
      if (error) {
        setError("Failed to load feedback");
      } else {
        // Map article_title from joined articles
        const feedbackWithTitle: Feedback[] = (data || []).map((row: FeedbackRow) => ({
          ...row,
          article_title: row.articles?.title || row.article_id,
          id: row.id,
          article_id: row.article_id,
          feedback: row.feedback,
          reason: row.reason,
          source: row.source,
          user_email: row.user_email,
          page_path: row.page_path,
          created_at: row.created_at,
        }));
        setFeedback(feedbackWithTitle);
      }
      setLoading(false);
    };
    fetchFeedback();
  }, []);

  // Compute dashboard metrics
  const totalFeedback = feedback.length;
  const goodFeedback = feedback.filter(f => f.feedback === 'yes').length;
  const percentGood = totalFeedback > 0 ? Math.round((goodFeedback / totalFeedback) * 100) : 0;

  // Prepare chart data: group by date and feedback type
  const feedbackByDay: Record<string, { yes: number; no: number }> = {};
  feedback.forEach(f => {
    const date = new Date(f.created_at).toISOString().slice(0, 10);
    if (!feedbackByDay[date]) feedbackByDay[date] = { yes: 0, no: 0 };
    if (f.feedback === 'yes') feedbackByDay[date].yes++;
    else if (f.feedback === 'no') feedbackByDay[date].no++;
  });
  const chartData = Object.entries(feedbackByDay).map(([date, counts]) => ({ date, ...counts }));

  return (
    <ProtectedAdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Article Feedback</h1>
          <Button asChild variant="outline">
            <Link href="/admin/articles">← Back to Articles</Link>
          </Button>
        </div>
        {/* Dashboard cards */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="bg-card border rounded-lg p-6 flex-1 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold mb-1">{percentGood}%</div>
            <div className="text-muted-foreground text-sm text-center">% of feedback that is &quot;good&quot;</div>
          </div>
          <div className="bg-card border rounded-lg p-6 flex-1 min-w-[320px]">
            <div className="font-semibold mb-2 text-center">Feedback per Day</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend verticalAlign="top" height={24} />
                <Bar dataKey="yes" fill="#22c55e" name="Good" stackId="feedback" />
                <Bar dataKey="no" fill="#ef4444" name="Bad" stackId="feedback" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <DataTable columns={columns} data={feedback} />
        )}
      </div>
    </ProtectedAdminLayout>
  );
} 