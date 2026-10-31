import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
  WeeklyAggregateResponse,
} from '@lastlie/api-contract';
import type {
  CaseRow,
  ChallengeAttemptRow,
  ChallengeRow,
  FlaggedCaseSummary,
  Repository,
  WeeklyCaseRow,
} from './types.js';

export class PostgresRepository implements Repository {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  // Case operations
  async getPublishedCase(caseId: string): Promise<CaseRow | null> {
    const { data, error } = await this.client
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .eq('status', 'published')
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      version: data.version,
      kind: data.kind,
      title: data.title,
      difficulty: data.difficulty,
      mysteryType: data.mystery_type,
      estimatedMinutes: data.estimated_minutes,
      status: data.status,
      publicPayload: data.public_payload,
      fingerprint: data.fingerprint,
      templateId: data.template_id,
      publishedAt: data.published_at,
      retiredAt: data.retired_at,
    };
  }

  async listPublishedCases(opts?: { difficulty?: number; limit?: number }): Promise<CaseRow[]> {
    let query = this.client
      .from('cases')
      .select('*')
      .eq('status', 'published');

    if (opts?.difficulty !== undefined) {
      query = query.eq('difficulty', opts.difficulty);
    }
    if (opts?.limit) {
      query = query.limit(opts.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      version: d.version,
      kind: d.kind,
      title: d.title,
      difficulty: d.difficulty,
      mysteryType: d.mystery_type,
      estimatedMinutes: d.estimated_minutes,
      status: d.status,
      publicPayload: d.public_payload,
      fingerprint: d.fingerprint,
      templateId: d.template_id,
      publishedAt: d.published_at,
      retiredAt: d.retired_at,
    }));
  }

  async getCasePrivate(caseId: string, version: number): Promise<CaseDefinition | null> {
    const { data, error } = await this.client
      .from('case_private')
      .select('definition')
      .eq('case_id', caseId)
      .eq('version', version)
      .maybeSingle();

    if (error || !data) return null;
    return data.definition as CaseDefinition;
  }

  async upsertCase(caseRow: CaseRow, definition: CaseDefinition): Promise<void> {
    const { error: caseErr } = await this.client.from('cases').upsert({
      id: caseRow.id,
      version: caseRow.version,
      kind: caseRow.kind,
      title: caseRow.title,
      difficulty: caseRow.difficulty,
      mystery_type: caseRow.mysteryType,
      estimated_minutes: caseRow.estimatedMinutes,
      status: caseRow.status,
      public_payload: caseRow.publicPayload,
      fingerprint: caseRow.fingerprint,
      template_id: caseRow.templateId,
      published_at: caseRow.publishedAt,
    });
    if (caseErr) throw caseErr;

    const { error: privErr } = await this.client.from('case_private').upsert({
      case_id: caseRow.id,
      version: caseRow.version,
      definition,
    });
    if (privErr) throw privErr;
  }

  // Session operations (STRICTLY scoped to userId)
  async getSession(sessionId: string, userId: string): Promise<SessionState | null> {
    const { data, error } = await this.client
      .from('case_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId) // Enforce user scoping in code
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      caseId: data.case_id,
      caseVersion: data.case_version,
      mode: data.mode,
      unlockedClueIds: data.unlocked_clue_ids || [],
      board: data.board || { cards: [], links: [] },
      status: data.status,
      startedAt: data.started_at,
      submittedAt: data.submitted_at,
    };
  }

  async createSession(session: SessionState): Promise<SessionState> {
    const { data, error } = await this.client
      .from('case_sessions')
      .insert({
        id: session.id,
        user_id: session.userId,
        case_id: session.caseId,
        case_version: session.caseVersion,
        mode: session.mode,
        unlocked_clue_ids: session.unlockedClueIds,
        board: session.board,
        status: session.status,
        started_at: session.startedAt,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      caseId: data.case_id,
      caseVersion: data.case_version,
      mode: data.mode,
      unlockedClueIds: data.unlocked_clue_ids,
      board: data.board,
      status: data.status,
      startedAt: data.started_at,
      submittedAt: data.submitted_at,
    };
  }

  async updateSession(
    sessionId: string,
    userId: string,
    updates: Partial<SessionState>,
  ): Promise<SessionState | null> {
    const updatePayload: Record<string, unknown> = {};
    if (updates.unlockedClueIds !== undefined) updatePayload.unlocked_clue_ids = updates.unlockedClueIds;
    if (updates.board !== undefined) updatePayload.board = updates.board;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.submittedAt !== undefined) updatePayload.submitted_at = updates.submittedAt;

    const { data, error } = await this.client
      .from('case_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .eq('user_id', userId) // Enforce user scoping in code
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      caseId: data.case_id,
      caseVersion: data.case_version,
      mode: data.mode,
      unlockedClueIds: data.unlocked_clue_ids,
      board: data.board,
      status: data.status,
      startedAt: data.started_at,
      submittedAt: data.submitted_at,
    };
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
    const { session, result, reveal, progress, tooFast, submission } = params;

    // Call stored procedure or execute atomic sequence
    const { data: existing } = await this.client
      .from('case_results')
      .select('*')
      .eq('session_id', session.id)
      .eq('user_id', session.userId)
      .maybeSingle();

    if (existing) {
      const { data: prog } = await this.client
        .from('player_progress')
        .select('*')
        .eq('user_id', session.userId)
        .maybeSingle();

      return {
        result: {
          score: existing.score,
          breakdown: existing.breakdown,
          xp: existing.xp,
        },
        reveal,
        progress: prog
          ? {
              userId: prog.user_id,
              xp: prog.xp,
              rank: prog.rank,
              solvedCount: prog.solved_count,
              correctCount: prog.correct_count ?? 0,
              mastery: prog.mastery ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              solvedCaseIds: prog.solved_case_ids ?? [],
              unlockedDossierIds: prog.unlocked_dossier_ids ?? [],
            }
          : progress,
        alreadySubmitted: true,
      };
    }

    // Mark session submitted
    await this.client
      .from('case_sessions')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .eq('user_id', session.userId);

    // Insert result
    await this.client.from('case_results').insert({
      session_id: session.id,
      user_id: session.userId,
      case_id: session.caseId,
      hypothesis_id: submission.hypothesisId,
      supporting_clue_ids: submission.supportingClueIds,
      contradictions: submission.contradictions,
      score: result.score,
      breakdown: result.breakdown,
      xp: result.xp,
      created_at: new Date().toISOString(),
    });

    // Update player_progress
    if (session.userId) {
      await this.client.from('player_progress').upsert({
        user_id: session.userId,
        xp: progress.xp,
        rank: progress.rank,
        solved_count: progress.solvedCount,
        mastery: progress.mastery,
        updated_at: new Date().toISOString(),
      });

      // Archive unlock
      await this.client.from('player_unlocks').upsert({
        user_id: session.userId,
        kind: 'archive',
        ref_id: session.caseId,
        unlocked_at: new Date().toISOString(),
      });
    }

    return {
      result,
      reveal,
      progress,
    };
  }

  async getPlayerProgress(userId: string): Promise<PlayerProgress | null> {
    const { data, error } = await this.client
      .from('player_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      userId: data.user_id,
      xp: data.xp,
      rank: data.rank,
      solvedCount: data.solved_count,
      correctCount: data.correct_count ?? 0,
      mastery: data.mastery,
      solvedCaseIds: data.solved_case_ids ?? [],
      unlockedDossierIds: data.unlocked_dossier_ids ?? [],
    };
  }

  // Daily operations
  async getDailyCase(date: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('daily_cases')
      .select('case_id')
      .eq('date', date)
      .maybeSingle();

    if (error || !data) return null;
    return data.case_id;
  }

  async setDailyCase(date: string, caseId: string): Promise<void> {
    await this.client.from('daily_cases').upsert({ date, case_id: caseId });
  }

  async listDailyCases(limitDays: number): Promise<Array<{ date: string; caseId: string }>> {
    const { data } = await this.client
      .from('daily_cases')
      .select('date, case_id')
      .order('date', { ascending: false })
      .limit(limitDays);

    if (!data) return [];
    return data.map((d) => ({ date: d.date, caseId: d.case_id }));
  }

  // Weekly operations
  async getCurrentWeeklyCase(now: Date): Promise<WeeklyCaseRow | null> {
    const iso = now.toISOString();
    const { data, error } = await this.client
      .from('weekly_cases')
      .select('*')
      .lte('opens_at', iso)
      .gte('closes_at', iso)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      caseId: data.case_id,
      weekNumber: data.week_number,
      year: data.year,
      opensAt: data.opens_at,
      closesAt: data.closes_at,
    };
  }

  async getWeeklyCaseById(weeklyId: string): Promise<WeeklyCaseRow | null> {
    const { data, error } = await this.client
      .from('weekly_cases')
      .select('*')
      .eq('id', weeklyId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      caseId: data.case_id,
      weekNumber: data.week_number,
      year: data.year,
      opensAt: data.opens_at,
      closesAt: data.closes_at,
    };
  }

  async getWeeklyAggregate(weeklyId: string): Promise<WeeklyAggregateResponse | null> {
    const { data } = await this.client
      .from('weekly_attempts')
      .select('*')
      .eq('weekly_id', weeklyId);

    if (!data) return null;
    const hypothesisDistribution: Record<string, number> = {};
    const clueUsage: Record<string, number> = {};
    let totalScore = 0;

    for (const d of data) {
      totalScore += d.score;
      hypothesisDistribution[d.hypothesis_id] = (hypothesisDistribution[d.hypothesis_id] ?? 0) + 1;
      for (const clueId of d.clue_ids || []) {
        clueUsage[clueId] = (clueUsage[clueId] ?? 0) + 1;
      }
    }

    const sorted = [...data].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.submitted_at.localeCompare(b.submitted_at);
    });

    const leaderboard = sorted.map((item, idx) => ({
      userId: item.user_id,
      displayName: item.display_name,
      score: item.score,
      submittedAt: item.submitted_at,
      rank: idx + 1,
    }));

    return {
      weeklyId,
      totalParticipants: data.length,
      hypothesisDistribution,
      clueUsage,
      averageScore: data.length > 0 ? Math.round((totalScore / data.length) * 10) / 10 : 0,
      leaderboard,
    };
  }

  // Challenges operations
  async createChallenge(challenge: ChallengeRow): Promise<ChallengeRow> {
    const { data, error } = await this.client
      .from('challenges')
      .insert({
        id: challenge.id,
        creator_id: challenge.creatorId,
        case_id: challenge.caseId,
        case_version: challenge.caseVersion,
        created_at: challenge.createdAt,
        expires_at: challenge.expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      creatorId: data.creator_id,
      caseId: data.case_id,
      caseVersion: data.case_version,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    };
  }

  async getChallenge(code: string): Promise<ChallengeRow | null> {
    const { data, error } = await this.client
      .from('challenges')
      .select('*')
      .eq('id', code)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      creatorId: data.creator_id,
      caseId: data.case_id,
      caseVersion: data.case_version,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    };
  }

  async recordChallengeAttempt(attempt: ChallengeAttemptRow): Promise<void> {
    await this.client.from('challenge_attempts').insert({
      challenge_id: attempt.challengeId,
      session_id: attempt.sessionId,
      user_id: attempt.userId,
      guest_token: attempt.guestToken,
      hypothesis_id: attempt.hypothesisId,
      supporting_clue_ids: attempt.supportingClueIds,
      score: attempt.score,
      created_at: attempt.createdAt,
    });
  }

  async getChallengeAttempts(code: string): Promise<ChallengeAttemptRow[]> {
    const { data } = await this.client
      .from('challenge_attempts')
      .select('*')
      .eq('challenge_id', code);

    if (!data) return [];
    return data.map((d) => ({
      challengeId: d.challenge_id,
      sessionId: d.session_id,
      userId: d.user_id,
      guestToken: d.guest_token,
      hypothesisId: d.hypothesis_id,
      supportingClueIds: d.supporting_clue_ids,
      score: d.score,
      createdAt: d.created_at,
    }));
  }

  // Account operations
  async migrateLocalProgress(userId: string, solvedCaseIds: string[]): Promise<string[]> {
    const records = solvedCaseIds.map((caseId) => ({
      user_id: userId,
      kind: 'archive',
      ref_id: caseId,
      unlocked_at: new Date().toISOString(),
    }));

    if (records.length > 0) {
      await this.client.from('player_unlocks').upsert(records);
    }
    return solvedCaseIds;
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    // Delete user's sessions, results, progress, unlocks
    await this.client.from('case_sessions').delete().eq('user_id', userId);
    await this.client.from('case_results').delete().eq('user_id', userId);
    await this.client.from('player_progress').delete().eq('user_id', userId);
    await this.client.from('player_unlocks').delete().eq('user_id', userId);
    return true;
  }

  async savePushToken(userId: string, token: string, platform?: string): Promise<void> {
    await this.client.from('push_tokens').upsert({
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    });
  }

  async deletePushToken(userId: string, token?: string): Promise<boolean> {
    let query = this.client.from('push_tokens').delete().eq('user_id', userId);
    if (token) {
      query = query.eq('token', token);
    }
    const { error } = await query;
    return !error;
  }

  // Graph operations
  async getPlayerGraphReveals(userId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const { data: reveals } = await this.client
      .from('player_graph_reveals')
      .select('edge_id')
      .eq('user_id', userId);

    const edgeIds = (reveals || []).map((r) => r.edge_id);
    if (edgeIds.length === 0) {
      return { nodes: [], edges: [] };
    }

    const { data: edges } = await this.client
      .from('conspiracy_edges')
      .select('*')
      .in('id', edgeIds);

    const revealedEdges = (edges || []).map((e) => ({
      id: e.id,
      from: e.from_node,
      to: e.to_node,
      rel: e.rel,
      revealedByCaseId: e.revealed_by_case_id,
    }));

    const revealedNodeIds = new Set<string>();
    for (const e of revealedEdges) {
      revealedNodeIds.add(e.from);
      revealedNodeIds.add(e.to);
    }

    // Discover 1-hop adjacent unrevealed neighbours
    const { data: allEdges } = await this.client
      .from('conspiracy_edges')
      .select('from_node, to_node');

    const adjacentNodeIds = new Set<string>();
    if (allEdges) {
      for (const e of allEdges) {
        if (revealedNodeIds.has(e.from_node) && !revealedNodeIds.has(e.to_node)) {
          adjacentNodeIds.add(e.to_node);
        } else if (revealedNodeIds.has(e.to_node) && !revealedNodeIds.has(e.from_node)) {
          adjacentNodeIds.add(e.from_node);
        }
      }
    }

    // Fetch revealed nodes (name and description included)
    const { data: nodes } = await this.client
      .from('conspiracy_nodes')
      .select('*')
      .in('id', Array.from(revealedNodeIds));

    const revealedNodes: GraphNode[] = (nodes || []).map((n) => ({
      id: n.id,
      kind: n.kind,
      name: n.name,
      description: n.description,
      revealed: true,
    }));

    // Fetch adjacent unrevealed nodes (name: null, description: null)
    let unrevealedNodes: GraphNode[] = [];
    if (adjacentNodeIds.size > 0) {
      const { data: adjData } = await this.client
        .from('conspiracy_nodes')
        .select('id, kind')
        .in('id', Array.from(adjacentNodeIds));

      unrevealedNodes = (adjData || []).map((n) => ({
        id: n.id,
        kind: n.kind,
        name: null,
        description: null,
        revealed: false,
      }));
    }

    return {
      nodes: [...revealedNodes, ...unrevealedNodes],
      edges: revealedEdges,
    };
  }

  async grantGraphReveals(userId: string, caseId: string): Promise<void> {
    const { data: edges } = await this.client
      .from('conspiracy_edges')
      .select('id')
      .eq('revealed_by_case_id', caseId);

    if (edges && edges.length > 0) {
      const records = edges.map((e) => ({
        user_id: userId,
        edge_id: e.id,
        revealed_at: new Date().toISOString(),
      }));
      await this.client.from('player_graph_reveals').upsert(records);
    }
  }

  // Moderation & Case Reports
  async reportCase(params: {
    caseId: string;
    userId: string;
    reason: 'broken_logic' | 'unfair' | 'typo' | 'offensive' | 'other';
    note?: string;
  }): Promise<{ reportId: string; autoFlagged: boolean }> {
    const { data: inserted, error } = await this.client
      .from('case_reports')
      .insert({
        case_id: params.caseId,
        user_id: params.userId,
        reason: params.reason,
        note: params.note || null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to insert report: ${error?.message || 'unknown error'}`);
    }

    const reportId = inserted.id;

    // Auto-flagging check: >= 5 distinct reporting users within 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
    const { data: recentReports } = await this.client
      .from('case_reports')
      .select('user_id')
      .eq('case_id', params.caseId)
      .gte('created_at', sevenDaysAgo);

    const distinctUsers = new Set((recentReports || []).map((r) => r.user_id));
    let autoFlagged = false;

    if (distinctUsers.size >= 5) {
      await this.client
        .from('cases')
        .update({ status: 'under_review' })
        .eq('id', params.caseId);
      autoFlagged = true;
    }

    return { reportId, autoFlagged };
  }

  async listFlaggedCases(): Promise<FlaggedCaseSummary[]> {
    const { data: cases } = await this.client
      .from('cases')
      .select('id, title, status')
      .eq('status', 'under_review');

    if (!cases || cases.length === 0) return [];

    const summaries: FlaggedCaseSummary[] = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

    for (const c of cases) {
      const { data: reports } = await this.client
        .from('case_reports')
        .select('*')
        .eq('case_id', c.id);

      const recent = (reports || []).filter((r) => r.created_at >= sevenDaysAgo);
      const distinctUsers = new Set(recent.map((r) => r.user_id));
      const reasons: Record<string, number> = {};
      let latest = '';

      for (const r of reports || []) {
        reasons[r.reason] = (reasons[r.reason] || 0) + 1;
        if (!latest || r.created_at > latest) {
          latest = r.created_at;
        }
      }

      summaries.push({
        caseId: c.id,
        title: c.title,
        status: c.status,
        recentReportCount: recent.length,
        distinctReportingUsers: distinctUsers.size,
        reasons,
        latestReportAt: latest,
      });
    }

    return summaries;
  }

  async getUserReportCountInWindow(userId: string, windowSeconds: number): Promise<number> {
    const threshold = new Date(Date.now() - windowSeconds * 1000).toISOString();
    const { count } = await this.client
      .from('case_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', threshold);

    return count || 0;
  }
}
