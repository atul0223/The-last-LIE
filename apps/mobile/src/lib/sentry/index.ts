import React from 'react';

export interface SentryConfig {
  dsn?: string | undefined;
  environment?: string | undefined;
  release?: string | undefined;
  debug?: boolean | undefined;
}

const FORBIDDEN_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-auth-token',
  'x-api-key',
  'apikey',
  'bearer',
]);

const PII_QUERY_PARAMS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'password',
  'secret',
  'email',
]);

let isInitialized = false;
let sentryClient: {
  captureException: (err: unknown, ctx?: unknown) => void;
  captureMessage: (msg: string, level?: unknown) => void;
} | null = null;

/**
 * PII scrubbing transformer passed to Sentry beforeSend.
 * Ensures:
 * 1. User identifiers contain NO emails, usernames, or IP addresses.
 * 2. Authorization headers and cookies are completely stripped.
 * 3. Sensitive query parameters are redacted.
 */
export function scrubSentryEvent<T extends Record<string, unknown>>(event: T): T {
  if (!event) return event;

  // 1. Scrub User PII
  if (event.user && typeof event.user === 'object') {
    const user = event.user as Record<string, unknown>;
    delete user.email;
    delete user.username;
    delete user.ip_address;
  }

  // 2. Scrub Request Headers
  if (event.request && typeof event.request === 'object') {
    const request = event.request as Record<string, unknown>;
    if (request.headers && typeof request.headers === 'object') {
      const headers = request.headers as Record<string, unknown>;
      for (const key of Object.keys(headers)) {
        if (FORBIDDEN_HEADER_KEYS.has(key.toLowerCase())) {
          headers[key] = '[REDACTED]';
        }
      }
    }

    // 3. Scrub Request Query String
    if (typeof request.query_string === 'string') {
      const parts = request.query_string.split('&');
      const scrubbed = parts.map((part: string) => {
        const [k] = part.split('=');
        if (k && PII_QUERY_PARAMS.has(k.toLowerCase())) {
          return `${k}=[REDACTED]`;
        }
        return part;
      });
      request.query_string = scrubbed.join('&');
    }
  }

  // 4. Scrub Breadcrumbs
  if (Array.isArray(event.breadcrumbs)) {
    for (const b of event.breadcrumbs) {
      if (b && typeof b === 'object' && 'data' in b && b.data && typeof b.data === 'object') {
        const data = b.data as Record<string, unknown>;
        for (const [k, v] of Object.entries(data)) {
          if (FORBIDDEN_HEADER_KEYS.has(k.toLowerCase()) || PII_QUERY_PARAMS.has(k.toLowerCase())) {
            data[k] = '[REDACTED]';
          }
          if (typeof v === 'string' && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(v)) {
            data[k] = '[EMAIL_REDACTED]';
          }
        }
      }
    }
  }

  return event;
}

/**
 * Initializes Sentry monitoring for the mobile application.
 * If EXPO_PUBLIC_SENTRY_DSN is unset or empty, operates as a safe no-op.
 */
export function initSentry(customConfig?: SentryConfig): void {
  if (isInitialized) return;
  isInitialized = true;

  const dsn = customConfig?.dsn ?? process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || dsn.trim().length === 0) {
    // Sentry DSN unset: safe no-op mode
    return;
  }

  const environment =
    customConfig?.environment ??
    process.env.NODE_ENV ??
    (typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production');

  const release = customConfig?.release ?? 'the-last-lie@0.1.0';

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native');
    if (typeof Sentry.init === 'function') {
      Sentry.init({
        dsn,
        environment,
        release,
        enableAutoSessionTracking: true,
        beforeSend: (event: Record<string, unknown>) => scrubSentryEvent(event),
      });
      sentryClient = Sentry;
    }
  } catch {
    // Native Sentry module not loaded (e.g. node test environment or web fallback)
  }
}

export function isSentryEnabled(): boolean {
  return sentryClient !== null;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (sentryClient) {
    try {
      sentryClient.captureException(err, context ? { extra: context } : undefined);
    } catch {
      // Never crash on telemetry
    }
  }
}

export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (sentryClient) {
    try {
      sentryClient.captureMessage(msg, level);
    } catch {
      // Never crash on telemetry
    }
  }
}

export function resetSentry(): void {
  isInitialized = false;
  sentryClient = null;
}

export interface SentryProviderProps {
  children: React.ReactNode;
}

export function SentryProvider({ children }: SentryProviderProps): React.JSX.Element {
  React.useEffect(() => {
    initSentry();
  }, []);

  return React.createElement(React.Fragment, null, children);
}
