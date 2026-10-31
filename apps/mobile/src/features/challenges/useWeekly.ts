import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ApiClient,
  WeeklyAggregateResponse,
  WeeklyCaseResponse,
} from '@lastlie/api-contract';
import { getGameService } from '../../services';
import { RemoteGameService } from '../../services/remote';

export interface UseWeeklyReturn {
  weeklyCase: WeeklyCaseResponse | null;
  aggregate: WeeklyAggregateResponse | null;
  isOpen: boolean;
  timeRemainingText: string;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startWeeklyCase: () => Promise<string | null>;
}

export function formatTimeRemaining(closesAtIso: string, nowMs = Date.now()): string {
  const diff = new Date(closesAtIso).getTime() - nowMs;
  if (diff <= 0) {
    return 'WINDOW CLOSED';
  }

  const days = Math.floor(diff / (24 * 3600 * 1000));
  const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
  const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));

  if (days > 0) {
    return `${days}D ${hours}H REMAINING`;
  }
  if (hours > 0) {
    return `${hours}H ${minutes}M REMAINING`;
  }
  return `${minutes}M REMAINING`;
}

export function useWeekly(apiClientOverride?: ApiClient): UseWeeklyReturn {
  const [weeklyCase, setWeeklyCase] = useState<WeeklyCaseResponse | null>(null);
  const [aggregate, setAggregate] = useState<WeeklyAggregateResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getClient = useCallback((): ApiClient | null => {
    if (apiClientOverride) return apiClientOverride;
    const service = getGameService() as RemoteGameService;
    if (typeof service.getApiClient === 'function') {
      return service.getApiClient();
    }
    return null;
  }, [apiClientOverride]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getClient();
      if (client) {
        const week = await client.getWeekly();
        setWeeklyCase(week);

        // If closed, fetch aggregate
        if (!week.isOpen) {
          try {
            const agg = await client.getWeeklyAggregate(week.id);
            setAggregate(agg);
          } catch {
            // Handled gracefully
          }
        } else {
          setAggregate(null);
        }
      } else {
        // Fallback for offline / local mode
        const now = new Date();
        const opensAt = new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString();
        const closesAt = new Date(now.getTime() + 5 * 24 * 3600 * 1000).toISOString();
        setWeeklyCase({
          id: 'weekly_local_current',
          caseId: 'case_0001',
          weekNumber: 44,
          year: 2026,
          opensAt,
          closesAt,
          isOpen: true,
        });
        setAggregate(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load weekly case';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [getClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isOpen = weeklyCase?.isOpen ?? false;

  const timeRemainingText = useMemo(() => {
    if (!weeklyCase?.closesAt) return '';
    return formatTimeRemaining(weeklyCase.closesAt);
  }, [weeklyCase?.closesAt]);

  const startWeeklyCase = useCallback(async (): Promise<string | null> => {
    if (!weeklyCase) return null;
    try {
      const service = getGameService();
      const res = await service.startSession({
        caseId: weeklyCase.caseId,
        mode: 'challenge',
      });
      return res.session.id;
    } catch {
      return null;
    }
  }, [weeklyCase]);

  return {
    weeklyCase,
    aggregate,
    isOpen,
    timeRemainingText,
    isLoading,
    error,
    refresh,
    startWeeklyCase,
  };
}
