import type {
  CaseDefinition,
  PlayerProgress,
  Reveal,
  ScoreResult,
  SessionState,
} from '@lastlie/case-engine';
import type {
  GraphEdge,
  GraphNode,
  GraphNodeKind,
  WeeklyAggregateResponse,
} from '@lastlie/api-contract';
import type {
  CaseReportRow,
  CaseRow,
  ChallengeAttemptRow,
  ChallengeRow,
  FlaggedCaseSummary,
  Repository,
  WeeklyCaseRow,
} from './types.js';
import {
  FIXTURE_CONSPIRACY_EDGES,
  FIXTURE_CONSPIRACY_NODES,
} from './conspiracy_fixture.js';

export class InMemoryRepository implements Repository {
  private cases = new Map<string, CaseRow>();
  private caseDefinitions = new Map<string, CaseDefinition>(); // key: `${caseId}_v${version}`
  private sessions = new Map<string, SessionState>();
  private results = new Map<string, { result: ScoreResult; reveal: Reveal; tooFast: boolean; createdAt: string }>();
  private progress = new Map<string, PlayerProgress>();
  private userUnlocks = new Map<string, Set<string>>(); // userId -> Set<"kind:refId">
  private dailyCases = new Map<string, string>(); // date -> caseId
  private weeklyCases = new Map<string, WeeklyCaseRow>();
  private weeklyAttempts = new Map<string, Array<{ userId: string; displayName: string; score: number; submittedAt: string; hypothesisId: string; clueIds: string[] }>>();
  private challenges = new Map<string, ChallengeRow>();
  private challengeAttempts = new Map<string, ChallengeAttemptRow[]>();
  private pushTokens = new Map<string, { token: string; platform?: string; userId?: string }>();
  private graphNodes = new Map<string, { id: string; kind: GraphNodeKind; name: string; description?: string | null }>();
  private graphEdges = new Map<string, GraphEdge>();
  private playerRevealedEdges = new Map<string, Set<string>>(); // userId -> Set<edgeId>
  private caseReports = new Map<string, CaseReportRow>(); // reportId -> CaseReportRow

  constructor() {
    this.setGraphData(FIXTURE_CONSPIRACY_NODES, FIXTURE_CONSPIRACY_EDGES as GraphEdge[]);
  }

  // Cases
  async getPublishedCase(caseId: string): Promise<CaseRow | null> {
    const row = this.cases.get(caseId);
    if (!row || row.status !== 'published') return null;
    return row;
  }

  async listPublishedCases(opts?: { difficulty?: number; limit?: number }): Promise<CaseRow[]> {
    let list = Array.from(this.cases.values()).filter((c) => c.status === 'published');
    if (opts?.difficulty !== undefined) {
      list = list.filter((c) => c.difficulty === opts.difficulty);
    }
    if (opts?.limit) {
      list = list.slice(0, opts.limit);
    }
    return list;
  }

  async getCasePrivate(caseId: string, version: number): Promise<CaseDefinition | null> {
    const key = `${caseId}_v${version}`;
    return this.caseDefinitions.get(key) ?? null;
  }

  async upsertCase(caseRow: CaseRow, definition: CaseDefinition): Promise<void> {
    this.cases.set(caseRow.id, caseRow);
    const key = `${caseRow.id}_v${caseRow.version}`;
    this.caseDefinitions.set(key, definition);
  }

