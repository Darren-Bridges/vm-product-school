"use client";

import { SidebarNav } from "./ui/sidebar-nav";
import { FileText, FolderOpen, PlayCircle, Palette, Settings, X, Bell, Map } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const navigation = [
  { name: "Dashboard", href: "/admin", icon: <Settings className="w-4 h-4" /> },
  { name: "Articles", href: "/admin/articles", icon: <FileText className="w-4 h-4" /> },
  { name: "Categories", href: "/admin/categories", icon: <FolderOpen className="w-4 h-4" /> },
  { name: "Roadmap", href: "/admin/roadmap", icon: <Map className="w-4 h-4" /> },
  { name: "Product Tours", href: "/admin/tours", icon: <PlayCircle className="w-4 h-4" /> },
  { name: "Theming", href: "/admin/theme", icon: <Palette className="w-4 h-4" /> },
  { name: "Notifications", href: "/admin/notifications", icon: <Bell className="w-4 h-4" /> },
  { name: "Widget Demo", href: "/widget-demo", icon: <PlayCircle className="w-4 h-4" /> },
];

export function AdminLayout({ children, sidebarOpen, setSidebarOpen }: AdminLayoutProps) {
  return (
    <>
      {/* Mobile slide-over sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex md:hidden",
          sidebarOpen ? "" : "pointer-events-none"
        )}
        aria-modal="true"
        role="dialog"
      >
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 bg-black/40 transition-opacity",
            sidebarOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar panel */}
        <aside
          className={cn(
            "relative w-64 bg-background h-full shadow-xl transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-2 rounded-md hover:bg-accent"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Sidebar content */}
          <div className="h-16 flex items-center px-6 border-b font-bold text-lg">Admin Panel</div>
          <SidebarNav items={navigation} />
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-[4rem] h-[calc(100vh-4rem)] w-56 border-r bg-background flex-shrink-0 flex flex-col z-40 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b font-bold text-lg">Admin Panel</div>
        <SidebarNav items={navigation} />
      </aside>

      {/* Main content */}
      <main className="md:ml-56 px-2 py-6 md:p-8 bg-background min-h-[calc(100vh-4rem)] mt-4 md:mt-8">{children}</main>
    </>
  );
} 