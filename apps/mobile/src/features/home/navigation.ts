export type NavigateHandler = (path: string) => void;

let activeNavigator: NavigateHandler | null = null;

export function setAppNavigator(navigator: NavigateHandler | null): void {
  activeNavigator = navigator;
}

export function navigateTo(path: string): void {
  if (activeNavigator) {
    activeNavigator(path);
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoRouter = require('expo-router');
    const r =
      expoRouter?.router ??
      (typeof expoRouter?.useRouter === 'function' ? expoRouter.useRouter() : null);
    if (r && typeof r.push === 'function') {
      r.push(path);
    }
  } catch {
    // Safe fallback in test or headless environments
  }
}
