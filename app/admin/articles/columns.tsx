"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Filter } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

export type Article = {
  id: string;
  title: string;
  slug: string;
  status: string;
  access_level: string;
  author?: string;
  created_at: string;
  updated_at: string;
  categories?: string[];
};

export const columns: ColumnDef<Article>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
      );
    },
    cell: ({ row }) => (
      <Link 
        href={`/admin/articles/${row.original.id}`}
        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        {row.original.title}
      </Link>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "author",
    header: ({ column, table }) => {
      // Get unique authors from the data
      const uniqueAuthors = Array.from(
        new Set(
          table.getFilteredRowModel().rows
            .map(row => row.original.author)
            .filter(Boolean)
        )
      );

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Author
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Author</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueAuthors.map((value) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={column.getFilterValue() === value}
                  onCheckedChange={() => column.setFilterValue(value)}
                >
                  {value}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.setFilterValue("")}>
                Clear filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    cell: ({ row }) => row.original.author || "-",
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      const cellValue = row.getValue(id) as string;
      return value === "" || cellValue === value;
    },
  },
  {
    accessorKey: "categories",
    header: ({ column, table }) => {
      // Get unique categories from the data
      const allCategories = table.getFilteredRowModel().rows
        .flatMap(row => row.original.categories || []);
      const uniqueCategories = Array.from(new Set(allCategories));

      return (
        <div className="flex items-center gap-2">
          <span>Categories</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueCategories.map((value) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={column.getFilterValue() === value}
                  onCheckedChange={() => column.setFilterValue(value)}
                >
                  {value}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.setFilterValue("")}>
                Clear filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    cell: ({ row }) =>
      row.original.categories && row.original.categories.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.original.categories.map((cat, i) => (
            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              {cat}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-gray-400 text-sm">-</span>
      ),
    enableSorting: false,
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      const categories = row.getValue(id) as string[];
      return value === "" || (categories && categories.includes(value));
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span
        className={`px-2 py-1 rounded text-xs ${
          row.original.status === "published"
            ? "bg-green-100 text-green-800"
            : "bg-yellow-100 text-yellow-800"
        }`}
      >
        {row.original.status}
      </span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "access_level",
    header: ({ column, table }) => {
      // Get unique access levels from the data
      const uniqueAccessLevels = Array.from(
        new Set(
          table.getFilteredRowModel().rows
            .map(row => row.original.access_level)
        )
      );

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Access
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Access Level</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueAccessLevels.map((value) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={column.getFilterValue() === value}
                  onCheckedChange={() => column.setFilterValue(value)}
                >
                  {value === "vm_internal" && "VM Internal"}
                  {value === "external_clients" && "External"}
                  {value === "public" && "Public"}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.setFilterValue("")}>
                Clear filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    cell: ({ row }) => (
      <span
        className={`px-2 py-1 rounded text-xs ${
          row.original.access_level === "vm_internal"
            ? "bg-red-100 text-red-800"
            : row.original.access_level === "external_clients"
            ? "bg-blue-100 text-blue-800"
            : "bg-green-100 text-green-800"
        }`}
      >
        {row.original.access_level === "vm_internal" && "VM Internal"}
        {row.original.access_level === "external_clients" && "External"}
        {row.original.access_level === "public" && "Public"}
      </span>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      const cellValue = row.getValue(id) as string;
      return value === "" || cellValue === value;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    enableSorting: true,
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => new Date(row.original.updated_at).toLocaleDateString(),
    enableSorting: true,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const article = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
      </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(article.id)}
            >
              Copy article ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/admin/articles/${article.id}`}>Edit article</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/article/${article.slug}`} target="_blank">
                View article
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 