/**
 * Progress feature navigation abstraction.
 * Allows pure headless testing without relying on unmocked expo-router internals.
 */

type NavigatorFn = (path: string) => void;

let customNavigator: NavigatorFn | null = null;

export function setAppNavigator(navigator: NavigatorFn | null): void {
  customNavigator = navigator;
}

export function navigateToCase(sessionId: string): void {
  const targetPath = `/case/${sessionId}`;
  if (customNavigator) {
    customNavigator(targetPath);
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const router = require('expo-router').router;
    if (router && typeof router.push === 'function') {
      router.push(targetPath);
    }
  } catch {
    // Graceful fallback for non-browser/non-react-native test environments
  }
}
