import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export interface WebWidgetFlowFormProps {
  initialName?: string;
  initialSlug?: string;
  loading?: boolean;
  error?: string | null;
  onSubmit: (values: { name: string; slug: string }) => void;
  submitLabel?: string;
}

export const WebWidgetFlowForm: React.FC<WebWidgetFlowFormProps> = ({
  initialName = "",
  initialSlug = "",
  loading = false,
  error = null,
  onSubmit,
  submitLabel = "Save",
}) => {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  useEffect(() => {
    setName(initialName);
    setSlug(initialSlug);
    setSlugManuallyEdited(false);
  }, [initialName, initialSlug]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    onSubmit({ name: name.trim(), slug: slug.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-8 space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div>
        <label htmlFor="slug" className="block text-sm font-medium mb-1">Slug</label>
        <Input
          id="slug"
          type="text"
          value={slug}
          onChange={handleSlugChange}
          required
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground mt-1">URL: /admin/web-widget/<span className="font-mono">{slug || '...'}</span></p>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}; 