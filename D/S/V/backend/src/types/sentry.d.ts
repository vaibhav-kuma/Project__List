declare module '@sentry/node' {
  export function init(options: any): void;
  export function captureException(error: any, context?: any): void;
  export function captureMessage(message: string, level?: any): void;
  export function setUser(user: any): void;
  export function addBreadcrumb(breadcrumb: any): void;
  export function withScope(cb: (scope: any) => void): void;
  export function startTransaction(opts: any): any;
  export const Handlers: {
    requestHandler(): any;
    tracingHandler(): any;
    errorHandler(): any;
  };
  export const Integrations: {
    Http(opts?: any): any;
    Express(opts?: any): any;
  };
}
