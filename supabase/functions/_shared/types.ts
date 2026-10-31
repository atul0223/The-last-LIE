import type {
  CaseDefinition,
  CasePublic,
  PlayerProgress,
  Reveal,
  ScoreResult,
  SessionState,
} from '@lastlie/case-engine';
import type { GraphEdge, GraphNode, WeeklyAggregateResponse, WeeklyCaseResponse } from '@lastlie/api-contract';

export interface AppConfig {
  env: 'development' | 'staging' | 'production' | 'test';
  corsOrigins: string[];
  rateLimitPerMin: number;
  maxBodySizeBytes: number;
  guestHmacSecret: string;
  minSubmitDurationSeconds: number;
}

export interface Clock {
  now(): Date;
}

export interface AuthUser {
  userId: string;
  email?: string;
  isAnonymous?: boolean;
}

export interface AuthVerifier {
  verify(token: string): Promise<AuthUser | null>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

export interface CaseRow {
  id: string;
  version: number;
  kind: string;
  title: string;
  difficulty: number;
  mysteryType: string;
  estimatedMinutes: number;
  status: string;
  publicPayload: CasePublic;
  fingerprint?: string;
  templateId?: string;
  publishedAt?: string;
  retiredAt?: string;
}

export interface ChallengeRow {
  id: string; // short code
  creatorId: string;
  caseId: string;
  caseVersion: number;
  createdAt: string;
  expiresAt: string;
}

export interface ChallengeAttemptRow {
  challengeId: string;
  sessionId: string;
  userId?: string | null;
  guestToken?: string | null;
  hypothesisId: string;
  supportingClueIds: string[];
  score: number;
  createdAt: string;
}

export interface WeeklyCaseRow {
  id: string;
  caseId: string;
  weekNumber: number;
  year: number;
  opensAt: string;
  closesAt: string;
}

export interface Repository {
  // Case operations
  getPublishedCase(caseId: string): Promise<CaseRow | null>;
  listPublishedCases(opts?: { difficulty?: number; limit?: number }): Promise<CaseRow[]>;
  getCasePrivate(caseId: string, version: number): Promise<CaseDefinition | null>;
  upsertCase(caseRow: CaseRow, definition: CaseDefinition): Promise<void>;

  // Session operations (all strictly scoped to userId)
  getSession(sessionId: string, userId: string): Promise<SessionState | null>;
  createSession(session: SessionState): Promise<SessionState>;
  updateSession(sessionId: string, userId: string, updates: Partial<SessionState>): Promise<SessionState | null>;

  // Submit & Progress
  saveSubmitTransaction(params: {
    session: SessionState;
    result: ScoreResult;
    reveal: Reveal;
    progress: PlayerProgress;
    tooFast: boolean;
    submission: {
      hypothesisId: string;
      supportingClueIds: string[];
      contradictions: Array<{ a: string; b: string }>;
    };
  }): Promise<{
    result: ScoreResult;
    reveal: Reveal;
    progress: PlayerProgress;
    alreadySubmitted?: boolean;
  }>;
  getPlayerProgress(userId: string): Promise<PlayerProgress | null>;

  // Daily operations
  getDailyCase(date: string): Promise<string | null>;
  setDailyCase(date: string, caseId: string): Promise<void>;
  listDailyCases(limitDays: number): Promise<Array<{ date: string; caseId: string }>>;

  // Weekly operations
  getCurrentWeeklyCase(now: Date): Promise<WeeklyCaseRow | null>;
  getWeeklyCaseById(weeklyId: string): Promise<WeeklyCaseRow | null>;
  getWeeklyAggregate(weeklyId: string): Promise<WeeklyAggregateResponse | null>;

  // Challenges operations
  createChallenge(challenge: ChallengeRow): Promise<ChallengeRow>;
  getChallenge(code: string): Promise<ChallengeRow | null>;
  recordChallengeAttempt(attempt: ChallengeAttemptRow): Promise<void>;
  getChallengeAttempts(code: string): Promise<ChallengeAttemptRow[]>;

  // Account operations
  migrateLocalProgress(userId: string, solvedCaseIds: string[]): Promise<string[]>;
  deleteUserAccount(userId: string): Promise<boolean>;
  savePushToken(userId: string, token: string, platform?: string): Promise<void>;

  // Graph operations
  getPlayerGraphReveals(userId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  grantGraphReveals(userId: string, caseId: string): Promise<void>;

  // Case reports & moderation
  reportCase(params: {
    caseId: string;
    userId: string;
    reason: 'broken_logic' | 'unfair' | 'typo' | 'offensive' | 'other';
    note?: string;
  }): Promise<{ reportId: string; autoFlagged: boolean }>;
  listFlaggedCases(): Promise<FlaggedCaseSummary[]>;
  getUserReportCountInWindow(userId: string, windowSeconds: number): Promise<number>;
}

export interface CaseReportRow {
  id: string;
  caseId: string;
  userId: string;
  reason: 'broken_logic' | 'unfair' | 'typo' | 'offensive' | 'other';
  note?: string;
  createdAt: string;
}

export interface FlaggedCaseSummary {
  caseId: string;
  title: string;
  status: string;
  recentReportCount: number;
  distinctReportingUsers: number;
  reasons: Record<string, number>;
  latestReportAt: string;
}

export interface AppContextVariables {
  requestId: string;
  userId?: string;
  user?: AuthUser;
}
