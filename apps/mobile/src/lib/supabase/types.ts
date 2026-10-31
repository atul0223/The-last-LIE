export interface SupabaseUser {
  id: string;
  email?: string;
  isAnonymous: boolean;
  userMetadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface SupabaseSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: SupabaseUser;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'offline';

export interface UserProfile {
  displayName: string;
  title: string;
  earnedTitles: string[];
  isAnonymous: boolean;
  email?: string;
  privacy: {
    publicProfile: boolean;
    shareAnalytics: boolean;
    leaderboardVisible: boolean;
  };
}

export interface SocialAuthFlags {
  apple: boolean;
  google: boolean;
}
