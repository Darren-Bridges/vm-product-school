import { User } from '@supabase/supabase-js';

export type AccessLevel = 'vm_internal' | 'external_clients' | 'public';

export interface Article {
  id: string;
  title: string;
  content: string;
  access_level: AccessLevel;
  status: string;
  author?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Check if a user can access an article based on their role and the article's access level
 */
export function canAccessArticle(article: Article, user: User | null, userRole?: string): boolean {
  // If article is public, anyone can access it
  if (article.access_level === 'public') {
    return true;
  }

  // If no user is logged in, only public articles are accessible
  if (!user) {
    return false;
  }

  // If article is for external clients, any logged in user can access it
  if (article.access_level === 'external_clients') {
    return true;
  }

  // If article is VM internal, only superadmin users can access it
  if (article.access_level === 'vm_internal') {
    return userRole === 'superadmin';
  }

  return false;
}

/**
 * Get the list of access levels available to a user
 */
export function getAvailableAccessLevels(userRole?: string): AccessLevel[] {
  if (userRole === 'superadmin') {
    return ['vm_internal', 'external_clients', 'public'];
  }
  
  // Regular users can only create external_clients or public articles
  return ['external_clients', 'public'];
}

/**
 * Check if a user can edit an article's access level
 */
export function canEditAccessLevel(userRole?: string): boolean {
  return userRole === 'superadmin';
} 

/**
 * Get allowed access levels for a user (for filtering in Supabase queries)
 */
export function getAllowedArticleAccessLevels(user: any, isSuperAdmin: boolean): AccessLevel[] {
  if (isSuperAdmin) return ['vm_internal', 'external_clients', 'public'];
  if (user) return ['external_clients', 'public'];
  return ['public'];
}

/**
 * Get a Supabase filter for allowed access levels (for .in() queries)
 */
export function getArticleAccessFilter(user: any, isSuperAdmin: boolean) {
  const allowed = getAllowedArticleAccessLevels(user, isSuperAdmin);
  // For Supabase: .in('access_level', allowed)
  return allowed;
} 