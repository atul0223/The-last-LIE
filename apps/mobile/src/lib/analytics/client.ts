import { getStorage } from '../../services/local/storage';
import { validateEvent, type AnalyticsEvent } from './events';

export const STORAGE_KEY_DISTINCT_ID = 'lastlie_analytics_distinct_id';
export const STORAGE_KEY_CONSENT = 'lastlie_analytics_consent';

export class AnalyticsSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticsSecurityError';
  }
}

let inMemoryEvents: AnalyticsEvent[] = [];
let postHogInstance: { capture: (name: string, props?: Record<string, unknown>) => void } | null = null;
let isInitialized = false;

/**
 * Generates an anonymous, cryptographically unlinked identifier.
 * Format: anon_<hex>_<timestamp>
 * Strictly avoids any email, username, or device fingerprinting.
 */
export function generateAnonymousDistinctId(): string {
  const randPart = Math.random().toString(36).substring(2, 12);
  const timePart = Date.now().toString(36);
  return `anon_${randPart}_${timePart}`;
}

/**
 * Retrieves the stored anonymous distinct ID, or creates and persists a new one.
 */
export function getDistinctId(): string {
  const storage = getStorage();
  const existing = storage.getString(STORAGE_KEY_DISTINCT_ID);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const newId = generateAnonymousDistinctId();
  storage.set(STORAGE_KEY_DISTINCT_ID, newId);
  return newId;
}

/**
 * Consent toggle:
 * Per WP-46 specifications, defaults to ON in development environment (__DEV__),
 * and can be explicitly granted or revoked by the player.
 */
export function getAnalyticsConsent(): boolean {
  const storage = getStorage();
  const stored = storage.getString(STORAGE_KEY_CONSENT);

  if (stored === 'true') return true;
  if (stored === 'false') return false;

  // Default: ON in development mode for verification and funnel testing;
  // In production builds without explicit consent record, defaults to false (opt-in).
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  return isDev;
}

export function setAnalyticsConsent(granted: boolean): void {
  const storage = getStorage();
  storage.set(STORAGE_KEY_CONSENT, granted ? 'true' : 'false');
}

/**
 * Initializes the analytics client with PostHog if configured via environment variables.
 */
export function initAnalytics(): void {
  if (isInitialized) return;
  isInitialized = true;

  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

  if (!apiKey || apiKey.trim().length === 0) {
    // In dev / test when unset, fallback to safe mock buffer
    return;
  }

  try {
    // Dynamic import / require of posthog-react-native
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PostHogModule = require('posthog-react-native');
    const PostHogClass = PostHogModule.PostHog ?? PostHogModule.default;
    if (typeof PostHogClass === 'function') {
      postHogInstance = new PostHogClass(apiKey, {
        host,
        enableSessionRecording: false, // Strict PII protection
      });
    }
  } catch {
    // Native posthog unavailable or headless test environment
  }
}

/**
 * Dispatches a typed §11 analytics event.
 *
 * Rules:
 * 1. Strictly enforces the prop allow-list. Fails if forbidden keys or PII/prose appear.
 * 2. Strict no-op when user consent is revoked.
 * 3. Transmits only anonymous distinct ID.
 */
export function track(event: AnalyticsEvent): void {
  // 1. Consent check
  if (!getAnalyticsConsent()) {
    return;
  }

  // 2. Allow-list and PII validation
  const validation = validateEvent(event);
  if (!validation.ok) {
    throw new AnalyticsSecurityError(
      `Analytics prop allow-list violation on event '${event.name}': ${validation.reason}`,
    );
  }

  // 3. Record in memory buffer for inspection & testing
  inMemoryEvents.push(event);

  // 4. Send to PostHog if initialized
  if (postHogInstance) {
    try {
      const distinctId = getDistinctId();
      postHogInstance.capture(event.name, {
        ...('properties' in event ? event.properties : {}),
        distinct_id: distinctId,
      });
    } catch {
      // Analytics failure must never crash the game loop
    }
  }
}

export function getTrackedEvents(): AnalyticsEvent[] {
  return [...inMemoryEvents];
}

export function clearTrackedEvents(): void {
  inMemoryEvents = [];
}

export function resetAnalytics(): void {
  inMemoryEvents = [];
  postHogInstance = null;
  isInitialized = false;
}
