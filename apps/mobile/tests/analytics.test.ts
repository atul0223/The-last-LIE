import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import {
  track,
  getDistinctId,
  generateAnonymousDistinctId,
  getAnalyticsConsent,
  setAnalyticsConsent,
  getTrackedEvents,
  clearTrackedEvents,
  resetAnalytics,
  AnalyticsSecurityError,
  STORAGE_KEY_CONSENT,
  STORAGE_KEY_DISTINCT_ID,
  validateEvent,
  AnalyticsProvider,
  type AnalyticsEvent,
} from '../src/lib/analytics';
import {
  initSentry,
  isSentryEnabled,
  captureException,
  captureMessage,
  scrubSentryEvent,
  resetSentry,
  SentryProvider,
} from '../src/lib/sentry';
import { MemoryKeyValueStore, setStorage } from '../src/services/local/storage';

describe('Analytics & Monitoring Suite (WP-46)', () => {
  let memoryStore: MemoryKeyValueStore;

  beforeEach(() => {
    memoryStore = new MemoryKeyValueStore();
    setStorage(memoryStore);
    clearTrackedEvents();
    resetAnalytics();
    resetSentry();
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('§11 Event Union & Dispatch', () => {
    it('accepts and records all valid §11 event variants', () => {
      // 1. app_open
      track({ name: 'app_open' });

      // 2. case_started
      track({
        name: 'case_started',
        properties: {
          caseId: 'case_0001',
          kind: 'authored',
          difficulty: 1,
          mode: 'normal',
        },
      });

      // 3. clue_viewed
      track({
        name: 'clue_viewed',
        properties: {
          caseId: 'case_0001',
          clueId: 'clue_alibi_tim',
        },
      });

      // 4. clue_unlocked
      track({
        name: 'clue_unlocked',
        properties: {
          caseId: 'case_0001',
          clueId: 'clue_security_cam',
          via: 'contradiction',
        },
      });

      // 5. board_link_created
      track({
        name: 'board_link_created',
        properties: {
          caseId: 'case_0001',
          a: 'clue_alibi_tim',
          b: 'clue_security_cam',
          valid: true,
        },
      });

      // 6. case_submitted
      track({
        name: 'case_submitted',
        properties: {
          caseId: 'case_0001',
          correct: true,
          score: 100,
          durationSec: 184,
        },
      });

      // 7. reveal_viewed
      track({
        name: 'reveal_viewed',
        properties: {
          caseId: 'case_0001',
        },
      });

      // 8. next_case_tapped
      track({
        name: 'next_case_tapped',
        properties: {
          caseId: 'case_0001',
        },
      });

      // 9. challenge_created
      track({
        name: 'challenge_created',
        properties: {
          caseId: 'case_0001',
          challengeCode: 'CH_847192',
        },
      });

      // 10. challenge_opened
      track({
        name: 'challenge_opened',
        properties: {
          challengeCode: 'CH_847192',
          guest: true,
        },
      });

      // 11. challenge_completed
      track({
        name: 'challenge_completed',
        properties: {
          challengeCode: 'CH_847192',
        },
      });

      // 12. signup_from_challenge
      track({
        name: 'signup_from_challenge',
        properties: {
          challengeCode: 'CH_847192',
        },
      });

      // 13. case_reported
      track({
        name: 'case_reported',
        properties: {
          caseId: 'case_0001',
          reason: 'contradiction_impossible',
        },
      });

      const tracked = getTrackedEvents();
      expect(tracked).toHaveLength(13);
      expect(tracked.map((e) => e.name)).toEqual([
        'app_open',
        'case_started',
        'clue_viewed',
        'clue_unlocked',
        'board_link_created',
        'case_submitted',
        'reveal_viewed',
        'next_case_tapped',
        'challenge_created',
        'challenge_opened',
        'challenge_completed',
        'signup_from_challenge',
        'case_reported',
      ]);
    });

    it('rejects unknown or arbitrary event names not in the union', () => {
      expect(() =>
        track({ name: 'arbitrary_custom_click' } as unknown as AnalyticsEvent),
      ).toThrow(AnalyticsSecurityError);
      expect(() =>
        track({ name: 'user_profile_updated' } as unknown as AnalyticsEvent),
      ).toThrow(AnalyticsSecurityError);
    });
  });

  describe('Prop Allow-list & Leak Prevention', () => {
    it('fails if an unauthorized property key is supplied to an event', () => {
      expect(() =>
        track({
          name: 'clue_viewed',
          properties: {
            caseId: 'case_0001',
            clueId: 'clue_1',
            unauthorizedKey: 'leak',
          },
        } as unknown as AnalyticsEvent),
      ).toThrow(/Disallowed property key 'unauthorizedKey'/);
    });

    it('fails if an event prop contains an email address in its value', () => {
      expect(() =>
        track({
          name: 'case_reported',
          properties: {
            caseId: 'case_0001',
            reason: 'player_john@example.com reported error',
          },
        }),
      ).toThrow(/contains an email address/);
    });

    it('fails if property keys attempt to transmit PII or user identity', () => {
      expect(
        validateEvent({
          name: 'case_started',
          properties: {
            caseId: 'case_0001',
            kind: 'authored',
            difficulty: 1,
            mode: 'normal',
            userName: 'Alice',
          },
        } as unknown as AnalyticsEvent),
      ).toEqual(
        expect.objectContaining({
          ok: false,
        }),
      );
    });

    it('fails if an event property contains long free text prose', () => {
      expect(() =>
        track({
          name: 'case_reported',
          properties: {
            caseId: 'case_0001',
            reason:
              'This clue text is far too verbose and seems to contain a whole descriptive paragraph explaining what happened at the scene.',
          },
        }),
      ).toThrow(/free-text or clue\/hypothesis prose/);
    });

    it('fails if an event property contains narrative clue/hypothesis keywords', () => {
      expect(() =>
        track({
          name: 'case_reported',
          properties: {
            caseId: 'case_0001',
            reason: 'victim turnstile claimed',
          },
        }),
      ).toThrow(/narrative clue\/hypothesis text keywords/);
    });
  });

  describe('Anonymous Distinct ID', () => {
    it('generates an anonymous ID without email or identity patterns', () => {
      const id = generateAnonymousDistinctId();
      expect(id).toMatch(/^anon_[a-z0-9]+_[a-z0-9]+$/);
      expect(id).not.toContain('@');
      expect(id).not.toContain('.');
    });

    it('persists and retrieves distinct ID from storage', () => {
      expect(memoryStore.getString(STORAGE_KEY_DISTINCT_ID)).toBeUndefined();

      const id1 = getDistinctId();
      expect(id1).toBeTruthy();
      expect(memoryStore.getString(STORAGE_KEY_DISTINCT_ID)).toBe(id1);

      const id2 = getDistinctId();
      expect(id2).toBe(id1);
    });

    it('preserves an existing valid distinct ID from storage', () => {
      memoryStore.set(STORAGE_KEY_DISTINCT_ID, 'anon_custom_persisted_id');
      const retrieved = getDistinctId();
      expect(retrieved).toBe('anon_custom_persisted_id');
    });
  });

  describe('Consent Toggle & Privacy', () => {
    it('defaults consent to ON in development / test environment', () => {
      expect(getAnalyticsConsent()).toBe(true);
    });

    it('honors explicit consent opt-out', () => {
      setAnalyticsConsent(false);
      expect(getAnalyticsConsent()).toBe(false);
      expect(memoryStore.getString(STORAGE_KEY_CONSENT)).toBe('false');

      // Tracking should be a strict no-op
      track({ name: 'app_open' });
      track({
        name: 'case_started',
        properties: {
          caseId: 'c1',
          kind: 'authored',
          difficulty: 1,
          mode: 'normal',
        },
      });

      expect(getTrackedEvents()).toHaveLength(0);
    });

    it('resumes tracking when consent is granted again', () => {
      setAnalyticsConsent(false);
      track({ name: 'app_open' });
      expect(getTrackedEvents()).toHaveLength(0);

      setAnalyticsConsent(true);
      track({ name: 'app_open' });
      expect(getTrackedEvents()).toHaveLength(1);
    });
  });

  describe('Sentry Monitoring & Scrubbing', () => {
    it('is a safe no-op when EXPO_PUBLIC_SENTRY_DSN is unset', () => {
      initSentry();
      expect(isSentryEnabled()).toBe(false);

      // Safe execution without error
      expect(() => captureException(new Error('Test error'))).not.toThrow();
      expect(() => captureMessage('Test info message')).not.toThrow();
    });

    it('scrubs user email, username, and IP address from Sentry events', () => {
      const rawEvent = {
        event_id: 'evt_1',
        user: {
          id: 'usr_123',
          email: 'detective@agency.com',
          username: 'sherlock_holmes',
          ip_address: '192.168.1.1',
        },
      };

      const scrubbed = scrubSentryEvent(rawEvent);
      expect(scrubbed.user).toEqual({
        id: 'usr_123',
      });
      expect(scrubbed.user).not.toHaveProperty('email');
      expect(scrubbed.user).not.toHaveProperty('username');
      expect(scrubbed.user).not.toHaveProperty('ip_address');
    });

    it('scrubs authorization headers, cookies, and tokens from request data', () => {
      const rawEvent = {
        request: {
          headers: {
            authorization: 'Bearer secret_jwt_token',
            cookie: 'session_id=abc123xyz',
            'x-api-key': 'secret_key',
            'content-type': 'application/json',
          },
          query_string: 'token=super_secret_val&page=2&email=user%40test.com&mode=fast',
        },
      };

      const scrubbed = scrubSentryEvent(rawEvent);
      expect(scrubbed.request?.headers).toEqual({
        authorization: '[REDACTED]',
        cookie: '[REDACTED]',
        'x-api-key': '[REDACTED]',
        'content-type': 'application/json',
      });
      expect(scrubbed.request?.query_string).toBe(
        'token=[REDACTED]&page=2&email=[REDACTED]&mode=fast',
      );
    });

    it('scrubs PII and email addresses from breadcrumbs data', () => {
      const rawEvent = {
        breadcrumbs: [
          {
            category: 'navigation',
            message: 'Navigated to library',
          },
          {
            category: 'network',
            data: {
              authorization: 'Bearer abc',
              contact: 'support@thelastlie.game',
              status: 200,
            },
          },
        ],
      };

      const scrubbed = scrubSentryEvent(rawEvent);
      expect(scrubbed.breadcrumbs[1]?.data).toEqual({
        authorization: '[REDACTED]',
        contact: '[EMAIL_REDACTED]',
        status: 200,
      });
    });
  });

  describe('Providers Rendering', () => {
    it('renders children and emits app_open event in AnalyticsProvider', () => {
      let tree: renderer.ReactTestRenderer | null = null;
      act(() => {
        tree = renderer.create(
          React.createElement(
            AnalyticsProvider,
            null,
            React.createElement(Text, { testID: 'child-text' }, 'Inside Provider'),
          ),
        );
      });

      expect(tree).not.toBeNull();
      const text = tree!.root.findByProps({ testID: 'child-text' });
      expect(text.props.children).toBe('Inside Provider');

      const events = getTrackedEvents();
      expect(events.some((e) => e.name === 'app_open')).toBe(true);
    });

    it('renders children cleanly in SentryProvider', () => {
      let tree: renderer.ReactTestRenderer | null = null;
      act(() => {
        tree = renderer.create(
          React.createElement(
            SentryProvider,
            null,
            React.createElement(Text, { testID: 'sentry-child' }, 'Sentry Active'),
          ),
        );
      });

      expect(tree).not.toBeNull();
      const text = tree!.root.findByProps({ testID: 'sentry-child' });
      expect(text.props.children).toBe('Sentry Active');
    });
  });
});
