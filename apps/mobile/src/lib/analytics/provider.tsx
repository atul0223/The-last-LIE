import React, { useEffect } from 'react';
import { initAnalytics, track } from './client';

export interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps): React.JSX.Element {
  useEffect(() => {
    initAnalytics();
    try {
      track({ name: 'app_open' });
    } catch {
      // Non-fatal
    }
  }, []);

  return <>{children}</>;
}
