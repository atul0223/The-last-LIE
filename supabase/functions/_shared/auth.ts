import type { AuthUser, AuthVerifier } from './types.js';

export class MockAuthVerifier implements AuthVerifier {
  private users = new Map<string, AuthUser>();

  constructor(initialUsers: AuthUser[] = []) {
    for (const u of initialUsers) {
      this.users.set(u.userId, u);
    }
  }

  addUser(user: AuthUser): void {
    this.users.set(user.userId, user);
  }

  async verify(token: string): Promise<AuthUser | null> {
    if (!token || token === 'invalid' || token === 'expired') {
      return null;
    }

    // Direct token matching "user_<id>" or "token_<id>"
    if (token.startsWith('user_')) {
      const existing = this.users.get(token);
      if (existing) return existing;
      return { userId: token, isAnonymous: false };
    }

    if (token.startsWith('token_')) {
      const userId = token.replace('token_', 'user_');
      const existing = this.users.get(userId);
      if (existing) return existing;
      return { userId, isAnonymous: false };
    }

    // Check if token exists in registered users
    for (const [id, user] of this.users.entries()) {
      if (id === token) {
        return user;
      }
    }

    return null;
  }
}

export class SupabaseAuthVerifier implements AuthVerifier {
  private supabaseUrl: string;
  private anonKey: string;

  constructor(supabaseUrl: string, anonKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.anonKey = anonKey;
  }

  async verify(token: string): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${this.supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: this.anonKey,
        },
      });

      if (!res.ok) {
        return null;
      }

      const user = (await res.json()) as { id: string; email?: string; is_anonymous?: boolean };
      return {
        userId: user.id,
        email: user.email,
        isAnonymous: user.is_anonymous,
      };
    } catch {
      return null;
    }
  }
}
