import type { BoardState } from '@lastlie/case-engine';
import type { ApiClient } from '@lastlie/api-contract';
import type { KeyValueStore } from '../local/storage/types';
import { getStorage } from '../local/storage/factory';
import { RemoteServiceError } from './errors';

export const OFFLINE_BOARD_QUEUE_KEY = '@lastlie/offline_save_board_queue';

export interface QueuedBoardSave {
  sessionId: string;
  board: BoardState;
  updatedAt: string;
  attempts: number;
}

export type OfflineBoardQueueData = Record<string, QueuedBoardSave>;

export class SaveBoardOfflineQueue {
  private readonly storage: KeyValueStore;
  private queue: OfflineBoardQueueData = {};

  constructor(storage?: KeyValueStore) {
    this.storage = storage ?? getStorage();
    this.load();
  }

  private load(): void {
    try {
      const raw = this.storage.getString(OFFLINE_BOARD_QUEUE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      } else {
        this.queue = {};
      }
    } catch {
      this.queue = {};
    }
  }

  private persist(): void {
    try {
      this.storage.set(OFFLINE_BOARD_QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // Storage error is non-fatal
    }
  }

  /**
   * Enqueue a board state for a session.
   * Last write wins: Overwrites any previous pending board for this session ID.
   */
  enqueue(sessionId: string, board: BoardState): void {
    this.queue[sessionId] = {
      sessionId,
      board,
      updatedAt: new Date().toISOString(),
      attempts: (this.queue[sessionId]?.attempts ?? 0) + 1,
    };
    this.persist();
  }

  dequeue(sessionId: string): void {
    if (this.queue[sessionId]) {
      delete this.queue[sessionId];
      this.persist();
    }
  }

  getPending(sessionId: string): QueuedBoardSave | undefined {
    return this.queue[sessionId];
  }

  getAllPending(): QueuedBoardSave[] {
    return Object.values(this.queue);
  }

  hasPending(sessionId: string): boolean {
    return Boolean(this.queue[sessionId]);
  }

  getPendingCount(): number {
    return Object.keys(this.queue).length;
  }

  clear(): void {
    this.queue = {};
    try {
      this.storage.delete(OFFLINE_BOARD_QUEUE_KEY);
    } catch {
      // Ignore deletion failure
    }
  }

  /**
   * Flush pending queued saves to the server via the ApiClient.
   * On success, each entry is removed.
   * On 4xx errors (e.g. session closed or not found), the entry is removed.
   * On network errors, the queue is preserved for the next flush attempt.
   */
  async flush(apiClient: ApiClient): Promise<{ flushed: number; failed: number }> {
    const sessionIds = Object.keys(this.queue);
    let flushed = 0;
    let failed = 0;

    for (const sessionId of sessionIds) {
      const entry = this.queue[sessionId];
      if (!entry) continue;

      try {
        await apiClient.saveBoard(sessionId, { board: entry.board });
        this.dequeue(sessionId);
        flushed++;
      } catch (err: unknown) {
        failed++;
        if (err instanceof RemoteServiceError && err.isClientError) {
          // If the server rejected the session (4xx, e.g. already submitted), purge it
          this.dequeue(sessionId);
        } else {
          // Network or server error: preserve remaining entries and halt this flush cycle
          break;
        }
      }
    }

    return { flushed, failed };
  }
}
