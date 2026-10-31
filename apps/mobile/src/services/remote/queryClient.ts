import { QueryClient } from '@tanstack/react-query';
import { RemoteServiceError } from './errors';
import { GameServiceError } from '../local/errors';

export function createRemoteQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: (failureCount, error) => {
          // Never retry on 4xx client errors or domain validation errors
          if (error instanceof RemoteServiceError && error.isClientError) {
            return false;
          }
          if (error instanceof GameServiceError && error.code !== 'UNKNOWN_ERROR') {
            return false;
          }
          // Retry network or 5xx server errors up to 3 times
          return failureCount < 3;
        },
      },
      mutations: {
        retry: (failureCount, error) => {
          // Mutations are not auto-retried on client errors
          if (error instanceof RemoteServiceError && error.isClientError) {
            return false;
          }
          return false;
        },
      },
    },
  });
}
