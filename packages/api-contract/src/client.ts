import type {
  CreateSessionRequest,
  CreateSessionResponse,
  SaveBoardRequest,
  SaveBoardResponse,
  SubmitSessionRequest,
  SubmitSessionResponse,
  UnlockClueRequest,
  UnlockClueResponse,
} from './sessions.js';
import type { DailyCaseResponse } from './daily.js';
import type { WeeklyAggregateResponse, WeeklyCaseResponse } from './weekly.js';
import type {
  ChallengeCompareResponse,
  CreateChallengeRequest,
  CreateChallengeResponse,
  CreateGuestTokenRequest,
  CreateGuestTokenResponse,
  GetChallengeResponse,
} from './challenges.js';
import type {
  DeleteAccountResponse,
  MigrateLocalRequest,
  MigrateLocalResponse,
} from './account.js';
import type { GraphResponse } from './graph.js';
import type {
  RegisterPushTokenRequest,
  RegisterPushTokenResponse,
} from './push.js';

export interface ApiClient {
  // Sessions & gameplay
  createSession(req?: CreateSessionRequest): Promise<CreateSessionResponse>;
  unlockClue(sessionId: string, req: UnlockClueRequest): Promise<UnlockClueResponse>;
  saveBoard(sessionId: string, req: SaveBoardRequest): Promise<SaveBoardResponse>;
  submitSession(sessionId: string, req: SubmitSessionRequest): Promise<SubmitSessionResponse>;

  // Daily & Weekly
  getDaily(): Promise<DailyCaseResponse>;
  getWeekly(): Promise<WeeklyCaseResponse>;
  getWeeklyAggregate(weeklyId: string): Promise<WeeklyAggregateResponse>;

  // Challenges
  createChallenge(req: CreateChallengeRequest): Promise<CreateChallengeResponse>;
  getChallenge(code: string): Promise<GetChallengeResponse>;
  createGuestToken(code: string, req?: CreateGuestTokenRequest): Promise<CreateGuestTokenResponse>;
  getChallengeCompare(code: string): Promise<ChallengeCompareResponse>;

  // Account
  migrateLocal(req: MigrateLocalRequest): Promise<MigrateLocalResponse>;
  deleteAccount(): Promise<DeleteAccountResponse>;

  // Graph
  getGraph(): Promise<GraphResponse>;

  // Push notifications
  registerPushToken(req: RegisterPushTokenRequest): Promise<RegisterPushTokenResponse>;
}
