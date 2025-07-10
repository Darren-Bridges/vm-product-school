"use client";

import React from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "./ui/dropdown-menu";

export function NavBar() {
  const { user, isSuperAdmin, logout } = useAuth();
  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <div>
        <a href="/" className="font-bold text-lg">Product School</a>
      </div>
      <div className="flex gap-4 items-center">
        <a href="/">Help Center</a>
        {isSuperAdmin && <a href="/admin">Admin Panel</a>}
        {user ? (
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
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="default">
            <a href="/login">Login</a>
          </Button>
        )}
      </div>
    </nav>
  );
} 