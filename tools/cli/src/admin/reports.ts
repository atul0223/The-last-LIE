export interface FlaggedCaseSummary {
  caseId: string;
  title: string;
  status: string;
  recentReportCount: number;
  distinctReportingUsers: number;
  reasons: Record<string, number>;
  latestReportAt: string;
}

export interface AdminReportsOptions {
  env?: 'local' | 'staging' | 'prod';
  client?: AdminReportsClient;
}

export interface AdminReportsClient {
  listFlaggedCases(): Promise<FlaggedCaseSummary[]>;
}

export async function handleAdminReports(options: AdminReportsOptions): Promise<{
  success: boolean;
  cases: FlaggedCaseSummary[];
  message?: string;
}> {
  const env = options.env || 'local';

  // Security guardrail: inspection of moderation reports is local and staging only
  if (env === 'prod') {
    return {
      success: false,
      cases: [],
      message: 'Admin reports inspection is restricted to local and staging environments only.',
    };
  }

  if (!options.client) {
    // If no client injected, return empty list with warning if offline
    return {
      success: true,
      cases: [],
      message: 'No live database client configured; specify an admin client or run locally with Docker.',
    };
  }

  const cases = await options.client.listFlaggedCases();
  return {
    success: true,
    cases,
  };
}
