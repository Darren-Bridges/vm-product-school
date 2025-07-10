"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button } from "./ui/button";
import { X, Check } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
}

interface CategorySelectorProps {
  selectedCategories: string[];
  onChange: (categoryIds: string[]) => void;
  className?: string;
}

export function CategorySelector({ selectedCategories, onChange, className = "" }: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (error) {
      setError(error.message);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const handleToggleCategory = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId);
    if (isSelected) {
      onChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      onChange([...selectedCategories, categoryId]);
    }
  };

  const handleRemoveCategory = (categoryId: string) => {
    onChange(selectedCategories.filter(id => id !== categoryId));
  };

  const getCategoryName = (id: string) => {
    const category = categories.find(c => c.id === id);
    return category?.name || "Unknown";
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading categories...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">Error loading categories: {error}</div>;
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {/* Selected categories display */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedCategories.map(categoryId => (
              <div
                key={categoryId}
                className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-sm"
              >
                <span>{getCategoryName(categoryId)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(categoryId)}
                  className="ml-1 hover:bg-primary/80 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Category selector dropdown */}
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full justify-between"
          >
            {selectedCategories.length === 0
              ? "Select categories..."
              : `${selectedCategories.length} category${selectedCategories.length === 1 ? "" : "s"} selected`}
          </Button>

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {categories.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">
                  No categories available. Create some categories first.
                </div>
              ) : (
                <div className="py-1">
                  {categories.map(category => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleToggleCategory(category.id)}
                        className={`w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                      >
                        <div>
                          <div className="font-medium">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-muted-foreground">
                              {category.description}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Helper text */}
        <div className="text-xs text-muted-foreground">
          Select one or more categories for this article
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 