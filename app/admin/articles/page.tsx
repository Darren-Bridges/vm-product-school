"use client";

import { Button } from "../../../components/ui/button";

export default function AdminArticlesPage() {
  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Articles</h1>
        <Button asChild>
          <a href="/admin/articles/new">Create Article</a>
        </Button>
      </div>
      {/* TODO: Replace with article table */}
      <div className="bg-muted p-4 rounded text-muted-foreground">
        Article list coming soon.
      </div>
    </main>
  );
} 