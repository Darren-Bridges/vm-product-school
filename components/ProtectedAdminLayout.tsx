"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { AdminLayout } from "./AdminLayout";
import { Button } from "./ui/button";
import { NavBar } from "./NavBar";
import Link from "next/link";

interface ProtectedAdminLayoutProps {
  children: React.ReactNode;
}

export function ProtectedAdminLayout({ children }: ProtectedAdminLayoutProps) {
  const { user, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading while checking auth state
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Access Required</h2>
            <p className="mt-2 text-muted-foreground">
              You need to be logged in to access the admin panel.
            </p>
          </div>
          <div className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Go to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If logged in but not superadmin, redirect to home
  if (!isSuperAdmin) {
    // Redirect to home page
    if (typeof window !== "undefined") {
      router.push("/");
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">
              You don&apos;t have permission to access the admin panel.
            </p>
          </div>
          <div className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/">Go to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated and authorized, show admin layout
  return (
    <>
      <NavBar onOpenSidebar={() => setSidebarOpen(true)} />
      <AdminLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
        {children}
      </AdminLayout>
    </>
  );
} 