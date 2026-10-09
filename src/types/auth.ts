export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  bio?: string;
  html_url: string;
  public_repos: number;
  followers?: number;
  role: 'owner';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  token?: string;
}
