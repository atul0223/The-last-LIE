import type { z } from 'zod';
import type {
  ApiClient,
  CreateSessionRequest,
  CreateSessionResponse,
  UnlockClueRequest,
  UnlockClueResponse,
  SaveBoardRequest,
  SaveBoardResponse,
  SubmitSessionRequest,
  SubmitSessionResponse,
  DailyCaseResponse,
  WeeklyCaseResponse,
  WeeklyAggregateResponse,
  CreateChallengeRequest,
  CreateChallengeResponse,
  GetChallengeResponse,
  CreateGuestTokenRequest,
  CreateGuestTokenResponse,
  ChallengeCompareResponse,
  MigrateLocalRequest,
  MigrateLocalResponse,
  DeleteAccountResponse,
  GraphResponse,
  RegisterPushTokenRequest,
  RegisterPushTokenResponse,
} from '@lastlie/api-contract';
import {
  CreateSessionResponseSchema,
  UnlockClueResponseSchema,
  SaveBoardResponseSchema,
  SubmitSessionResponseSchema,
  DailyCaseResponseSchema,
  WeeklyCaseResponseSchema,
  WeeklyAggregateResponseSchema,
  CreateChallengeResponseSchema,
  GetChallengeResponseSchema,
  CreateGuestTokenResponseSchema,
  ChallengeCompareResponseSchema,
  MigrateLocalResponseSchema,
  DeleteAccountResponseSchema,
  GraphResponseSchema,
  RegisterPushTokenResponseSchema,
  ApiErrorEnvelopeSchema,
} from '@lastlie/api-contract';
import { RemoteServiceError } from './errors';

export interface FetchApiClientOptions {
  baseUrl?: string;
  getAuthToken?: () => Promise<string | null> | string | null;
  fetchFn?: typeof fetch;
}

export class FetchApiClient implements ApiClient {
  private readonly baseUrl: string;
  private readonly getAuthToken?: () => Promise<string | null> | string | null;
  private readonly fetchFn: typeof fetch;

  constructor(options?: FetchApiClientOptions) {
    const defaultUrl =
      process.env.EXPO_PUBLIC_API_URL ||
      (process.env.EXPO_PUBLIC_SUPABASE_URL
        ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/api`
        : 'http://localhost:54321/functions/v1/api');

    this.baseUrl = (options?.baseUrl ?? defaultUrl).replace(/\/+$/, '');
    this.getAuthToken = options?.getAuthToken;
    this.fetchFn = options?.fetchFn ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (undefined as unknown as typeof fetch));
  }

  private async request<TRes>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: z.ZodType<any, any, any>,
    body?: unknown,
  ): Promise<TRes> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.getAuthToken) {
      try {
        const token = await this.getAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch {
        // Token retrieval failure continues unauthenticated
      }
    }

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : 'Network request failed';
      throw new RemoteServiceError('NETWORK_ERROR', msg, undefined, undefined, networkErr);
    }

    let json: unknown;
    const text = await response.text();
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!response.ok) {
      const envelopeParsed = ApiErrorEnvelopeSchema.safeParse(json);
      if (envelopeParsed.success) {
        throw RemoteServiceError.fromEnvelope(envelopeParsed.data, response.status);
      }
      throw new RemoteServiceError(
        response.status === 404
          ? 'NOT_FOUND'
          : response.status === 401
            ? 'UNAUTHORIZED'
            : response.status === 403
              ? 'FORBIDDEN'
              : response.status === 409
                ? 'CONFLICT'
                : 'INTERNAL_SERVER_ERROR',
        `HTTP ${response.status}: ${response.statusText || 'Request failed'}`,
        response.status,
        undefined,
        json,
      );
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new RemoteServiceError(
        'SCHEMA_MISMATCH',
        `Schema mismatch for ${method} ${path}: ${parsed.error.message}`,
        response.status,
        undefined,
        parsed.error.format(),
      );
    }

    return parsed.data as TRes;
  }

  async createSession(req?: CreateSessionRequest): Promise<CreateSessionResponse> {
    return this.request<CreateSessionResponse>('POST', '/sessions', CreateSessionResponseSchema, req ?? {});
  }

  async unlockClue(sessionId: string, req: UnlockClueRequest): Promise<UnlockClueResponse> {
    return this.request<UnlockClueResponse>('POST', `/sessions/${sessionId}/unlock`, UnlockClueResponseSchema, req);
  }

  async saveBoard(sessionId: string, req: SaveBoardRequest): Promise<SaveBoardResponse> {
    return this.request<SaveBoardResponse>('PUT', `/sessions/${sessionId}/board`, SaveBoardResponseSchema, req);
  }

  async submitSession(sessionId: string, req: SubmitSessionRequest): Promise<SubmitSessionResponse> {
    return this.request<SubmitSessionResponse>('POST', `/sessions/${sessionId}/submit`, SubmitSessionResponseSchema, req);
  }

  async getDaily(): Promise<DailyCaseResponse> {
    return this.request<DailyCaseResponse>('GET', '/daily', DailyCaseResponseSchema);
  }

  async getWeekly(): Promise<WeeklyCaseResponse> {
    return this.request<WeeklyCaseResponse>('GET', '/weekly', WeeklyCaseResponseSchema);
  }

  async getWeeklyAggregate(weeklyId: string): Promise<WeeklyAggregateResponse> {
    return this.request<WeeklyAggregateResponse>('GET', `/weekly/${weeklyId}/aggregate`, WeeklyAggregateResponseSchema);
  }

  async createChallenge(req: CreateChallengeRequest): Promise<CreateChallengeResponse> {
    return this.request<CreateChallengeResponse>('POST', '/challenges', CreateChallengeResponseSchema, req);
  }

  async getChallenge(code: string): Promise<GetChallengeResponse> {
    return this.request<GetChallengeResponse>('GET', `/challenges/${code}`, GetChallengeResponseSchema);
  }

  async createGuestToken(
    code: string,
    req?: CreateGuestTokenRequest,
  ): Promise<CreateGuestTokenResponse> {
    return this.request<CreateGuestTokenResponse>('POST', `/challenges/${code}/guest`, CreateGuestTokenResponseSchema, req ?? {});
  }

  async getChallengeCompare(code: string): Promise<ChallengeCompareResponse> {
    return this.request<ChallengeCompareResponse>('GET', `/challenges/${code}/compare`, ChallengeCompareResponseSchema);
  }

  async migrateLocal(req: MigrateLocalRequest): Promise<MigrateLocalResponse> {
    return this.request<MigrateLocalResponse>('POST', '/account/migrate-local', MigrateLocalResponseSchema, req);
  }

  async deleteAccount(): Promise<DeleteAccountResponse> {
    return this.request<DeleteAccountResponse>('DELETE', '/account', DeleteAccountResponseSchema);
  }

  async getGraph(): Promise<GraphResponse> {
    return this.request<GraphResponse>('GET', '/graph', GraphResponseSchema);
  }

  async registerPushToken(req: RegisterPushTokenRequest): Promise<RegisterPushTokenResponse> {
    return this.request<RegisterPushTokenResponse>('POST', '/push/register', RegisterPushTokenResponseSchema, req);
  }
}