  // Sessions (Strictly scoped to userId for IDOR protection)
  async getSession(sessionId: string, userId: string): Promise<SessionState | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (session.userId !== userId) return null; // IDOR check: returns null (handled as 404)
    return session;
  }

  async createSession(session: SessionState): Promise<SessionState> {
    this.sessions.set(session.id, session);
    return session;
  }

  async updateSession(
    sessionId: string,
    userId: string,
    updates: Partial<SessionState>,
  ): Promise<SessionState | null> {
    const session = await this.getSession(sessionId, userId);
    if (!session) return null;

    const updated: SessionState = {
      ...session,
      ...updates,
      id: session.id,
      userId: session.userId,
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  // Submit & Progress
  async saveSubmitTransaction(params: {
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
  }> {
    const { session, result, reveal, progress, tooFast } = params;

    // Idempotent check: if already submitted, return the stored result
    const existingResult = this.results.get(session.id);
    if (existingResult) {
      const currentProgress = (await this.getPlayerProgress(session.userId ?? '')) ?? progress;
      return {
        result: existingResult.result,
        reveal: existingResult.reveal,
        progress: currentProgress,
        alreadySubmitted: true,
      };
    }

    // Mark session submitted
    session.status = 'submitted';
    session.submittedAt = session.submittedAt ?? new Date().toISOString();
    this.sessions.set(session.id, session);

    // Save result
    this.results.set(session.id, {
      result,
      reveal,
      tooFast,
      createdAt: session.submittedAt,
    });

    // Save progress
    if (session.userId) {
      this.progress.set(session.userId, progress);

      // Grant case unlock
      let userUnlocksSet = this.userUnlocks.get(session.userId);
      if (!userUnlocksSet) {
        userUnlocksSet = new Set();
        this.userUnlocks.set(session.userId, userUnlocksSet);
      }
      userUnlocksSet.add(`archive:${session.caseId}`);
    }

    return {
      result,
      reveal,
      progress,
    };
  }

  async getPlayerProgress(userId: string): Promise<PlayerProgress | null> {
    return this.progress.get(userId) ?? null;
  }

  // Daily
  async getDailyCase(date: string): Promise<string | null> {
    return this.dailyCases.get(date) ?? null;
  }

  async setDailyCase(date: string, caseId: string): Promise<void> {
    this.dailyCases.set(date, caseId);
  }

  async listDailyCases(limitDays: number): Promise<Array<{ date: string; caseId: string }>> {
    const entries = Array.from(this.dailyCases.entries()).map(([date, caseId]) => ({
      date,
      caseId,
    }));
    entries.sort((a, b) => b.date.localeCompare(a.date));
    return entries.slice(0, limitDays);
  }

  // Weekly
  async getCurrentWeeklyCase(now: Date): Promise<WeeklyCaseRow | null> {
    const isoNow = now.toISOString();
    for (const week of this.weeklyCases.values()) {
      if (week.opensAt <= isoNow && week.closesAt >= isoNow) {
        return week;
      }
    }
    return null;
  }

  async getWeeklyCaseById(weeklyId: string): Promise<WeeklyCaseRow | null> {
    return this.weeklyCases.get(weeklyId) ?? null;
  }

  async upsertWeeklyCase(week: WeeklyCaseRow): Promise<void> {
    this.weeklyCases.set(week.id, week);
  }

  async recordWeeklyAttempt(weeklyId: string, attempt: {
    userId: string;
    displayName: string;
    score: number;
    submittedAt: string;
    hypothesisId: string;
    clueIds: string[];
    tooFast?: boolean;
  }): Promise<void> {
    let list = this.weeklyAttempts.get(weeklyId);
    if (!list) {
      list = [];
      this.weeklyAttempts.set(weeklyId, list);
    }
    // Only first attempt counts for leaderboard
    if (!list.some((a) => a.userId === attempt.userId)) {
      list.push(attempt);
    }
  }

  async getWeeklyAggregate(weeklyId: string): Promise<WeeklyAggregateResponse | null> {
    const attempts = this.weeklyAttempts.get(weeklyId) ?? [];
    const hypothesisDistribution: Record<string, number> = {};
    const clueUsage: Record<string, number> = {};
    let totalScore = 0;

    for (const att of attempts) {
      totalScore += att.score;
      hypothesisDistribution[att.hypothesisId] = (hypothesisDistribution[att.hypothesisId] ?? 0) + 1;
      for (const clueId of att.clueIds) {
        clueUsage[clueId] = (clueUsage[clueId] ?? 0) + 1;
      }
    }

    // Leaderboard sorted by score desc, then submittedAt asc
    const sorted = [...attempts].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.submittedAt.localeCompare(b.submittedAt);
    });

    const leaderboard = sorted.map((item, idx) => ({
      userId: item.userId,
      displayName: item.displayName,
      score: item.score,
      submittedAt: item.submittedAt,
      rank: idx + 1,
    }));

    return {
      weeklyId,
      totalParticipants: attempts.length,
      hypothesisDistribution,
      clueUsage,
      averageScore: attempts.length > 0 ? Math.round((totalScore / attempts.length) * 10) / 10 : 0,
      leaderboard,
    };
  }

  // Challenges
  async createChallenge(challenge: ChallengeRow): Promise<ChallengeRow> {
    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  async getChallenge(code: string): Promise<ChallengeRow | null> {
    return this.challenges.get(code) ?? null;
  }

  async recordChallengeAttempt(attempt: ChallengeAttemptRow): Promise<void> {
    let list = this.challengeAttempts.get(attempt.challengeId);
    if (!list) {
      list = [];
      this.challengeAttempts.set(attempt.challengeId, list);
    }
    list.push(attempt);
  }

  async getChallengeAttempts(code: string): Promise<ChallengeAttemptRow[]> {
    return this.challengeAttempts.get(code) ?? [];
  }

  // Account
  async migrateLocalProgress(userId: string, solvedCaseIds: string[]): Promise<string[]> {
    let unlocks = this.userUnlocks.get(userId);
    if (!unlocks) {
      unlocks = new Set();
      this.userUnlocks.set(userId, unlocks);
    }

    const unlocked: string[] = [];
    for (const id of solvedCaseIds) {
      unlocks.add(`archive:${id}`);
      unlocked.push(id);
    }

    return unlocked;
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    // Delete user sessions
    for (const [id, s] of this.sessions.entries()) {
      if (s.userId === userId) {
        this.sessions.delete(id);
        this.results.delete(id);
      }
    }
    this.progress.delete(userId);
    this.userUnlocks.delete(userId);
    this.deletePushToken(userId);
    this.playerRevealedEdges.delete(userId);
    return true;
  }

  async savePushToken(userId: string, token: string, platform?: string): Promise<void> {
    this.pushTokens.set(`${userId}:${token}`, { token, platform, userId });
    this.pushTokens.set(userId, { token, platform, userId });
  }

  async deletePushToken(userId: string, token?: string): Promise<boolean> {
    let deleted = false;
    if (token) {
      if (this.pushTokens.delete(`${userId}:${token}`)) deleted = true;
      const direct = this.pushTokens.get(userId);
      if (direct?.token === token) {
        this.pushTokens.delete(userId);
        deleted = true;
      }
    } else {
      for (const [k, v] of this.pushTokens.entries()) {
        if (k === userId || v.userId === userId) {
          this.pushTokens.delete(k);
          deleted = true;
        }
      }
    }
    return deleted;
  }

  // Graph
  async getPlayerGraphReveals(userId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const revealedEdgeIds = this.playerRevealedEdges.get(userId) ?? new Set<string>();

    const revealedEdges: GraphEdge[] = [];
    const revealedNodeIds = new Set<string>();
    const adjacentNodeIds = new Set<string>();

    for (const edge of this.graphEdges.values()) {
      if (revealedEdgeIds.has(edge.id)) {
        revealedEdges.push(edge);
        revealedNodeIds.add(edge.from);
        revealedNodeIds.add(edge.to);
      }
    }

    // Find 1-hop neighbours of revealed nodes
    for (const edge of this.graphEdges.values()) {
      if (!revealedEdgeIds.has(edge.id)) {
        if (revealedNodeIds.has(edge.from) && !revealedNodeIds.has(edge.to)) {
          adjacentNodeIds.add(edge.to);
        } else if (revealedNodeIds.has(edge.to) && !revealedNodeIds.has(edge.from)) {
          adjacentNodeIds.add(edge.from);
        }
      }
    }

    const nodes: GraphNode[] = [];

    // Fully revealed nodes
    for (const nodeId of revealedNodeIds) {
      const node = this.graphNodes.get(nodeId);
      if (node) {
        nodes.push({
          id: node.id,
          kind: node.kind,
          name: node.name,
          description: node.description,
          revealed: true,
        });
      }
    }

    // Unrevealed neighbours (name: null, description: null)
    for (const neighbourId of adjacentNodeIds) {
      const node = this.graphNodes.get(neighbourId);
      if (node) {
        nodes.push({
          id: node.id,
          kind: node.kind,
          name: null,
          description: null,
          revealed: false,
        });
      }
    }

    return { nodes, edges: revealedEdges };
  }

  async grantGraphReveals(userId: string, caseId: string): Promise<void> {
    let reveals = this.playerRevealedEdges.get(userId);
    if (!reveals) {
      reveals = new Set();
      this.playerRevealedEdges.set(userId, reveals);
    }

    for (const edge of this.graphEdges.values()) {
      if (edge.revealedByCaseId === caseId) {
        reveals.add(edge.id);
      }
    }
  }

  setGraphData(
    nodes: Array<{ id: string; kind: GraphNodeKind; name: string; description?: string | null }>,
    edges: GraphEdge[],
  ): void {
    for (const n of nodes) {
      this.graphNodes.set(n.id, {
        id: n.id,
        kind: n.kind,
        name: n.name,
        description: n.description ?? null,
      });
    }
    for (const e of edges) {
      this.graphEdges.set(e.id, e);
    }
  }

  // Moderation & Case Reports
  async reportCase(params: {
    caseId: string;
    userId: string;
    reason: 'broken_logic' | 'unfair' | 'typo' | 'offensive' | 'other';
    note?: string;
  }): Promise<{ reportId: string; autoFlagged: boolean }> {
    const reportId = `rep_${Math.random().toString(36).substring(2, 10)}`;
    const nowIso = new Date().toISOString();
    const row: CaseReportRow = {
      id: reportId,
      caseId: params.caseId,
      userId: params.userId,
      reason: params.reason,
      ...(params.note !== undefined ? { note: params.note } : {}),
      createdAt: nowIso,
    };
    this.caseReports.set(reportId, row);

    // Auto-flagging check: >= 5 distinct reporting users within 7 days
    const sevenDaysAgo = Date.now() - 7 * 86400 * 1000;
    const recentReportingUsers = new Set<string>();

    for (const rep of this.caseReports.values()) {
      if (rep.caseId === params.caseId) {
        const repTime = new Date(rep.createdAt).getTime();
        if (repTime >= sevenDaysAgo) {
          recentReportingUsers.add(rep.userId);
        }
      }
    }

    let autoFlagged = false;
    if (recentReportingUsers.size >= 5) {
      const caseRow = this.cases.get(params.caseId);
      if (caseRow && caseRow.status !== 'under_review') {
        caseRow.status = 'under_review';
        autoFlagged = true;
      }
    }

    return { reportId, autoFlagged };
  }

  async listFlaggedCases(): Promise<FlaggedCaseSummary[]> {
    const summaries: FlaggedCaseSummary[] = [];
    const sevenDaysAgo = Date.now() - 7 * 86400 * 1000;

    for (const c of this.cases.values()) {
      const reportsForCase = Array.from(this.caseReports.values()).filter(
        (r) => r.caseId === c.id,
      );
      const recentReports = reportsForCase.filter(
        (r) => new Date(r.createdAt).getTime() >= sevenDaysAgo,
      );
      const distinctUsers = new Set(recentReports.map((r) => r.userId));

      if (c.status === 'under_review' || distinctUsers.size >= 5) {
        const reasons: Record<string, number> = {};
        let latest = '';
        for (const r of reportsForCase) {
          reasons[r.reason] = (reasons[r.reason] || 0) + 1;
          if (!latest || r.createdAt > latest) {
            latest = r.createdAt;
          }
        }

        summaries.push({
          caseId: c.id,
          title: c.title,
          status: c.status,
          recentReportCount: recentReports.length,
          distinctReportingUsers: distinctUsers.size,
          reasons,
          latestReportAt: latest,
        });
      }
    }

    return summaries;
  }

  async getUserReportCountInWindow(userId: string, windowSeconds: number): Promise<number> {
    const threshold = Date.now() - windowSeconds * 1000;
    let count = 0;
    for (const rep of this.caseReports.values()) {
      if (rep.userId === userId && new Date(rep.createdAt).getTime() >= threshold) {
        count++;
      }
    }
    return count;
  }
}
