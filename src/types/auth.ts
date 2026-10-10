export type UserRole = 'admin' | 'visitor';

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  bio?: string;
  html_url: string;
  public_repos: number;
  followers?: number;
  role: UserRole;
  isAdmin: boolean;
  registeredAt?: string;
}

export interface AdminSystemState {
  hasAdmin: boolean;
  adminUsername: string | null;
  adminUser?: {
    login: string;
    name: string;
    avatar_url: string;
    claimedAt: string;
  } | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  token?: string;
}

export interface OAuthStatus {
  configured: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  clientId: string | null;
  redirectUri: string;
  hasAdmin?: boolean;
  adminUsername?: string | null;
  adminUser?: {
    login: string;
    name: string;
    avatar_url: string;
    claimedAt: string;
  } | null;
}
