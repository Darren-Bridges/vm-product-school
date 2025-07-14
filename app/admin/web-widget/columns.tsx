"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

export type Flow = {
  id: string;
  name: string;
  slug: string;
  updated_at: string;
  is_default?: boolean;
};

export const columns: ColumnDef<Flow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/admin/web-widget/${row.original.slug}`}
        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        {row.original.name}
      </Link>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => row.original.slug,
    enableSorting: false,
  },
  {
    accessorKey: "is_default",
    header: "Default",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.is_default ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Default
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Last Updated
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) =>
      row.original.updated_at ? new Date(row.original.updated_at).toLocaleString() : "",
    enableSorting: true,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Link
        href={`/admin/web-widget/${row.original.slug}`}
        className="text-primary font-semibold hover:underline"
      >
        Edit
      </Link>
    ),
    enableSorting: false,
  },
]; 