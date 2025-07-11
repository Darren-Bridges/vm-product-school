"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { SearchBar } from "./SearchBar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import Image from "next/image";
import { Menu } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface NavBarProps {
  onOpenSidebar?: () => void;
}

export function NavBar({ onOpenSidebar }: NavBarProps) {
  const { user, isSuperAdmin, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show search bar on all pages except home and admin pages
  const shouldShowSearch = mounted && pathname !== "/" && !pathname.startsWith("/admin");
  const isAdminPage = mounted && pathname.startsWith("/admin");

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-background h-16 flex items-center justify-between border-b px-6">
      {/* Mobile: show logo to the left of search bar */}
      <div className="flex items-center md:hidden mr-2">
        <Link href="/">
          <Image src="/VMlogo.62080a51e68bffbddd39660df08de35e.svg" alt="VM Logo" width={32} height={32} priority />
        </Link>
      </div>
      {/* Desktop: logo + Product School + Help Centre */}
      <div className="hidden md:flex items-center gap-2">
        <Link href="/">
          <Image src="/VMlogo.62080a51e68bffbddd39660df08de35e.svg" alt="VM Logo" width={32} height={32} priority />
        </Link>
        <Link href="/" className="font-bold text-lg">Product School</Link>
        <div className="mx-2 h-6 border-l border-gray-300" />
        <Link href="/" >Help Centre</Link>
        {user && (
          <Link
            href="/roadmap"
            className="ml-4 flex items-center gap-2 hover:text-foreground transition-colors"
          >
            Roadmap
          </Link>
        )}
      </div>
      {shouldShowSearch && (
        <div className="flex-1 max-w-md mx-4 md:mx-8">
          <SearchBar />
        </div>
      )}
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {/* Hamburger menu for admin pages on mobile */}
        {isAdminPage && (
          <button
            className="md:hidden mr-2 p-2 rounded-md bg-background border shadow-sm hover:bg-accent"
            aria-label="Open sidebar"
            onClick={onOpenSidebar}
            type="button"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {mounted && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarFallback>{user.email[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="font-medium">{user.email}</div>
                <div className="text-xs text-muted-foreground">{user.role.displayName}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {mounted && isSuperAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">Admin Panel</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="default">
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>
    </nav>
  );
} 