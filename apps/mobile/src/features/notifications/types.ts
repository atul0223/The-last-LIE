export interface NotificationSettings {
  enabled: boolean;
  dailyReminderTime: {
    hour: number;
    minute: number;
  };
  hasPromptedForPush: boolean;
  expoPushToken?: string;
  lastRegisteredAt?: string;
}

export interface NotificationTemplate {
  title: string;
  body: string;
}

/**
 * Standard bureau notification templates.
 * INVARIANT: These templates must NEVER leak clue text, culprit names,
 * puzzle solutions, or case spoilers.
 */
export const DAILY_DISPATCH_TEMPLATES: NotificationTemplate[] = [
  {
    title: 'New Case Dispatch Available',
    body: 'A new confidential investigation has arrived at the Archive Division. Can you uncover the truth?',
  },
  {
    title: 'Daily Mystery Awaiting Deduction',
    body: 'Today’s bureau case is ready for inspection. Log in to keep your detective streak active.',
  },
  {
    title: 'Vesper City Bureau Reminder',
    body: 'An encrypted case file is ready on your desk. Examine the evidence before the trace expires.',
  },
  {
    title: 'Weekly Community Duel Active',
    body: 'The citywide community case window is open. Submit your deduction before the leaderboard locks.',
  },
];
