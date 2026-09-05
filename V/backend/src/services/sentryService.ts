import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN || '';
let sentryEnabled = false;

export async function initializeSentry(app: any): Promise<void> {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured. Skipping.');
    return;
  }
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      attachStacktrace: true,
      maxBreadcrumbs: 50,
      integrations: [
        new (Sentry.Integrations as any).Http({ tracing: true }),
        new (Sentry.Integrations as any).Express({ app }),
      ],
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
    sentryEnabled = true;
    console.log('[Sentry] Initialized');
  } catch {
    console.warn('[Sentry] Failed to initialize.');
  }
}

export async function sentryErrorHandler(): Promise<(err: any, req: any, res: any, next: any) => void> {
  if (!sentryEnabled) return (err: any, req: any, res: any, next: any) => next(err);
  return Sentry.Handlers.errorHandler();
}

export async function captureException(error: Error, context?: Record<string, any>): Promise<void> {
  if (!sentryEnabled) return;
  Sentry.withScope((scope: any) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export async function captureMessage(message: string, level: string = 'info'): Promise<void> {
  if (!sentryEnabled) return;
  Sentry.captureMessage(message, level);
}

export async function setUserContext(userId: string, email?: string): Promise<void> {
  if (!sentryEnabled) return;
  Sentry.setUser({ id: userId, email });
}

export function clearUserContext(): void {
  if (sentryEnabled) Sentry.setUser(null);
}

export async function addBreadcrumb(message: string, category?: string, data?: Record<string, any>): Promise<void> {
  if (!sentryEnabled) return;
  Sentry.addBreadcrumb({ message, category, data, timestamp: Date.now() / 1000 });
}
